#include "ap_server.h"

#include <WiFi.h>

#include "config.h"

namespace {
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

String extractJsonString(const String& json, const char* field) {
  String needle = "\"";
  needle += field;
  needle += "\":";

  int idx = json.indexOf(needle);
  if (idx < 0) {
    return String();
  }
  idx += needle.length();

  while (idx < (int)json.length() && (json[idx] == ' ' || json[idx] == '\n' || json[idx] == '\r' || json[idx] == '\t')) {
    idx++;
  }

  if (idx >= (int)json.length() || json[idx] != '"') {
    return String();
  }
  idx++;

  String output;
  for (; idx < (int)json.length(); ++idx) {
    const char c = json[idx];
    if (c == '"') {
      break;
    }

    if (c == '\\') {
      if (idx + 1 >= (int)json.length()) {
        break;
      }

      const char escaped = json[++idx];
      switch (escaped) {
        case '"':
          output += '"';
          break;
        case '\\':
          output += '\\';
          break;
        case '/':
          output += '/';
          break;
        case 'n':
          output += '\n';
          break;
        case 'r':
          output += '\r';
          break;
        case 't':
          output += '\t';
          break;
        default:
          output += escaped;
          break;
      }
    } else {
      output += c;
    }
  }

  return output;
}

long extractJsonInt(const String& json, const char* field, long fallback) {
  String needle = "\"";
  needle += field;
  needle += "\":";

  int idx = json.indexOf(needle);
  if (idx < 0) {
    return fallback;
  }
  idx += needle.length();

  while (idx < (int)json.length() && (json[idx] == ' ' || json[idx] == '\n' || json[idx] == '\r' || json[idx] == '\t')) {
    idx++;
  }

  String digits;
  while (idx < (int)json.length() && (json[idx] == '-' || (json[idx] >= '0' && json[idx] <= '9'))) {
    digits += json[idx++];
  }

  if (digits.isEmpty()) {
    return fallback;
  }

  return digits.toInt();
}
} // namespace

void ApServer::begin(const DeviceIdentity& identity, ProvisioningStore& provisioningStore) {
  identity_ = &identity;
  provisioningStore_ = &provisioningStore;
  provisioningState_ = ProvisioningContract::ProvisioningState::Ready;
  completedProvisioning_ = false;
  provisioningAttemptStartedAtMs_ = 0;

  WiFi.persistent(true);
  WiFi.disconnect(false, false);
  delay(100);
  WiFi.mode(WIFI_AP_STA);
  delay(100);
  WiFi.softAP(identity_->apSsid().c_str(), nullptr, 1, false, 4);

  server_.on("/", HTTP_GET, [this]() {
    handleRoot_();
  });
  server_.on(ProvisioningContract::kInfoPath, HTTP_GET, [this]() {
    handleInfo_();
  });
  server_.on("/api/v1/provisioning/networks", HTTP_GET, [this]() {
    handleNetworks_();
  });
  server_.on(ProvisioningContract::kSessionPath, HTTP_POST, [this]() {
    handleSession_();
  });
  server_.begin();

  running_ = true;
  portalStarted_ = true;

  Serial.printf("AP server started on %s\n", identity_->apSsid().c_str());
  Serial.printf("AP IP: %s\n", WiFi.softAPIP().toString().c_str());
}

bool ApServer::isWifiConnected() const {
  return WiFi.status() == WL_CONNECTED;
}

void ApServer::loop() {
  if (!running_) {
    return;
  }

  server_.handleClient();

  if (provisioningState_ == ProvisioningContract::ProvisioningState::Busy) {
    if (WiFi.status() == WL_CONNECTED) {
      provisioningState_ = ProvisioningContract::ProvisioningState::Provisioned;
      completedProvisioning_ = true;

      Serial.printf("AP provisioning Wi-Fi connected: %s\n", WiFi.SSID().c_str());
      Serial.printf("STA IP: %s\n", WiFi.localIP().toString().c_str());

      stop();
      return;
    }

    if (millis() - provisioningAttemptStartedAtMs_ >= kWifiConnectTimeoutMs) {
      Serial.println("AP provisioning timed out waiting for Wi-Fi.");
      resetProvisioningAttempt_();
    }
  }
}

void ApServer::stop() {
  if (!running_) {
    return;
  }

  server_.stop();
  if (portalStarted_) {
    WiFi.softAPdisconnect(true);
    portalStarted_ = false;
  }
  running_ = false;

  Serial.println("AP server stopped");
}

void ApServer::resetForRecovery() {
  if (running_) {
    stop();
  }

  provisioningState_ = ProvisioningContract::ProvisioningState::Ready;
  completedProvisioning_ = false;
  provisioningAttemptStartedAtMs_ = 0;
}

void ApServer::handleRoot_() {
  String response = "<html><body style=\"background:#070707;color:#f2eee6;font-family:sans-serif;padding:24px;\">";
  response += "<h1>AddOne setup</h1>";
  response += "<p>Open the AddOne app to finish onboarding.</p>";
  response += "</body></html>";
  server_.send(200, "text/html", response);
}

void ApServer::handleInfo_() {
  sendJson_(200, buildInfoJson_());
}

void ApServer::handleNetworks_() {
  sendJson_(200, buildNetworksJson_());
}

void ApServer::handleSession_() {
  const String body = server_.arg("plain");
  if (body.isEmpty()) {
    sendJson_(400, buildSessionResponseJson_(false, "retry", false, "Provisioning payload missing."));
    return;
  }

  const long schemaVersion = extractJsonInt(body, "schema_version", -1);
  if (schemaVersion != ProvisioningContract::kSchemaVersion) {
    sendJson_(400, buildSessionResponseJson_(false, "retry", false, "Unsupported provisioning schema version."));
    return;
  }

  ProvisioningContract::PendingClaim claim;
  const String claimToken = extractJsonString(body, "claim_token");
  const String hardwareProfileHint = extractJsonString(body, "hardware_profile_hint");
  const String onboardingSessionId = extractJsonString(body, "onboarding_session_id");
  const String wifiPassword = extractJsonString(body, "wifi_password");
  const String wifiSsid = extractJsonString(body, "wifi_ssid");

  if (claimToken.isEmpty()) {
    sendJson_(400, buildSessionResponseJson_(false, "retry", false, "Claim token missing."));
    return;
  }

  if (onboardingSessionId.isEmpty()) {
    sendJson_(400, buildSessionResponseJson_(false, "retry", false, "Onboarding session id missing."));
    return;
  }

  if (wifiSsid.isEmpty()) {
    sendJson_(400, buildSessionResponseJson_(false, "retry", false, "Wi-Fi network name missing."));
    return;
  }

  if (provisioningState_ == ProvisioningContract::ProvisioningState::Busy) {
    Serial.println("Replacing active AP provisioning attempt.");
    WiFi.disconnect(false, false);
    delay(100);
  }

  strncpy(claim.claimToken, claimToken.c_str(), sizeof(claim.claimToken) - 1);
  claim.claimToken[sizeof(claim.claimToken) - 1] = '\0';
  strncpy(claim.hardwareProfileHint,
          hardwareProfileHint.isEmpty() ? Config::kHardwareProfile : hardwareProfileHint.c_str(),
          sizeof(claim.hardwareProfileHint) - 1);
  claim.hardwareProfileHint[sizeof(claim.hardwareProfileHint) - 1] = '\0';
  strncpy(claim.onboardingSessionId, onboardingSessionId.c_str(), sizeof(claim.onboardingSessionId) - 1);
  claim.onboardingSessionId[sizeof(claim.onboardingSessionId) - 1] = '\0';

  if (!provisioningStore_ || !provisioningStore_->savePendingClaim(claim)) {
    sendJson_(500, buildSessionResponseJson_(false, "retry", false, "Failed to persist onboarding claim."));
    return;
  }

  provisioningState_ = ProvisioningContract::ProvisioningState::Busy;
  completedProvisioning_ = false;
  provisioningAttemptStartedAtMs_ = millis();

  Serial.printf("AP provisioning accepted for session %s on SSID '%s'\n",
                claim.onboardingSessionId,
                wifiSsid.c_str());

  WiFi.mode(WIFI_AP_STA);
  delay(100);
  if (wifiPassword.isEmpty()) {
    WiFi.begin(wifiSsid.c_str());
  } else {
    WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  }

  sendJson_(200, buildSessionResponseJson_(true, "connect_to_cloud", true, "Provisioning accepted."));
}

String ApServer::buildNetworksJson_() {
  const int networkCount = WiFi.scanNetworks(false, false);
  String json = "{\"schema_version\":1,\"networks\":[";
  bool first = true;

  for (int index = 0; index < networkCount; index += 1) {
    const String ssid = WiFi.SSID(index);
    if (ssid.isEmpty()) {
      continue;
    }

    bool duplicate = false;
    for (int previous = 0; previous < index; previous += 1) {
      if (ssid == WiFi.SSID(previous)) {
        duplicate = true;
        break;
      }
    }

    if (duplicate) {
      continue;
    }

    if (!first) {
      json += ",";
    }

    json += "{\"ssid\":\"";
    json += escapeJson(ssid);
    json += "\",\"rssi\":";
    json += String(WiFi.RSSI(index));
    json += ",\"secure\":";
    json += WiFi.encryptionType(index) == WIFI_AUTH_OPEN ? "false" : "true";
    json += "}";
    first = false;
  }

  json += "]}";
  WiFi.scanDelete();
  return json;
}

void ApServer::resetProvisioningAttempt_() {
  provisioningState_ = ProvisioningContract::ProvisioningState::Ready;
  provisioningAttemptStartedAtMs_ = 0;
  completedProvisioning_ = false;
}

void ApServer::sendJson_(int statusCode, const String& body) {
  server_.send(statusCode, "application/json", body);
}

String ApServer::buildInfoJson_() const {
  String json = "{";
  json += "\"schema_version\":";
  json += String(ProvisioningContract::kSchemaVersion);
  json += ",\"device_ap_ssid\":\"";
  json += escapeJson(identity_ ? identity_->apSsid() : String("AddOne"));
  json += "\",\"hardware_profile\":\"";
  json += escapeJson(Config::kHardwareProfile);
  json += "\",\"firmware_version\":\"";
  json += escapeJson(Config::kFirmwareVersion);
  json += "\",\"provisioning_state\":\"";
  json += currentProvisioningStateName_();
  json += "\"}";
  return json;
}

String ApServer::buildSessionResponseJson_(bool accepted,
                                           const char* nextStep,
                                           bool rebootRequired,
                                           const String& message) const {
  String json = "{";
  json += "\"schema_version\":";
  json += String(ProvisioningContract::kSchemaVersion);
  json += ",\"accepted\":";
  json += accepted ? "true" : "false";
  json += ",\"next_step\":\"";
  json += nextStep ? nextStep : "retry";
  json += "\",\"reboot_required\":";
  json += rebootRequired ? "true" : "false";
  json += ",\"message\":\"";
  json += escapeJson(message);
  json += "\"}";
  return json;
}

String ApServer::currentProvisioningStateName_() const {
  switch (provisioningState_) {
    case ProvisioningContract::ProvisioningState::Busy:
      return "busy";
    case ProvisioningContract::ProvisioningState::Provisioned:
      return "provisioned";
    case ProvisioningContract::ProvisioningState::Ready:
    default:
      return "ready";
  }
}
