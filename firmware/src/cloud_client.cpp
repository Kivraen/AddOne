#include "cloud_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "cloud_config.h"
#include "config.h"

namespace {
constexpr const char* kCloudPrefsNamespace = "ao_cloud";
constexpr const char* kDeviceAuthTokenKey = "deviceAuth";
constexpr const char* kMqttPasswordKey = "mqttPass";
constexpr const char* kMqttUsernameKey = "mqttUser";

String escapeJson(const String& input) {
  String output;
  output.reserve(input.length() + 8);

  for (size_t index = 0; index < input.length(); ++index) {
    const char c = input[index];
    switch (c) {
      case '"':
        output += "\\\"";
        break;
      case '\\':
        output += "\\\\";
        break;
      case '\n':
        output += "\\n";
        break;
      case '\r':
        output += "\\r";
        break;
      case '\t':
        output += "\\t";
        break;
      default:
        output += c;
        break;
    }
  }

  return output;
}

String buildRpcUrl(const char* rpcName) {
  String base = CloudConfig::kSupabaseProjectUrl;
  while (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }

  base += "/rest/v1/rpc/";
  base += rpcName;
  return base;
}

String generateDeviceAuthToken() {
  char token[65];
  uint32_t parts[4];
  parts[0] = esp_random();
  parts[1] = esp_random();
  parts[2] = esp_random();
  parts[3] = esp_random();
  snprintf(token,
           sizeof(token),
           "%08lx%08lx%08lx%08lx",
           static_cast<unsigned long>(parts[0]),
           static_cast<unsigned long>(parts[1]),
           static_cast<unsigned long>(parts[2]),
           static_cast<unsigned long>(parts[3]));
  return String(token);
}
} // namespace

void CloudClient::begin(const DeviceIdentity& identity) {
  identity_ = &identity;
  authTokenProvisioningSuspended_ = false;
}

void CloudClient::clearPersistedDeviceAuthToken() {
  deviceAuthToken_ = "";
  authTokenProvisioningSuspended_ = true;

  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, false);
  prefs.remove(kDeviceAuthTokenKey);
  prefs.end();
}

void CloudClient::clearPersistedMqttTransportCredentials() {
  mqttBrokerUsername_ = "";
  mqttBrokerPassword_ = "";

  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, false);
  prefs.remove(kMqttUsernameKey);
  prefs.remove(kMqttPasswordKey);
  prefs.end();
}

const String& CloudClient::deviceAuthToken() {
  ensureDeviceAuthToken_();
  return deviceAuthToken_;
}

bool CloudClient::ensureMqttTransportCredentials() {
  if (!mqttBrokerUsername_.isEmpty() && !mqttBrokerPassword_.isEmpty()) {
    return true;
  }

  if (loadPersistedMqttTransportCredentials_()) {
    return true;
  }

  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\"}";

  String response;
  if (!postRpc_("issue_device_mqtt_credentials", payload, response)) {
    return false;
  }

  const size_t responseCapacity = response.length() * 2U + 1024U;
  DynamicJsonDocument doc(responseCapacity < 4096U ? 4096U : responseCapacity);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.printf("Failed to parse MQTT credential payload: %s\n", error.c_str());
    return false;
  }

  JsonObjectConst credential;
  if (doc.is<JsonArrayConst>()) {
    JsonArrayConst entries = doc.as<JsonArrayConst>();
    if (entries.isNull() || entries.size() == 0) {
      Serial.println("MQTT credential payload was empty.");
      return false;
    }
    credential = entries[0].as<JsonObjectConst>();
  } else {
    credential = doc.as<JsonObjectConst>();
  }

  if (credential.isNull()) {
    Serial.println("MQTT credential payload was not a JSON object.");
    return false;
  }

  const String username = credential["mqtt_username"] | "";
  const String password = credential["mqtt_password"] | "";
  if (username.isEmpty() || password.isEmpty()) {
    Serial.println("MQTT credential payload was missing username or password.");
    return false;
  }

  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, false);
  prefs.putString(kMqttUsernameKey, username);
  prefs.putString(kMqttPasswordKey, password);
  prefs.end();

  mqttBrokerUsername_ = username;
  mqttBrokerPassword_ = password;
  Serial.printf("Provisioned device MQTT credentials for %s\n", identity_->hardwareUid().c_str());
  return true;
}

bool CloudClient::ackCommand(const String& commandId, CommandAckStatus status, const String& lastError) {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_() || commandId.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_command_id\":\"";
  payload += escapeJson(commandId);
  payload += "\",\"p_status\":\"";
  payload += ackStatusName_(status);
  payload += "\"";

  if (!lastError.isEmpty()) {
    payload += ",\"p_last_error\":\"";
    payload += escapeJson(lastError);
    payload += "\"";
  }

  payload += "}";

  String response;
  return postRpc_("ack_device_command", payload, response);
}

bool CloudClient::isConfigured() const {
  return strlen(CloudConfig::kSupabaseProjectUrl) > 0 && strlen(CloudConfig::kSupabaseAnonKey) > 0;
}

bool CloudClient::heartbeat() {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_firmware_version\":\"";
  payload += escapeJson(Config::kFirmwareVersion);
  payload += "\",\"p_hardware_profile\":\"";
  payload += escapeJson(Config::kHardwareProfile);
  payload += "\"}";

  String response;
  const bool ok = postRpc_("device_heartbeat", payload, response);
  if (ok) {
    Serial.println("Cloud heartbeat OK");
  }
  return ok;
}

bool CloudClient::checkFirmwareRelease(OtaReleaseCheckResult& outResult, const String& currentConfirmedReleaseId) {
  outResult = OtaReleaseCheckResult{};
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_current_firmware_version\":\"";
  payload += escapeJson(Config::kFirmwareVersion);
  payload += "\",\"p_current_partition_layout\":\"";
  payload += escapeJson(Config::kOtaPartitionLayout);
  payload += "\"";

  if (!currentConfirmedReleaseId.isEmpty()) {
    payload += ",\"p_current_confirmed_release_id\":\"";
    payload += escapeJson(currentConfirmedReleaseId);
    payload += "\"";
  }

  payload += "}";

  String response;
  if (!postRpc_("check_device_firmware_release", payload, response)) {
    return false;
  }

  const size_t responseCapacity = response.length() * 2U + 2048U;
  DynamicJsonDocument doc(responseCapacity < 6144U ? 6144U : responseCapacity);
  JsonObjectConst resultObject;
  if (!extractRpcObject_(response, doc, resultObject)) {
    Serial.println("Failed to parse firmware release check payload.");
    return false;
  }

  outResult.decision = resultObject["decision"] | "";
  outResult.reason = resultObject["reason"] | "";
  outResult.targetReleaseId = resultObject["target_release_id"] | "";
  outResult.requestId = resultObject["request_id"] | "";
  outResult.commandId = resultObject["command_id"] | "";
  outResult.requestedAt = resultObject["requested_at"] | "";
  outResult.installAuthorized =
      resultObject["install_authorized"].isNull() ? false : resultObject["install_authorized"].as<bool>();

  JsonVariantConst releaseVariant = resultObject["release"];
  if (!releaseVariant.isNull() && releaseVariant.is<JsonObjectConst>()) {
    outResult.hasRelease = parseOtaReleaseEnvelope_(releaseVariant, outResult.release);
  }

  if (outResult.targetReleaseId.isEmpty() && outResult.hasRelease) {
    outResult.targetReleaseId = outResult.release.releaseId;
  }

  return !outResult.decision.isEmpty();
}

bool CloudClient::hasPersistedDeviceAuthToken() const {
  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, true);
  const bool hasToken = prefs.isKey(kDeviceAuthTokenKey);
  prefs.end();
  return hasToken;
}

const String& CloudClient::mqttTransportPassword() const {
  return mqttBrokerPassword_;
}

const String& CloudClient::mqttTransportUsername() const {
  return mqttBrokerUsername_;
}

bool CloudClient::pullCommands(DeviceCommand* outCommands, size_t maxCommands, size_t& outCount) {
  outCount = 0;
  if (!outCommands || maxCommands == 0 || !identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_limit\":";
  payload += String(maxCommands);
  payload += "}";

  String response;
  if (!postRpc_("pull_device_commands", payload, response)) {
    return false;
  }

  const size_t responseCapacity = response.length() * 2U + 2048U;
  DynamicJsonDocument doc(responseCapacity < 12288U ? 12288U : responseCapacity);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.printf("Failed to parse command payload: %s\n", error.c_str());
    return false;
  }

  JsonArray commands = doc.as<JsonArray>();
  if (commands.isNull()) {
    Serial.println("Command payload was not a JSON array.");
    return false;
  }

  for (JsonObject entry : commands) {
    if (outCount >= maxCommands) {
      break;
    }

    DeviceCommand& command = outCommands[outCount++];
    command.id = entry["id"] | "";
    command.kind = entry["kind"] | "";

    JsonVariantConst payloadObject = entry["payload"];
    if (payloadObject.is<JsonObjectConst>()) {
      JsonObjectConst payloadJson = payloadObject.as<JsonObjectConst>();
      serializeJson(payloadJson, command.payloadJson);
      command.localDate = payloadJson["local_date"] | "";
      command.effectiveAt = payloadJson["effective_at"] | "";
      if (!payloadJson["is_done"].isNull()) {
        command.isDone = payloadJson["is_done"].as<bool>();
        command.hasSetDayStatePayload = !command.localDate.isEmpty();
      }
      command.hasHistoryDraftPayload = payloadJson["updates"].is<JsonArrayConst>();
      if (!payloadJson["base_revision"].isNull()) {
        command.baseRevision = payloadJson["base_revision"].as<uint32_t>();
        command.hasBaseRevision = true;
      }

      command.settingsSync.hasAmbientAuto = !payloadJson["ambient_auto"].isNull();
      command.settingsSync.hasRewardEnabled = !payloadJson["reward_enabled"].isNull();
      command.settingsSync.hasDayResetTime = !payloadJson["day_reset_time"].isNull();
      command.settingsSync.hasName = !payloadJson["name"].isNull();
      command.settingsSync.hasPaletteCustom = payloadJson.containsKey("palette_custom") && payloadJson["palette_custom"].is<JsonObjectConst>();
      command.settingsSync.hasPalettePreset = !payloadJson["palette_preset"].isNull();
      command.settingsSync.hasRewardTrigger = !payloadJson["reward_trigger"].isNull();
      command.settingsSync.hasRewardType = !payloadJson["reward_type"].isNull();
      command.settingsSync.hasTimezone = !payloadJson["timezone"].isNull();
      command.settingsSync.hasBrightness = !payloadJson["brightness"].isNull();
      command.settingsSync.hasWeeklyTarget = !payloadJson["weekly_target"].isNull();

      command.settingsSync.ambientAuto = command.settingsSync.hasAmbientAuto ? payloadJson["ambient_auto"].as<bool>() : true;
      command.settingsSync.rewardEnabled = command.settingsSync.hasRewardEnabled ? payloadJson["reward_enabled"].as<bool>() : false;
      command.settingsSync.dayResetTime = payloadJson["day_reset_time"] | "";
      command.settingsSync.name = payloadJson["name"] | "";
      if (command.settingsSync.hasPaletteCustom) {
        String paletteCustomJson;
        serializeJson(payloadJson["palette_custom"], paletteCustomJson);
        command.settingsSync.paletteCustomJson = paletteCustomJson;
      } else {
        command.settingsSync.paletteCustomJson = "";
      }
      command.settingsSync.palettePreset = payloadJson["palette_preset"] | "";
      command.settingsSync.rewardTrigger = payloadJson["reward_trigger"] | "";
      command.settingsSync.rewardType = payloadJson["reward_type"] | "";
      command.settingsSync.timezone = payloadJson["timezone"] | "";
      command.settingsSync.brightness =
          command.settingsSync.hasBrightness ? payloadJson["brightness"].as<uint8_t>() : 70;
      command.settingsSync.weeklyTarget = command.settingsSync.hasWeeklyTarget
                                              ? payloadJson["weekly_target"].as<uint8_t>()
                                              : Config::kDefaultWeeklyMinimum;
      command.hasSyncSettingsPayload =
          command.settingsSync.hasAmbientAuto || command.settingsSync.hasRewardEnabled || command.settingsSync.hasDayResetTime ||
          command.settingsSync.hasName ||
          command.settingsSync.hasPaletteCustom ||
          command.settingsSync.hasPalettePreset || command.settingsSync.hasRewardTrigger || command.settingsSync.hasRewardType ||
          command.settingsSync.hasTimezone || command.settingsSync.hasBrightness || command.settingsSync.hasWeeklyTarget;
    }
  }

  return true;
}

bool CloudClient::queueFriendCelebration(const String& sourceLocalDate,
                                         const HabitTracker::WeekDate& currentWeekStart,
                                         uint8_t todayRow,
                                         uint8_t weeklyTarget,
                                         const String& boardDaysJson,
                                         const String& palettePreset,
                                         const String& paletteCustomJson,
                                         const String& emittedAt) {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  if (sourceLocalDate.isEmpty() || boardDaysJson.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_source_local_date\":\"";
  payload += escapeJson(sourceLocalDate);
  payload += "\",\"p_current_week_start\":\"";
  payload += String(currentWeekStart.year);
  payload += "-";
  if (currentWeekStart.month < 10) {
    payload += "0";
  }
  payload += String(currentWeekStart.month);
  payload += "-";
  if (currentWeekStart.day < 10) {
    payload += "0";
  }
  payload += String(currentWeekStart.day);
  payload += "\",\"p_today_row\":";
  payload += String(todayRow);
  payload += ",\"p_weekly_target\":";
  payload += String(weeklyTarget);
  payload += ",\"p_board_days\":";
  payload += boardDaysJson;
  payload += ",\"p_palette_preset\":\"";
  payload += escapeJson(palettePreset.isEmpty() ? String("classic") : palettePreset);
  payload += "\",\"p_palette_custom\":";
  payload += paletteCustomJson.isEmpty() ? "{}" : paletteCustomJson;

  if (!emittedAt.isEmpty()) {
    payload += ",\"p_emitted_at\":\"";
    payload += escapeJson(emittedAt);
    payload += "\"";
  }

  payload += "}";

  String response;
  return postRpc_("queue_friend_celebration_from_device", payload, response);
}

bool CloudClient::reportFactoryReset(uint32_t resetEpoch) {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_reset_epoch\":";
  payload += String(resetEpoch);
  payload += "}";

  String response;
  return postRpc_("report_device_factory_reset", payload, response);
}

bool CloudClient::reportOtaProgress(const String& releaseId,
                                    const String& state,
                                    const String& failureCode,
                                    const String& failureDetail,
                                    OtaStatusSnapshot* outStatus) {
  if (outStatus) {
    *outStatus = OtaStatusSnapshot{};
  }

  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_() ||
      releaseId.isEmpty() || state.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_release_id\":\"";
  payload += escapeJson(releaseId);
  payload += "\",\"p_state\":\"";
  payload += escapeJson(state);
  payload += "\",\"p_firmware_version\":\"";
  payload += escapeJson(Config::kFirmwareVersion);
  payload += "\"";

  if (!failureCode.isEmpty()) {
    payload += ",\"p_failure_code\":\"";
    payload += escapeJson(failureCode);
    payload += "\"";
  }

  if (!failureDetail.isEmpty()) {
    payload += ",\"p_failure_detail\":\"";
    payload += escapeJson(failureDetail);
    payload += "\"";
  }

  payload += "}";

  String response;
  if (!postRpc_("report_device_ota_progress", payload, response)) {
    return false;
  }

  if (!outStatus) {
    return true;
  }

  const size_t responseCapacity = response.length() * 2U + 2048U;
  DynamicJsonDocument doc(responseCapacity < 6144U ? 6144U : responseCapacity);
  JsonObjectConst resultObject;
  if (!extractRpcObject_(response, doc, resultObject)) {
    Serial.println("Failed to parse OTA progress response payload.");
    return true;
  }

  outStatus->valid = parseOtaStatusSnapshot_(resultObject, *outStatus);
  return true;
}

bool CloudClient::redeemPendingClaim(const ProvisioningContract::PendingClaim& claim, uint32_t resetEpoch) {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  if (claim.claimToken[0] == '\0' || claim.onboardingSessionId[0] == '\0') {
    return false;
  }

  String payload = "{";
  payload += "\"p_claim_token\":\"";
  payload += escapeJson(String(claim.claimToken));
  payload += "\",\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_hardware_profile\":\"";
  payload += escapeJson(claim.hardwareProfileHint[0] == '\0' ? String(Config::kHardwareProfile) : String(claim.hardwareProfileHint));
  payload += "\",\"p_firmware_version\":\"";
  payload += escapeJson(Config::kFirmwareVersion);
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_reset_epoch\":";
  payload += String(resetEpoch);
  payload += "}";

  String response;
  bool ok = postRpc_("redeem_device_onboarding_claim", payload, response);
  if (!ok &&
      response.indexOf("redeem_device_onboarding_claim") >= 0 &&
      response.indexOf("p_reset_epoch") >= 0 &&
      response.indexOf("schema cache") >= 0) {
    Serial.println("Claim RPC missing p_reset_epoch on backend; retrying legacy signature.");

    String legacyPayload = "{";
    legacyPayload += "\"p_claim_token\":\"";
    legacyPayload += escapeJson(String(claim.claimToken));
    legacyPayload += "\",\"p_hardware_uid\":\"";
    legacyPayload += escapeJson(identity_->hardwareUid());
    legacyPayload += "\",\"p_hardware_profile\":\"";
    legacyPayload += escapeJson(claim.hardwareProfileHint[0] == '\0' ? String(Config::kHardwareProfile) : String(claim.hardwareProfileHint));
    legacyPayload += "\",\"p_firmware_version\":\"";
    legacyPayload += escapeJson(Config::kFirmwareVersion);
    legacyPayload += "\",\"p_device_auth_token\":\"";
    legacyPayload += escapeJson(deviceAuthToken_);
    legacyPayload += "\"}";

    ok = postRpc_("redeem_device_onboarding_claim", legacyPayload, response);
  }

  if (ok) {
    Serial.printf("Cloud claim redeemed for session %s\n", claim.onboardingSessionId);
    if (!ensureMqttTransportCredentials()) {
      Serial.println("Claim succeeded, but MQTT transport credentials are still unavailable.");
    }
  }
  return ok;
}

bool CloudClient::uploadRuntimeSnapshot(uint32_t revision,
                                        const HabitTracker::WeekDate& currentWeekStart,
                                        uint8_t todayRow,
                                        const String& boardDaysJson,
                                        const String& settingsJson,
                                        const String& generatedAt) {
  if (!identity_ || !isConfigured() || WiFi.status() != WL_CONNECTED || !ensureDeviceAuthToken_()) {
    return false;
  }

  if (boardDaysJson.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"p_hardware_uid\":\"";
  payload += escapeJson(identity_->hardwareUid());
  payload += "\",\"p_device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken_);
  payload += "\",\"p_revision\":";
  payload += String(revision);
  payload += ",\"p_current_week_start\":\"";
  payload += String(currentWeekStart.year);
  payload += "-";
  if (currentWeekStart.month < 10) {
    payload += "0";
  }
  payload += String(currentWeekStart.month);
  payload += "-";
  if (currentWeekStart.day < 10) {
    payload += "0";
  }
  payload += String(currentWeekStart.day);
  payload += "\",\"p_today_row\":";
  payload += String(todayRow);
  payload += ",\"p_board_days\":";
  payload += boardDaysJson;
  payload += ",\"p_settings\":";
  payload += settingsJson.isEmpty() ? "{}" : settingsJson;

  if (!generatedAt.isEmpty()) {
    payload += ",\"p_generated_at\":\"";
    payload += escapeJson(generatedAt);
    payload += "\"";
  }

  payload += "}";

  String response;
  return postRpc_("upload_device_runtime_snapshot", payload, response);
}

const char* CloudClient::ackStatusName_(CommandAckStatus status) const {
  switch (status) {
    case CommandAckStatus::Applied:
      return "applied";
    case CommandAckStatus::Cancelled:
      return "cancelled";
    case CommandAckStatus::Failed:
    default:
      return "failed";
  }
}

bool CloudClient::ensureDeviceAuthToken_() {
  if (!deviceAuthToken_.isEmpty()) {
    return true;
  }

  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, false);
  deviceAuthToken_ = prefs.getString(kDeviceAuthTokenKey, "");
  if (deviceAuthToken_.isEmpty()) {
    if (authTokenProvisioningSuspended_) {
      prefs.end();
      return false;
    }
    deviceAuthToken_ = generateDeviceAuthToken();
    prefs.putString(kDeviceAuthTokenKey, deviceAuthToken_);
  }
  prefs.end();

  return !deviceAuthToken_.isEmpty();
}

bool CloudClient::configureSecureHttpClient_(WiFiClientSecure& client) const {
  if (strlen(CloudConfig::kSupabaseRootCaPem) == 0) {
    Serial.println("Cloud TLS trust missing: set CloudConfig::kSupabaseRootCaPem before shipping firmware.");
    return false;
  }

  client.setCACert(CloudConfig::kSupabaseRootCaPem);
  return true;
}

bool CloudClient::loadPersistedMqttTransportCredentials_() {
  Preferences prefs;
  prefs.begin(kCloudPrefsNamespace, true);
  const String username = prefs.getString(kMqttUsernameKey, "");
  const String password = prefs.getString(kMqttPasswordKey, "");
  prefs.end();

  if (username.isEmpty() || password.isEmpty()) {
    return false;
  }

  mqttBrokerUsername_ = username;
  mqttBrokerPassword_ = password;
  return true;
}

bool CloudClient::extractRpcObject_(const String& responseBody,
                                    DynamicJsonDocument& document,
                                    JsonObjectConst& outObject) const {
  outObject = JsonObjectConst();
  if (responseBody.isEmpty()) {
    return false;
  }

  DeserializationError error = deserializeJson(document, responseBody);
  if (error) {
    Serial.printf("Failed to parse RPC payload: %s\n", error.c_str());
    return false;
  }

  if (document.is<JsonArrayConst>()) {
    JsonArrayConst entries = document.as<JsonArrayConst>();
    if (entries.isNull() || entries.size() == 0 || !entries[0].is<JsonObjectConst>()) {
      return false;
    }
    outObject = entries[0].as<JsonObjectConst>();
    return !outObject.isNull();
  }

  if (!document.is<JsonObjectConst>()) {
    return false;
  }

  outObject = document.as<JsonObjectConst>();
  return !outObject.isNull();
}

bool CloudClient::parseOtaReleaseEnvelope_(JsonVariantConst source, OtaReleaseEnvelope& outRelease) const {
  outRelease = OtaReleaseEnvelope{};
  JsonObjectConst releaseObject = source.as<JsonObjectConst>();
  if (releaseObject.isNull()) {
    return false;
  }

  JsonObjectConst artifact = releaseObject["artifact"].as<JsonObjectConst>();
  JsonObjectConst compatibility = releaseObject["compatibility"].as<JsonObjectConst>();
  JsonObjectConst rollback = releaseObject["rollback"].as<JsonObjectConst>();
  JsonObjectConst bootConfirmation = releaseObject["boot_confirmation"].as<JsonObjectConst>();

  outRelease.schemaVersion = releaseObject["schema_version"] | 0;
  outRelease.releaseId = releaseObject["release_id"] | "";
  outRelease.firmwareVersion = releaseObject["firmware_version"] | "";
  outRelease.hardwareProfile = releaseObject["hardware_profile"] | "";
  outRelease.partitionLayout = releaseObject["partition_layout"] | "";
  outRelease.channel = releaseObject["channel"] | "";
  outRelease.status = releaseObject["status"] | "";
  outRelease.installPolicy = releaseObject["install_policy"] | "";
  if (releaseObject["rollout"].is<JsonObjectConst>()) {
    outRelease.rolloutMode = releaseObject["rollout"]["mode"] | "";
  }

  outRelease.artifact.kind = artifact["kind"] | "";
  outRelease.artifact.url = artifact["url"] | "";
  outRelease.artifact.sha256 = artifact["sha256"] | "";
  outRelease.artifact.sizeBytes = artifact["size_bytes"] | 0;

  outRelease.compatibility.minimumPartitionLayout = compatibility["minimum_partition_layout"] | "";
  outRelease.compatibility.minimumConfirmedFirmwareVersion =
      compatibility["minimum_confirmed_firmware_version"] | "";

  outRelease.rollback.previousStableReleaseId = rollback["previous_stable_release_id"] | "";
  outRelease.rollback.allowDowngradeToPreviousStable =
      rollback["allow_downgrade_to_previous_stable"].isNull()
          ? false
          : rollback["allow_downgrade_to_previous_stable"].as<bool>();

  outRelease.bootConfirmation.confirmWindowSeconds = bootConfirmation["confirm_window_seconds"] | 0;
  outRelease.bootConfirmation.requireNormalRuntimeState =
      bootConfirmation["require_normal_runtime_state"].isNull()
          ? false
          : bootConfirmation["require_normal_runtime_state"].as<bool>();
  outRelease.bootConfirmation.requireCloudCheckIn =
      bootConfirmation["require_cloud_check_in"].isNull()
          ? false
          : bootConfirmation["require_cloud_check_in"].as<bool>();

  outRelease.valid =
      outRelease.schemaVersion == 1 &&
      !outRelease.releaseId.isEmpty() &&
      !outRelease.firmwareVersion.isEmpty() &&
      !outRelease.hardwareProfile.isEmpty() &&
      !outRelease.partitionLayout.isEmpty() &&
      !outRelease.artifact.kind.isEmpty() &&
      !outRelease.artifact.url.isEmpty() &&
      !outRelease.artifact.sha256.isEmpty() &&
      outRelease.artifact.sizeBytes > 0;
  return outRelease.valid;
}

bool CloudClient::parseOtaStatusSnapshot_(JsonObjectConst source, OtaStatusSnapshot& outStatus) const {
  outStatus = OtaStatusSnapshot{};
  if (source.isNull()) {
    return false;
  }

  outStatus.currentState = source["current_state"] | "";
  outStatus.targetReleaseId = source["target_release_id"] | "";
  outStatus.confirmedReleaseId = source["confirmed_release_id"] | "";
  outStatus.lastFailureCode = source["last_failure_code"] | "";
  outStatus.lastFailureDetail = source["last_failure_detail"] | "";
  outStatus.otaStartedAt = source["ota_started_at"] | "";
  outStatus.otaCompletedAt = source["ota_completed_at"] | "";
  outStatus.valid = !outStatus.currentState.isEmpty() || !outStatus.targetReleaseId.isEmpty();
  return outStatus.valid;
}

bool CloudClient::postRpc_(const char* rpcName, const String& payload, String& responseBody) {
  if (!rpcName || !identity_ || !isConfigured()) {
    return false;
  }

  WiFiClientSecure client;
  if (!configureSecureHttpClient_(client)) {
    return false;
  }

  HTTPClient http;
  if (!http.begin(client, buildRpcUrl(rpcName))) {
    Serial.printf("Cloud RPC begin failed: %s\n", rpcName);
    return false;
  }

  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", CloudConfig::kSupabaseAnonKey);
  http.addHeader("Authorization", String("Bearer ") + CloudConfig::kSupabaseAnonKey);

  const int code = http.POST(payload);
  responseBody = http.getString();
  http.end();

  Serial.printf("Cloud RPC %s -> HTTP %d\n", rpcName, code);
  if (responseBody.length() > 0) {
    Serial.printf("Cloud RPC %s response: %s\n", rpcName, responseBody.c_str());
  }

  const bool authFailed =
      code >= 400 &&
      (responseBody.indexOf("Device authentication failed.") >= 0 ||
       responseBody.indexOf("Device auth token is not registered.") >= 0);
  if (authFailed) {
    Serial.println("Cloud RPC auth failed. Runtime self-reregistration is disabled; re-onboard or reprovision securely.");
  }

  return code >= 200 && code < 300;
}
