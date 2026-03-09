#include "cloud_client.h"

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
