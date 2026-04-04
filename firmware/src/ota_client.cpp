#include "ota_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <esp_err.h>
#include <esp_ota_ops.h>
#include <esp_system.h>
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
constexpr unsigned long kReleaseCheckFailureRetryMs = 5000UL;
constexpr unsigned long kDownloadIdleTimeoutMs = 45000UL;
constexpr unsigned long kDownloadReadChunkTimeoutMs = 1000UL;
constexpr unsigned long kDownloadRetryDelayMs = 1500UL;
constexpr size_t kDownloadBufferSize = 2048U;
constexpr uint8_t kDownloadAttemptCount = 2;
constexpr uint8_t kProgressReportAttempts = 4;
constexpr unsigned long kProgressReportRetryDelayMs = 1000UL;
uint8_t gOtaDownloadBuffer[kDownloadBufferSize];

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
  if (failureCode == "artifact_too_large" || failureCode.startsWith("download_")) {
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

const char* resetReasonToString(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_UNKNOWN:
      return "ESP_RST_UNKNOWN";
    case ESP_RST_POWERON:
      return "ESP_RST_POWERON";
    case ESP_RST_EXT:
      return "ESP_RST_EXT";
    case ESP_RST_SW:
      return "ESP_RST_SW";
    case ESP_RST_PANIC:
      return "ESP_RST_PANIC";
    case ESP_RST_INT_WDT:
      return "ESP_RST_INT_WDT";
    case ESP_RST_TASK_WDT:
      return "ESP_RST_TASK_WDT";
    case ESP_RST_WDT:
      return "ESP_RST_WDT";
    case ESP_RST_DEEPSLEEP:
      return "ESP_RST_DEEPSLEEP";
    case ESP_RST_BROWNOUT:
      return "ESP_RST_BROWNOUT";
    case ESP_RST_SDIO:
      return "ESP_RST_SDIO";
  }

  return "ESP_RST_UNRECOGNIZED";
}

String interruptedPhaseFailureDetail(const String& phase, esp_reset_reason_t resetReason) {
  return String("Device restarted before OTA phase '") + phase +
         "' could complete (reset_reason=" + resetReasonToString(resetReason) + ").";
}

void interruptedPhaseFailureFor(const String& phase, String& failureState, String& failureCode) {
  if (phase == "verifying") {
    failureState = "failed_verify";
    failureCode = "image_invalid";
    return;
  }

  if (phase == "staged") {
    failureState = "failed_stage";
    failureCode = "slot_write_failed";
    return;
  }

  failureState = "failed_download";
  failureCode = "download_failed";
}

String formatHttpResponseFailure(int responseCode) {
  if (responseCode < 0) {
    const String errorMessage = HTTPClient::errorToString(responseCode);
    if (!errorMessage.isEmpty()) {
      return String("OTA artifact request failed: ") + errorMessage +
             " (HTTPClient " + String(responseCode) + ").";
    }

    return String("OTA artifact request failed with client error ") + String(responseCode) + ".";
  }

  return String("OTA artifact download returned HTTP ") + String(responseCode) + ".";
}

bool isRetryableHttpResponseCode(int responseCode) {
  return responseCode < 0 ||
         responseCode == HTTP_CODE_REQUEST_TIMEOUT ||
         responseCode == HTTP_CODE_TOO_MANY_REQUESTS ||
         responseCode >= 500;
}

bool isRetryableDownloadFailure(const String& failureCode) {
  return failureCode == "download_failed" ||
         failureCode == "download_request_begin_failed" ||
         failureCode == "download_request_retryable" ||
         failureCode == "download_stream_closed" ||
         failureCode == "download_idle_timeout" ||
         failureCode == "download_incomplete";
}

String appendDownloadRetryContext(const String& failureDetail, uint8_t retryCount) {
  if (retryCount == 0) {
    return failureDetail;
  }

  const String retrySummary =
      retryCount == 1 ? "The board retried the download once automatically before giving up."
                      : String("The board retried the download ") + String(retryCount) +
                            " times automatically before giving up.";
  return failureDetail.isEmpty() ? retrySummary : failureDetail + " " + retrySummary;
}

String buildRetryingDownloadDetail(const String& failureCode,
                                   const String& failureDetail,
                                   uint8_t nextAttempt,
                                   uint8_t maxAttempts) {
  String detail = failureDetail;
  if (detail.isEmpty()) {
    detail = failureCode.isEmpty() ? "The previous download attempt was interrupted."
                                   : String("The previous download attempt ended with ") + failureCode + ".";
  }

  detail += " Retrying download automatically (attempt ";
  detail += String(nextAttempt);
  detail += " of ";
  detail += String(maxAttempts);
  detail += ").";
  return detail;
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
    if (!sessionTargetReleaseId_.isEmpty()) {
      const esp_reset_reason_t resetReason = esp_reset_reason();
      String failureState;
      String failureCode;
      interruptedPhaseFailureFor(sessionPhase_, failureState, failureCode);
      queuePendingProgressReport_(sessionTargetReleaseId_,
                                  failureState,
                                  failureCode,
                                  interruptedPhaseFailureDetail(sessionPhase_, resetReason),
                                  true);
    } else {
      clearSession_();
    }
  }
}

const String& OtaClient::confirmedReleaseId() const {
  return confirmedReleaseId_;
}

bool OtaClient::isPendingBootVerification() const {
  return isRunningPendingVerify_();
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

  const bool hadPendingProgressReport =
      !pendingReportReleaseId_.isEmpty() && !pendingReportState_.isEmpty();
  if (!flushPendingProgressReport_(wifiConnected)) {
    return;
  }

  if (hadPendingProgressReport) {
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
                                         String& failureDetail,
                                         const String& progressFailureCode,
                                         const String& progressFailureDetail) {
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
  reportProgressBestEffort_(release.releaseId, "downloading", progressFailureCode, progressFailureDetail);

  WiFiClientSecure client;
  if (!configureArtifactClient_(client)) {
    failureCode = "download_tls_not_configured";
    failureDetail = "OTA artifact TLS trust is not configured.";
    return false;
  }

  HTTPClient http;
  if (!http.begin(client, release.artifact.url)) {
    failureCode = "download_request_begin_failed";
    failureDetail = "HTTP client could not begin the OTA artifact request.";
    return false;
  }

  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(kDownloadReadChunkTimeoutMs);

  const int responseCode = http.GET();
  if (responseCode != HTTP_CODE_OK) {
    failureCode = isRetryableHttpResponseCode(responseCode) ? "download_request_retryable" : "download_http_error";
    failureDetail = formatHttpResponseFailure(responseCode);
    http.end();
    return false;
  }

  const int contentLength = http.getSize();
  if (contentLength > 0 && static_cast<uint32_t>(contentLength) != release.artifact.sizeBytes) {
    failureCode = "download_length_mismatch";
    failureDetail = "OTA artifact content length does not match the release envelope.";
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  if (!stream) {
    failureCode = "download_stream_unavailable";
    failureDetail = "OTA artifact response body stream is unavailable.";
    http.end();
    return false;
  }
  stream->setTimeout(kDownloadReadChunkTimeoutMs);

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

  size_t totalRead = 0;
  unsigned long lastReadAtMs = millis();
  bool success = true;

  while (totalRead < release.artifact.sizeBytes) {
    const size_t available = stream->available();
    if (available == 0) {
      if (!http.connected()) {
        success = false;
        failureCode = "download_stream_closed";
        failureDetail = String("OTA artifact stream closed after ") + String(totalRead) + "/" +
                        String(release.artifact.sizeBytes) + " bytes.";
        break;
      }

      if (millis() - lastReadAtMs > kDownloadIdleTimeoutMs) {
        success = false;
        failureCode = "download_idle_timeout";
        failureDetail = String("OTA artifact download stalled after ") + String(totalRead) + "/" +
                        String(release.artifact.sizeBytes) + " bytes with a " +
                        String(kDownloadIdleTimeoutMs) + " ms idle timeout.";
        break;
      } else {
        delay(1);
        continue;
      }
    }

    const size_t remaining = release.artifact.sizeBytes - totalRead;
    size_t targetRead = available < kDownloadBufferSize ? available : kDownloadBufferSize;
    if (targetRead > remaining) {
      targetRead = remaining;
    }

    const size_t bytesRead = stream->readBytes(reinterpret_cast<char*>(gOtaDownloadBuffer), targetRead);
    if (bytesRead == 0) {
      if (!http.connected()) {
        success = false;
        failureCode = "download_stream_closed";
        failureDetail = String("OTA artifact stream closed after ") + String(totalRead) + "/" +
                        String(release.artifact.sizeBytes) + " bytes.";
        break;
      }

      if (millis() - lastReadAtMs > kDownloadIdleTimeoutMs) {
        success = false;
        failureCode = "download_idle_timeout";
        failureDetail = String("OTA artifact download stalled after ") + String(totalRead) + "/" +
                        String(release.artifact.sizeBytes) + " bytes with a " +
                        String(kDownloadIdleTimeoutMs) + " ms idle timeout.";
        break;
      }

      delay(1);
      continue;
    }

    lastReadAtMs = millis();
    totalRead += bytesRead;
    mbedtls_sha256_update_ret(&shaContext, gOtaDownloadBuffer, bytesRead);

    const esp_err_t writeError = esp_ota_write(otaHandle, gOtaDownloadBuffer, bytesRead);
    if (writeError != ESP_OK) {
      success = false;
      failureCode = "slot_write_failed";
      failureDetail = String("esp_ota_write failed: ") + formatEspError(writeError);
      break;
    }

    delay(1);
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

bool OtaClient::isSupportedBootConfirmation_(const CloudClient::OtaReleaseBootConfirmation& bootConfirmation) const {
  const uint32_t minSeconds = Config::kOtaMinSupportedConfirmWindowMs / 1000UL;
  const uint32_t maxSeconds = Config::kOtaMaxSupportedConfirmWindowMs / 1000UL;
  return bootConfirmation.requireNormalRuntimeState &&
         !bootConfirmation.requireCloudCheckIn &&
         bootConfirmation.confirmWindowSeconds >= minSeconds &&
         bootConfirmation.confirmWindowSeconds <= maxSeconds;
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
  const unsigned long now = millis();
  const bool commandTriggeredCheckPending = releaseCheckRequested_ || !releaseCheckPrimed_;
  const bool shouldCheck =
      (commandTriggeredCheckPending && now >= nextReleaseCheckRetryAtMs_) ||
      (healthyRuntime && now - lastReleaseCheckAtMs_ >= kReleaseCheckIntervalMs);
  if (!shouldCheck) {
    return false;
  }

  CloudClient::OtaReleaseCheckResult result;
  if (!cloudClient_->checkFirmwareRelease(result, confirmedReleaseId_)) {
    if (commandTriggeredCheckPending) {
      nextReleaseCheckRetryAtMs_ = now + kReleaseCheckFailureRetryMs;
      Serial.printf("OTA release check failed; keeping request pending and retrying in %lu ms\n",
                    static_cast<unsigned long>(kReleaseCheckFailureRetryMs));
    } else {
      lastReleaseCheckAtMs_ = now;
    }
    return false;
  }

  releaseCheckPrimed_ = true;
  releaseCheckRequested_ = false;
  nextReleaseCheckRetryAtMs_ = 0;
  lastReleaseCheckAtMs_ = now;

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

void OtaClient::clearPendingProgressReport_() {
  pendingReportReleaseId_ = "";
  pendingReportState_ = "";
  pendingReportFailureCode_ = "";
  pendingReportFailureDetail_ = "";
  pendingReportClearSession_ = false;
}

bool OtaClient::flushPendingProgressReport_(bool wifiConnected) {
  if (pendingReportReleaseId_.isEmpty() || pendingReportState_.isEmpty()) {
    return true;
  }

  if (!wifiConnected) {
    return false;
  }

  if (!reportProgressBestEffort_(pendingReportReleaseId_,
                                 pendingReportState_,
                                 pendingReportFailureCode_,
                                 pendingReportFailureDetail_)) {
    return false;
  }

  const bool clearSessionOnSuccess = pendingReportClearSession_;
  clearPendingProgressReport_();
  if (clearSessionOnSuccess) {
    clearSession_();
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

void OtaClient::queuePendingProgressReport_(const String& releaseId,
                                            const String& state,
                                            const String& failureCode,
                                            const String& failureDetail,
                                            bool clearSessionOnSuccess) {
  pendingReportReleaseId_ = releaseId;
  pendingReportState_ = state;
  pendingReportFailureCode_ = failureCode;
  pendingReportFailureDetail_ = failureDetail;
  pendingReportClearSession_ = clearSessionOnSuccess;
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

  for (uint8_t attempt = 1; attempt <= kProgressReportAttempts; ++attempt) {
    if (cloudClient_->reportOtaProgress(releaseId, state, failureCode, failureDetail)) {
      return true;
    }

    if (attempt < kProgressReportAttempts) {
      Serial.printf("OTA progress report retry %u/%u scheduled for %s -> %s\n",
                    static_cast<unsigned int>(attempt + 1),
                    static_cast<unsigned int>(kProgressReportAttempts),
                    releaseId.c_str(),
                    state.c_str());
      delay(kProgressReportRetryDelayMs);
      continue;
    }
  }

  Serial.printf("OTA progress report failed: %s -> %s\n", releaseId.c_str(), state.c_str());
  return false;
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
      !isSupportedBootConfirmation_(release.bootConfirmation)) {
    const String failureCode =
        release.hardwareProfile != Config::kHardwareProfile ? "hardware_profile_mismatch" :
        release.partitionLayout != Config::kOtaPartitionLayout ||
                release.compatibility.minimumPartitionLayout != Config::kOtaPartitionLayout
            ? "partition_layout_mismatch"
            : release.artifact.kind != "esp32-application-bin"
                  ? "image_invalid"
                  : "boot_confirmation_unsupported";
    reportProgressBestEffort_(release.releaseId, "blocked", failureCode, "Release envelope failed the local OTA safety checks.");
    clearSession_();
    return false;
  }

  clearAnnouncedDecision_();
  persistSession_(kPhaseRequested, release.releaseId);
  reportProgressBestEffort_(release.releaseId, "requested");

  String failureCode;
  String failureDetail;
  String progressFailureCode;
  String progressFailureDetail;
  bool stagedRelease = false;
  uint8_t attemptsUsed = 0;
  for (uint8_t attempt = 1; attempt <= kDownloadAttemptCount; ++attempt) {
    attemptsUsed = attempt;
    if (downloadAndStageRelease_(release,
                                 failureCode,
                                 failureDetail,
                                 progressFailureCode,
                                 progressFailureDetail)) {
      stagedRelease = true;
      break;
    }

    if (attempt < kDownloadAttemptCount && isRetryableDownloadFailure(failureCode)) {
      progressFailureCode = failureCode;
      progressFailureDetail = buildRetryingDownloadDetail(
          failureCode,
          failureDetail,
          static_cast<uint8_t>(attempt + 1),
          kDownloadAttemptCount);
      Serial.printf("OTA staging attempt %u/%u for %s failed (%s): %s Retrying.\n",
                    static_cast<unsigned int>(attempt),
                    static_cast<unsigned int>(kDownloadAttemptCount),
                    release.releaseId.c_str(),
                    failureCode.c_str(),
                    failureDetail.c_str());
      delay(kDownloadRetryDelayMs);
      continue;
    }

    break;
  }

  if (!stagedRelease) {
    const String failureState = failureStateForCode(failureCode);
    failureDetail = appendDownloadRetryContext(failureDetail, attemptsUsed > 0 ? attemptsUsed - 1 : 0);
    persistSession_(failureState, release.releaseId);
    if (reportProgressBestEffort_(release.releaseId, failureState, failureCode, failureDetail)) {
      clearSession_();
    } else {
      queuePendingProgressReport_(release.releaseId, failureState, failureCode, failureDetail, true);
    }
    return false;
  }

  persistSession_(kPhaseRebooting, release.releaseId);
  reportProgressBestEffort_(release.releaseId, "rebooting");
  Serial.printf("Rebooting into staged OTA release %s\n", release.releaseId.c_str());
  delay(150);
  ESP.restart();
  return true;
}
