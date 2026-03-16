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
  ensureDeviceAuthToken_();
}

const String& CloudClient::deviceAuthToken() {
  ensureDeviceAuthToken_();
  return deviceAuthToken_;
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

  DynamicJsonDocument doc(2048 + (maxCommands * 384));
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

bool CloudClient::redeemPendingClaim(const ProvisioningContract::PendingClaim& claim) {
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
  payload += "\"}";

  String response;
  const bool ok = postRpc_("redeem_device_onboarding_claim", payload, response);
  if (ok) {
    Serial.printf("Cloud claim redeemed for session %s\n", claim.onboardingSessionId);
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
    deviceAuthToken_ = generateDeviceAuthToken();
    prefs.putString(kDeviceAuthTokenKey, deviceAuthToken_);
  }
  prefs.end();

  return !deviceAuthToken_.isEmpty();
}

bool CloudClient::postRpc_(const char* rpcName, const String& payload, String& responseBody) {
  if (!rpcName || !identity_ || !isConfigured()) {
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

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

  return code >= 200 && code < 300;
}
