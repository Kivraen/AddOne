#include "realtime_client.h"

#include <ArduinoJson.h>
#include <WiFi.h>

#include "cloud_config.h"
#include "config.h"

namespace {
constexpr unsigned long kReconnectIntervalMs = 3000;

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
}

void RealtimeClient::begin(const DeviceIdentity& identity) {
  identity_ = &identity;

  if (CloudConfig::kMqttUseTls) {
    if (CloudConfig::kMqttAllowInsecureTls) {
      secureClient_.setInsecure();
    }
    mqttClient_.setClient(secureClient_);
  } else {
    mqttClient_.setClient(wifiClient_);
  }

  mqttClient_.setServer(CloudConfig::kMqttBrokerHost, CloudConfig::kMqttBrokerPort);
  mqttClient_.setBufferSize(2048);
  mqttClient_.setCallback([this](char* topic, uint8_t* payload, unsigned int length) {
    handleMessage_(topic, payload, length);
  });
}

bool RealtimeClient::isConfigured() const {
  return identity_ && strlen(CloudConfig::kMqttBrokerHost) > 0 && strlen(CloudConfig::kMqttTopicPrefix) > 0;
}

bool RealtimeClient::isConnected() {
  return mqttClient_.connected();
}

void RealtimeClient::loop() {
  if (!isConfigured() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!mqttClient_.connected()) {
    if (millis() - lastConnectAttemptAtMs_ < kReconnectIntervalMs) {
      return;
    }

    lastConnectAttemptAtMs_ = millis();
    connect_();
    return;
  }

  mqttClient_.loop();
}

bool RealtimeClient::publishAck(const String& deviceAuthToken,
                                const String& commandId,
                                CloudClient::CommandAckStatus status,
                                const String& lastError) {
  if (deviceAuthToken.isEmpty() || commandId.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"command_id\":\"";
  payload += escapeJson(commandId);
  payload += "\",\"device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken);
  payload += "\",\"status\":\"";
  payload += ackStatusName_(status);
  payload += "\"";

  if (!lastError.isEmpty()) {
    payload += ",\"last_error\":\"";
    payload += escapeJson(lastError);
    payload += "\"";
  }

  payload += "}";
  return publishJson_(ackTopic_(), payload);
}

bool RealtimeClient::publishDayStateEvent(const String& deviceAuthToken, const CloudClient::DayStateRecord& record) {
  if (deviceAuthToken.isEmpty() || record.deviceEventId.isEmpty() || record.localDate.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken);
  payload += "\",\"device_event_id\":\"";
  payload += escapeJson(record.deviceEventId);
  payload += "\",\"local_date\":\"";
  payload += escapeJson(record.localDate);
  payload += "\",\"is_done\":";
  payload += record.isDone ? "true" : "false";

  if (!record.effectiveAt.isEmpty()) {
    payload += ",\"effective_at\":\"";
    payload += escapeJson(record.effectiveAt);
    payload += "\"";
  }

  payload += "}";
  return publishJson_(dayStateEventTopic_(), payload);
}

bool RealtimeClient::publishPresence(const String& deviceAuthToken,
                                     const String& firmwareVersion,
                                     const String& hardwareProfile,
                                     const String& lastSyncAt) {
  if (deviceAuthToken.isEmpty()) {
    return false;
  }

  String payload = "{";
  payload += "\"device_auth_token\":\"";
  payload += escapeJson(deviceAuthToken);
  payload += "\"";

  if (!firmwareVersion.isEmpty()) {
    payload += ",\"firmware_version\":\"";
    payload += escapeJson(firmwareVersion);
    payload += "\"";
  }

  if (!hardwareProfile.isEmpty()) {
    payload += ",\"hardware_profile\":\"";
    payload += escapeJson(hardwareProfile);
    payload += "\"";
  }

  if (!lastSyncAt.isEmpty()) {
    payload += ",\"last_sync_at\":\"";
    payload += escapeJson(lastSyncAt);
    payload += "\"";
  }

  payload += "}";
  return publishJson_(presenceTopic_(), payload);
}

bool RealtimeClient::popCommand(CloudClient::DeviceCommand& outCommand) {
  if (queueCount_ == 0) {
    return false;
  }

  outCommand = commandQueue_[0];
  for (size_t index = 1; index < queueCount_; ++index) {
    commandQueue_[index - 1] = commandQueue_[index];
  }
  commandQueue_[queueCount_ - 1] = CloudClient::DeviceCommand{};
  queueCount_--;
  return true;
}

bool RealtimeClient::connect_() {
  if (!identity_) {
    return false;
  }

  const char* username = strlen(CloudConfig::kMqttBrokerUsername) > 0 ? CloudConfig::kMqttBrokerUsername : nullptr;
  const char* password = strlen(CloudConfig::kMqttBrokerPassword) > 0 ? CloudConfig::kMqttBrokerPassword : nullptr;

  const bool connected = mqttClient_.connect(clientId_().c_str(), username, password);
  if (!connected) {
    Serial.printf("MQTT connect failed, state=%d\n", mqttClient_.state());
    return false;
  }

  const String topic = commandTopic_();
  if (!mqttClient_.subscribe(topic.c_str(), 1)) {
    Serial.println("MQTT subscribe failed.");
    mqttClient_.disconnect();
    return false;
  }

  Serial.printf("MQTT connected, subscribed to %s\n", topic.c_str());
  return true;
}

const char* RealtimeClient::ackStatusName_(CloudClient::CommandAckStatus status) const {
  switch (status) {
    case CloudClient::CommandAckStatus::Applied:
      return "applied";
    case CloudClient::CommandAckStatus::Cancelled:
      return "cancelled";
    case CloudClient::CommandAckStatus::Failed:
    default:
      return "failed";
  }
}

bool RealtimeClient::enqueueCommand_(const CloudClient::DeviceCommand& command) {
  for (size_t index = 0; index < queueCount_; ++index) {
    if (commandQueue_[index].id == command.id) {
      return true;
    }
  }

  if (replaceExistingQueuedCommand_(command)) {
    return true;
  }

  if (queueCount_ >= kCommandQueueSize) {
    Serial.println("MQTT command queue full.");
    return false;
  }

  commandQueue_[queueCount_++] = command;
  return true;
}

bool RealtimeClient::replaceExistingQueuedCommand_(const CloudClient::DeviceCommand& command) {
  for (size_t index = 0; index < queueCount_; ++index) {
    CloudClient::DeviceCommand& queued = commandQueue_[index];

    if (command.kind == "sync_settings" && queued.kind == "sync_settings") {
      queued = command;
      return true;
    }

    if (command.kind == "sync_day_states_batch" && queued.kind == "sync_day_states_batch") {
      queued = command;
      return true;
    }

    if (command.kind == "set_day_state" &&
        queued.kind == "set_day_state" &&
        !command.localDate.isEmpty() &&
        command.localDate == queued.localDate) {
      queued = command;
      return true;
    }
  }

  return false;
}

void RealtimeClient::handleMessage_(char* topic, uint8_t* payload, unsigned int length) {
  String body;
  body.reserve(length);
  for (unsigned int index = 0; index < length; ++index) {
    body += static_cast<char>(payload[index]);
  }

  CloudClient::DeviceCommand command;
  if (!parseCommand_(body, command)) {
    Serial.printf("MQTT command parse failed on %s\n", topic);
    return;
  }

  if (!enqueueCommand_(command)) {
    Serial.printf("MQTT command dropped on %s\n", topic);
    return;
  }

  Serial.printf("MQTT command queued: %s (%s)\n", command.id.c_str(), command.kind.c_str());
}

bool RealtimeClient::publishJson_(const String& topic, const String& payload) {
  if (!mqttClient_.connected()) {
    return false;
  }

  return mqttClient_.publish(topic.c_str(), payload.c_str());
}

bool RealtimeClient::parseCommand_(const String& payload, CloudClient::DeviceCommand& outCommand) const {
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.printf("MQTT JSON parse error: %s\n", error.c_str());
    return false;
  }

  JsonObjectConst root = doc.as<JsonObjectConst>();
  if (root.isNull()) {
    return false;
  }

  outCommand.id = root["id"] | "";
  outCommand.kind = root["kind"] | "";

  JsonObjectConst payloadJson = root["payload"].as<JsonObjectConst>();
  if (payloadJson.isNull()) {
    return !outCommand.id.isEmpty() && !outCommand.kind.isEmpty();
  }

  serializeJson(payloadJson, outCommand.batchPayloadJson);
  outCommand.localDate = payloadJson["local_date"] | "";
  outCommand.effectiveAt = payloadJson["effective_at"] | "";
  if (!payloadJson["is_done"].isNull()) {
    outCommand.isDone = payloadJson["is_done"].as<bool>();
    outCommand.hasSetDayStatePayload = !outCommand.localDate.isEmpty();
  }
  outCommand.hasBatchDayStatesPayload = payloadJson["updates"].is<JsonArrayConst>();

  outCommand.settingsSync.ambientAuto = payloadJson["ambient_auto"].isNull() ? true : payloadJson["ambient_auto"].as<bool>();
  outCommand.settingsSync.rewardEnabled = payloadJson["reward_enabled"].isNull() ? false : payloadJson["reward_enabled"].as<bool>();
  outCommand.settingsSync.dayResetTime = payloadJson["day_reset_time"] | "";
  outCommand.settingsSync.palettePreset = payloadJson["palette_preset"] | "";
  outCommand.settingsSync.rewardTrigger = payloadJson["reward_trigger"] | "";
  outCommand.settingsSync.rewardType = payloadJson["reward_type"] | "";
  outCommand.settingsSync.timezone = payloadJson["timezone"] | "";
  outCommand.settingsSync.brightness = payloadJson["brightness"].isNull() ? 70 : payloadJson["brightness"].as<uint8_t>();
  outCommand.settingsSync.weeklyTarget = payloadJson["weekly_target"].isNull()
                                             ? Config::kDefaultWeeklyMinimum
                                             : payloadJson["weekly_target"].as<uint8_t>();
  outCommand.hasSyncSettingsPayload =
      !outCommand.settingsSync.palettePreset.isEmpty() || !outCommand.settingsSync.timezone.isEmpty() || !outCommand.settingsSync.dayResetTime.isEmpty();

  return !outCommand.id.isEmpty() && !outCommand.kind.isEmpty();
}

String RealtimeClient::commandTopic_() const {
  String topic = CloudConfig::kMqttTopicPrefix;
  topic += "/device/";
  topic += identity_ ? identity_->hardwareUid() : String("unknown");
  topic += "/command";
  return topic;
}

String RealtimeClient::ackTopic_() const {
  String topic = CloudConfig::kMqttTopicPrefix;
  topic += "/device/";
  topic += identity_ ? identity_->hardwareUid() : String("unknown");
  topic += "/ack";
  return topic;
}

String RealtimeClient::dayStateEventTopic_() const {
  String topic = CloudConfig::kMqttTopicPrefix;
  topic += "/device/";
  topic += identity_ ? identity_->hardwareUid() : String("unknown");
  topic += "/event/day-state";
  return topic;
}

String RealtimeClient::presenceTopic_() const {
  String topic = CloudConfig::kMqttTopicPrefix;
  topic += "/device/";
  topic += identity_ ? identity_->hardwareUid() : String("unknown");
  topic += "/presence";
  return topic;
}

String RealtimeClient::clientId_() const {
  String clientId = "addone-";
  clientId += identity_ ? identity_->hardwareUid() : String("device");
  return clientId;
}
