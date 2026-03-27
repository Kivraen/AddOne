#include "ota_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <esp_err.h>
#include <esp_ota_ops.h>
#include <mbedtls/sha256.h>

#include "cloud_config.h"
#include "config.h"
#include "firmware_app.h"

namespace {
constexpr const char* kOtaPrefsNamespace = "ao_ota";
constexpr const char* kConfirmedReleaseIdKey = "confirmed";
constexpr const char* kSessionPhaseKey = "phase";
constexpr const char* kSessionTargetReleaseIdKey = "target";

constexpr const char* kPhaseDownloading = "downloading";
constexpr const char* kPhasePendingConfirm = "pending_confirm";
constexpr const char* kPhaseRebooting = "rebooting";
constexpr const char* kPhaseRequested = "requested";
constexpr const char* kPhaseSucceeded = "succeeded";

constexpr unsigned long kReleaseCheckIntervalMs = 3600000UL;
constexpr unsigned long kDownloadIdleTimeoutMs = 15000UL;
constexpr size_t kDownloadBufferSize = 2048U;

bool equalsIgnoreCase(const String& left, const String& right) {
  if (left.length() != right.length()) {
    return false;
  }

  for (size_t index = 0; index < left.length(); ++index) {
    const char a = left[index];
    const char b = right[index];
    const char normalizedA = (a >= 'A' && a <= 'Z') ? static_cast<char>(a + 32) : a;
    const char normalizedB = (b >= 'A' && b <= 'Z') ? static_cast<char>(b + 32) : b;
    if (normalizedA != normalizedB) {
      return false;
    }
  }

  return true;
}

String formatEspError(esp_err_t error) {
  const char* name = esp_err_to_name(error);
  if (name) {
    return String(name);
  }

  char buffer[16];
  snprintf(buffer, sizeof(buffer), "0x%04x", static_cast<unsigned int>(error));
  return String(buffer);
}

const char* failureStateForCode(const String& failureCode) {
  if (failureCode == "artifact_too_large" || failureCode == "download_failed" || failureCode == "download_incomplete") {
    return "failed_download";
  }

  if (failureCode == "sha256_mismatch" ||
      failureCode == "image_invalid" ||
      failureCode == "hardware_profile_mismatch" ||
      failureCode == "partition_layout_mismatch" ||
      failureCode == "version_not_allowed") {
    return "failed_verify";
  }

  return "failed_stage";
}

bool isRollbackRecoveryPhase(const String& phase) {
  return phase == kPhaseRebooting || phase == kPhasePendingConfirm;
}

String sha256ToHex(const unsigned char digest[32]) {
  static constexpr char kHex[] = "0123456789abcdef";
  char buffer[65];
  for (size_t index = 0; index < 32; ++index) {
    buffer[index * 2] = kHex[(digest[index] >> 4) & 0x0F];
    buffer[index * 2 + 1] = kHex[digest[index] & 0x0F];
  }
  buffer[64] = '\0';
  return String(buffer);
}
} // namespace

#ifdef CONFIG_APP_ROLLBACK_ENABLE
extern "C" bool verifyRollbackLater() {
  return true;
}
#endif

void OtaClient::begin(const DeviceIdentity& identity, CloudClient& cloudClient) {
  identity_ = &identity;
  cloudClient_ = &cloudClient;
  loadPersistedState_();
  if (!isRunningPendingVerify_() &&
      !sessionPhase_.isEmpty() &&
      sessionPhase_ != kPhaseSucceeded &&
      !isRollbackRecoveryPhase(sessionPhase_)) {
    clearSession_();
  }
}

const String& OtaClient::confirmedReleaseId() const {
  return confirmedReleaseId_;
}

bool OtaClient::handleBeginUpdateCommand(const CloudClient::DeviceCommand& command, String& failureReason) {
  if (command.kind != "begin_firmware_update") {
    failureReason = "Unexpected OTA command kind.";
    return false;
  }

  if (command.payloadJson.isEmpty()) {
    failureReason = "Firmware update command payload is empty.";
    return false;
  }

  DynamicJsonDocument doc(512);
  const DeserializationError error = deserializeJson(doc, command.payloadJson);
  if (error) {
    failureReason = "Firmware update command payload could not be parsed.";
    return false;
  }

  const String releaseId = doc["release_id"] | "";
  if (releaseId.isEmpty()) {
    failureReason = "Firmware update command payload is missing release_id.";
    return false;
  }

  releaseCheckRequested_ = true;
  Serial.printf("Queued OTA eligibility re-check for %s\n", releaseId.c_str());
  return true;
}

void OtaClient::service(FirmwareState state,
                        bool bootReadyForTracking,
                        bool recoveryRequested,
                        bool pendingFactoryReset,
                        bool wifiConnected) {
  if (!identity_ || !cloudClient_) {
    return;
  }

  if (handlePendingConfirmation_(state, bootReadyForTracking, recoveryRequested, pendingFactoryReset, wifiConnected)) {
    return;
  }

  if (handleRollbackRecovery_(wifiConnected)) {
    return;
  }

  if (sessionPhase_ == kPhaseSucceeded && !sessionTargetReleaseId_.isEmpty()) {
    if (wifiConnected && reportProgressBestEffort_(sessionTargetReleaseId_, "succeeded")) {
      clearSession_();
    }
    return;
  }

  maybeCheckForRelease_(state, bootReadyForTracking, recoveryRequested, pendingFactoryReset, wifiConnected);
}

bool OtaClient::configureArtifactClient_(WiFiClientSecure& client) const {
  if (strlen(CloudConfig::kSupabaseRootCaPem) == 0) {
    Serial.println("OTA artifact TLS trust missing: set CloudConfig::kSupabaseRootCaPem before field OTA.");
    return false;
  }

  client.setCACert(CloudConfig::kSupabaseRootCaPem);
  return true;
}

void OtaClient::clearAnnouncedDecision_() {
  lastAnnouncedDecision_ = "";
  lastAnnouncedReason_ = "";
  lastAnnouncedReleaseId_ = "";
}

void OtaClient::clearSession_() {
  Preferences prefs;
  prefs.begin(kOtaPrefsNamespace, false);
  prefs.remove(kSessionPhaseKey);
  prefs.remove(kSessionTargetReleaseIdKey);
  prefs.end();

  sessionPhase_ = "";
  sessionTargetReleaseId_ = "";
  pendingConfirmStartedAtMs_ = 0;
  pendingConfirmReported_ = false;
}

bool OtaClient::downloadAndStageRelease_(const CloudClient::OtaReleaseEnvelope& release,
                                         String& failureCode,
                                         String& failureDetail) {
  failureCode = "";
  failureDetail = "";

  const esp_partition_t* updatePartition = esp_ota_get_next_update_partition(nullptr);
  if (!updatePartition) {
    failureCode = "slot_write_failed";
    failureDetail = "No inactive OTA partition is available.";
    return false;
  }

  if (release.artifact.sizeBytes == 0 || release.artifact.sizeBytes > updatePartition->size ||
      release.artifact.sizeBytes > Config::kOtaSlotSizeBytes) {
    failureCode = "artifact_too_large";
    failureDetail = "Release artifact does not fit in the inactive OTA slot.";
    return false;
  }

  persistSession_(kPhaseDownloading, release.releaseId);
  reportProgressBestEffort_(release.releaseId, "downloading");

  WiFiClientSecure client;
  if (!configureArtifactClient_(client)) {
    failureCode = "download_failed";
    failureDetail = "OTA artifact TLS trust is not configured.";
    return false;
  }

  HTTPClient http;
  if (!http.begin(client, release.artifact.url)) {
    failureCode = "download_failed";
    failureDetail = "HTTP client could not begin the OTA artifact request.";
    return false;
  }

  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(15000);

  const int responseCode = http.GET();
  if (responseCode != HTTP_CODE_OK) {
    failureCode = "download_failed";
    failureDetail = String("OTA artifact download returned HTTP ") + String(responseCode);
    http.end();
    return false;
  }

  const int contentLength = http.getSize();
  if (contentLength > 0 && static_cast<uint32_t>(contentLength) != release.artifact.sizeBytes) {
    failureCode = "download_incomplete";
    failureDetail = "OTA artifact content length does not match the release envelope.";
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  if (!stream) {
    failureCode = "download_failed";
    failureDetail = "OTA artifact response body stream is unavailable.";
    http.end();
    return false;
  }

  esp_ota_handle_t otaHandle = 0;
  const esp_err_t beginError = esp_ota_begin(updatePartition, release.artifact.sizeBytes, &otaHandle);
  if (beginError != ESP_OK) {
    failureCode = "slot_write_failed";
    failureDetail = String("esp_ota_begin failed: ") + formatEspError(beginError);
    http.end();
    return false;
  }

  mbedtls_sha256_context shaContext;
  mbedtls_sha256_init(&shaContext);
  mbedtls_sha256_starts_ret(&shaContext, 0);

  uint8_t buffer[kDownloadBufferSize];
  size_t totalRead = 0;
  unsigned long lastReadAtMs = millis();
  bool success = true;

  while (totalRead < release.artifact.sizeBytes) {
    const size_t available = stream->available();
    if (available == 0) {
      if (!http.connected()) {
        success = false;
        failureCode = "download_incomplete";
        failureDetail = "OTA artifact stream closed before the expected byte count arrived.";
        break;
      }

      if (millis() - lastReadAtMs > kDownloadIdleTimeoutMs) {
        success = false;
        failureCode = "download_failed";
        failureDetail = "OTA artifact download stalled before completion.";
        break;
      }

      delay(1);
      continue;
    }

    const size_t remaining = release.artifact.sizeBytes - totalRead;
    const size_t toRead = available < kDownloadBufferSize ? available : kDownloadBufferSize;
    const size_t cappedRead = toRead < remaining ? toRead : remaining;
    const size_t bytesRead = stream->readBytes(buffer, cappedRead);
    if (bytesRead == 0) {
      if (millis() - lastReadAtMs > kDownloadIdleTimeoutMs) {
        success = false;
        failureCode = "download_failed";
        failureDetail = "OTA artifact download stopped returning bytes.";
        break;
      }
      continue;
    }

    lastReadAtMs = millis();
    totalRead += bytesRead;
    mbedtls_sha256_update_ret(&shaContext, buffer, bytesRead);

    const esp_err_t writeError = esp_ota_write(otaHandle, buffer, bytesRead);
    if (writeError != ESP_OK) {
      success = false;
      failureCode = "slot_write_failed";
      failureDetail = String("esp_ota_write failed: ") + formatEspError(writeError);
      break;
    }

    yield();
  }

  unsigned char digest[32];
  mbedtls_sha256_finish_ret(&shaContext, digest);
  mbedtls_sha256_free(&shaContext);
  http.end();

  if (!success) {
    esp_ota_abort(otaHandle);
    return false;
  }

  if (totalRead != release.artifact.sizeBytes) {
    esp_ota_abort(otaHandle);
    failureCode = "download_incomplete";
    failureDetail = "OTA artifact byte count did not match the release envelope.";
    return false;
  }

  persistSession_("downloaded", release.releaseId);
  reportProgressBestEffort_(release.releaseId, "downloaded");

  persistSession_("verifying", release.releaseId);
  reportProgressBestEffort_(release.releaseId, "verifying");

  const String digestHex = sha256ToHex(digest);
  if (!equalsIgnoreCase(digestHex, release.artifact.sha256)) {
    esp_ota_abort(otaHandle);
    failureCode = "sha256_mismatch";
    failureDetail = "OTA artifact SHA256 does not match the release envelope.";
    return false;
  }

  const esp_err_t endError = esp_ota_end(otaHandle);
  if (endError != ESP_OK) {
    failureCode = "image_invalid";
    failureDetail = String("esp_ota_end rejected the staged image: ") + formatEspError(endError);
    return false;
  }

  persistSession_("staged", release.releaseId);
  reportProgressBestEffort_(release.releaseId, "staged");

  const esp_err_t bootPartitionError = esp_ota_set_boot_partition(updatePartition);
  if (bootPartitionError != ESP_OK) {
    failureCode = "slot_write_failed";
    failureDetail = String("esp_ota_set_boot_partition failed: ") + formatEspError(bootPartitionError);
    return false;
  }

  return true;
}

void OtaClient::failPendingBoot_(const String& failureCode, const String& failureDetail, bool wifiConnected) {
  if (!sessionTargetReleaseId_.isEmpty() && wifiConnected) {
    reportProgressBestEffort_(sessionTargetReleaseId_, "failed_boot", failureCode, failureDetail);
  }

  const esp_err_t rollbackError = esp_ota_mark_app_invalid_rollback_and_reboot();
  Serial.printf("Pending OTA boot failed (%s): %s\n", failureCode.c_str(), failureDetail.c_str());
  if (rollbackError != ESP_OK) {
    Serial.printf("Rollback API failed: %s. Restarting unconfirmed image.\n", formatEspError(rollbackError).c_str());
    ESP.restart();
  }
}

bool OtaClient::handlePendingConfirmation_(FirmwareState state,
                                           bool bootReadyForTracking,
                                           bool recoveryRequested,
                                           bool pendingFactoryReset,
                                           bool wifiConnected) {
  if (!isRunningPendingVerify_()) {
    pendingConfirmStartedAtMs_ = 0;
    pendingConfirmReported_ = false;
    return false;
  }

  if (pendingConfirmStartedAtMs_ == 0) {
    pendingConfirmStartedAtMs_ = millis();
  }

  if (sessionPhase_ != kPhasePendingConfirm) {
    persistSession_(kPhasePendingConfirm, sessionTargetReleaseId_);
  }

  if (wifiConnected && !pendingConfirmReported_ && !sessionTargetReleaseId_.isEmpty()) {
    if (reportProgressBestEffort_(sessionTargetReleaseId_, "pending_confirm")) {
      pendingConfirmReported_ = true;
    }
  }

  if (!isHealthyRuntimeState_(state, bootReadyForTracking, recoveryRequested, pendingFactoryReset)) {
    failPendingBoot_("health_gate_failed", "Pending OTA image did not reach Tracking or TimeInvalid safely.", wifiConnected);
    return true;
  }

  if (sessionTargetReleaseId_.isEmpty()) {
    if (millis() - pendingConfirmStartedAtMs_ >= Config::kOtaConfirmWindowMs) {
      failPendingBoot_("boot_not_confirmed", "Pending OTA image is missing persisted release metadata.", wifiConnected);
    }
    return true;
  }

  if (millis() - pendingConfirmStartedAtMs_ < Config::kOtaConfirmWindowMs) {
    return true;
  }

  const esp_err_t confirmError = esp_ota_mark_app_valid_cancel_rollback();
  if (confirmError != ESP_OK && confirmError != ESP_ERR_NOT_FOUND) {
    failPendingBoot_("boot_not_confirmed",
                     String("esp_ota_mark_app_valid_cancel_rollback failed: ") + formatEspError(confirmError),
                     wifiConnected);
    return true;
  }

  persistConfirmedReleaseId_(sessionTargetReleaseId_);
  persistSession_(kPhaseSucceeded, sessionTargetReleaseId_);
  if (wifiConnected && reportProgressBestEffort_(sessionTargetReleaseId_, "succeeded")) {
    clearSession_();
  }
  return true;
}

bool OtaClient::handleRollbackRecovery_(bool wifiConnected) {
  if (isRunningPendingVerify_() || sessionTargetReleaseId_.isEmpty() || !isRollbackRecoveryPhase(sessionPhase_)) {
    return false;
  }

  if (!wifiConnected) {
    return true;
  }

  if (reportProgressBestEffort_(sessionTargetReleaseId_,
                                "rolled_back",
                                "boot_not_confirmed",
                                "Device returned to the last confirmed slot before OTA boot confirmation completed.")) {
    clearSession_();
  }
  return true;
}

bool OtaClient::isHealthyRuntimeState_(FirmwareState state,
                                       bool bootReadyForTracking,
                                       bool recoveryRequested,
                                       bool pendingFactoryReset) const {
  if (!bootReadyForTracking || recoveryRequested || pendingFactoryReset) {
    return false;
  }

  return state == FirmwareState::Tracking || state == FirmwareState::TimeInvalid;
}

bool OtaClient::isRunningPendingVerify_() const {
  const esp_partition_t* runningPartition = esp_ota_get_running_partition();
  if (!runningPartition) {
    return false;
  }

  esp_ota_img_states_t otaState = ESP_OTA_IMG_UNDEFINED;
  return esp_ota_get_state_partition(runningPartition, &otaState) == ESP_OK &&
         otaState == ESP_OTA_IMG_PENDING_VERIFY;
}

void OtaClient::loadPersistedState_() {
  Preferences prefs;
  prefs.begin(kOtaPrefsNamespace, true);
  confirmedReleaseId_ = prefs.getString(kConfirmedReleaseIdKey, "");
  sessionPhase_ = prefs.getString(kSessionPhaseKey, "");
  sessionTargetReleaseId_ = prefs.getString(kSessionTargetReleaseIdKey, "");
  prefs.end();
}

bool OtaClient::maybeCheckForRelease_(FirmwareState state,
                                      bool bootReadyForTracking,
                                      bool recoveryRequested,
                                      bool pendingFactoryReset,
                                      bool wifiConnected) {
  if (!cloudClient_ || !cloudClient_->isConfigured() || !wifiConnected) {
    return false;
  }

  const bool healthyRuntime = isHealthyRuntimeState_(state, bootReadyForTracking, recoveryRequested, pendingFactoryReset);
  const bool shouldCheck =
      releaseCheckRequested_ ||
      !releaseCheckPrimed_ ||
      (healthyRuntime && millis() - lastReleaseCheckAtMs_ >= kReleaseCheckIntervalMs);
  if (!shouldCheck) {
    return false;
  }

  releaseCheckPrimed_ = true;
  releaseCheckRequested_ = false;
  lastReleaseCheckAtMs_ = millis();

  CloudClient::OtaReleaseCheckResult result;
  if (!cloudClient_->checkFirmwareRelease(result, confirmedReleaseId_)) {
    return false;
  }

  if (result.decision == "install_ready" && result.installAuthorized && result.hasRelease) {
    clearAnnouncedDecision_();
    return startAuthorizedInstall_(result, state, bootReadyForTracking, recoveryRequested, pendingFactoryReset);
  }

  if (result.decision == "available" || result.decision == "blocked") {
    reportDecisionState_(result);
    if (result.decision == "blocked" && !sessionTargetReleaseId_.isEmpty()) {
      clearSession_();
    }
    return true;
  }

  if (result.decision == "none") {
    clearAnnouncedDecision_();
  }

  return true;
}

void OtaClient::persistConfirmedReleaseId_(const String& releaseId) {
  Preferences prefs;
  prefs.begin(kOtaPrefsNamespace, false);
  if (releaseId.isEmpty()) {
    prefs.remove(kConfirmedReleaseIdKey);
  } else {
    prefs.putString(kConfirmedReleaseIdKey, releaseId);
  }
  prefs.end();

  confirmedReleaseId_ = releaseId;
}

void OtaClient::persistSession_(const String& phase, const String& targetReleaseId) {
  Preferences prefs;
  prefs.begin(kOtaPrefsNamespace, false);
  if (phase.isEmpty()) {
    prefs.remove(kSessionPhaseKey);
  } else {
    prefs.putString(kSessionPhaseKey, phase);
  }

  if (targetReleaseId.isEmpty()) {
    prefs.remove(kSessionTargetReleaseIdKey);
  } else {
    prefs.putString(kSessionTargetReleaseIdKey, targetReleaseId);
  }
  prefs.end();

  sessionPhase_ = phase;
  sessionTargetReleaseId_ = targetReleaseId;
}

bool OtaClient::reportDecisionState_(const CloudClient::OtaReleaseCheckResult& result) {
  const String releaseId = !result.targetReleaseId.isEmpty()
                               ? result.targetReleaseId
                               : result.hasRelease ? result.release.releaseId : String("");
  if (releaseId.isEmpty()) {
    return false;
  }

  if (!shouldAnnounceDecision_(result.decision, releaseId, result.reason)) {
    return true;
  }

  const bool reported =
      reportProgressBestEffort_(releaseId,
                                result.decision,
                                result.decision == "blocked" ? result.reason : "",
                                result.reason);
  if (reported) {
    lastAnnouncedDecision_ = result.decision;
    lastAnnouncedReleaseId_ = releaseId;
    lastAnnouncedReason_ = result.reason;
  }
  return reported;
}

bool OtaClient::reportProgressBestEffort_(const String& releaseId,
                                          const String& state,
                                          const String& failureCode,
                                          const String& failureDetail) {
  if (!cloudClient_ || releaseId.isEmpty() || state.isEmpty()) {
    return false;
  }

  const bool ok = cloudClient_->reportOtaProgress(releaseId, state, failureCode, failureDetail);
  if (!ok) {
    Serial.printf("OTA progress report failed: %s -> %s\n", releaseId.c_str(), state.c_str());
  }
  return ok;
}

bool OtaClient::shouldAnnounceDecision_(const String& decision,
                                        const String& releaseId,
                                        const String& reason) const {
  return decision != lastAnnouncedDecision_ ||
         releaseId != lastAnnouncedReleaseId_ ||
         reason != lastAnnouncedReason_;
}

bool OtaClient::startAuthorizedInstall_(const CloudClient::OtaReleaseCheckResult& result,
                                        FirmwareState state,
                                        bool bootReadyForTracking,
                                        bool recoveryRequested,
                                        bool pendingFactoryReset) {
  if (!result.hasRelease || !result.release.valid) {
    return false;
  }

  if (!isHealthyRuntimeState_(state, bootReadyForTracking, recoveryRequested, pendingFactoryReset)) {
    reportProgressBestEffort_(result.release.releaseId,
                              "recovery_needed",
                              "health_gate_failed",
                              "Device must be in Tracking or TimeInvalid before OTA staging can begin.");
    clearSession_();
    return false;
  }

  const CloudClient::OtaReleaseEnvelope& release = result.release;
  if (release.schemaVersion != 1 ||
      release.hardwareProfile != Config::kHardwareProfile ||
      release.partitionLayout != Config::kOtaPartitionLayout ||
      release.compatibility.minimumPartitionLayout != Config::kOtaPartitionLayout ||
      release.artifact.kind != "esp32-application-bin" ||
      release.bootConfirmation.confirmWindowSeconds != (Config::kOtaConfirmWindowMs / 1000UL)) {
    const String failureCode =
        release.hardwareProfile != Config::kHardwareProfile ? "hardware_profile_mismatch" :
        release.partitionLayout != Config::kOtaPartitionLayout ||
                release.compatibility.minimumPartitionLayout != Config::kOtaPartitionLayout
            ? "partition_layout_mismatch"
            : release.artifact.kind != "esp32-application-bin"
                  ? "image_invalid"
                  : "version_not_allowed";
    reportProgressBestEffort_(release.releaseId, "blocked", failureCode, "Release envelope failed the local OTA safety checks.");
    clearSession_();
    return false;
  }

  clearAnnouncedDecision_();
  persistSession_(kPhaseRequested, release.releaseId);
  reportProgressBestEffort_(release.releaseId, "requested");

  String failureCode;
  String failureDetail;
  if (!downloadAndStageRelease_(release, failureCode, failureDetail)) {
    reportProgressBestEffort_(release.releaseId, failureStateForCode(failureCode), failureCode, failureDetail);
    clearSession_();
    return false;
  }

  persistSession_(kPhaseRebooting, release.releaseId);
  reportProgressBestEffort_(release.releaseId, "rebooting");
  Serial.printf("Rebooting into staged OTA release %s\n", release.releaseId.c_str());
  delay(150);
  ESP.restart();
  return true;
}
