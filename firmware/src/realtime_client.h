#pragma once

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

#include "cloud_client.h"
#include "device_identity.h"

class RealtimeClient {
public:
  void begin(const DeviceIdentity& identity, CloudClient& cloudClient);
  bool isConfigured() const;
  bool isConnected();
  void loop();
  bool publishAck(const String& deviceAuthToken,
                  const String& commandId,
                  CloudClient::CommandAckStatus status,
                  const String& lastError = "");
  bool publishPresence(const String& deviceAuthToken,
                       const String& firmwareVersion,
                       const String& hardwareProfile,
                       const String& lastSyncAt);
  bool publishFriendCelebrationReady(const String& deviceAuthToken,
                                     const String& sourceLocalDate,
                                     const HabitTracker::WeekDate& currentWeekStart,
                                     uint8_t todayRow,
                                     uint8_t weeklyTarget,
                                     const String& boardDaysJson,
                                     const String& palettePreset,
                                     const String& paletteCustomJson,
                                     const String& emittedAt);
  bool publishRuntimeSnapshot(const String& deviceAuthToken,
                              uint32_t revision,
                              const HabitTracker::WeekDate& currentWeekStart,
                              uint8_t todayRow,
                              const String& boardDaysJson,
                              const String& settingsJson,
                              const String& generatedAt);
  bool popCommand(CloudClient::DeviceCommand& outCommand);

private:
  static constexpr size_t kCommandQueueSize = 16;

  const char* ackStatusName_(CloudClient::CommandAckStatus status) const;
  bool configureSecureClient_();
  bool connect_();
  bool enqueueCommand_(const CloudClient::DeviceCommand& command);
  bool publishJson_(const String& topic, const String& payload);
  bool replaceExistingQueuedCommand_(const CloudClient::DeviceCommand& command);
  void handleMessage_(char* topic, uint8_t* payload, unsigned int length);
  bool parseCommand_(const String& payload, CloudClient::DeviceCommand& outCommand) const;

  String ackTopic_() const;
  String commandTopic_() const;
  String clientId_() const;
  String friendCelebrationReadyTopic_() const;
  String presenceTopic_() const;
  String runtimeSnapshotTopic_() const;

  CloudClient* cloudClient_ = nullptr;
  const DeviceIdentity* identity_ = nullptr;
  WiFiClient wifiClient_{};
  WiFiClientSecure secureClient_{};
  PubSubClient mqttClient_{};
  CloudClient::DeviceCommand commandQueue_[kCommandQueueSize]{};
  size_t queueCount_ = 0;
  unsigned long lastConnectAttemptAtMs_ = 0;
};
