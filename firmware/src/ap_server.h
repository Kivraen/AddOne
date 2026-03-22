#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>

#include "device_identity.h"
#include "provisioning_contract.h"
#include "provisioning_store.h"

class ApServer {
public:
  void begin(const DeviceIdentity& identity, ProvisioningStore& provisioningStore);
  bool hasCompletedProvisioning() const { return completedProvisioning_; }
  bool isWifiConnected() const;
  bool isRunning() const { return running_; }
  ProvisioningContract::ProvisioningState provisioningState() const { return provisioningState_; }
  void loop();
  void resetForRecovery();
  void stop();

private:
  String buildNetworksJson_(int* visibleNetworkCount = nullptr);
  void handleInfo_();
  void handleNetworks_();
  void handleRoot_();
  void handleSession_();
  void handleWifiEvent_(arduino_event_id_t event, arduino_event_info_t info);
  void resetProvisioningAttempt_();
  void sendJson_(int statusCode, const String& body);
  String buildInfoJson_() const;
  String describeAuthMode_(wifi_auth_mode_t authMode) const;
  String buildSessionResponseJson_(bool accepted, const char* nextStep, bool rebootRequired, const String& message) const;
  String currentProvisioningStateName_() const;
  String describeDisconnectReason_(uint8_t reason) const;

  static constexpr unsigned long kWifiConnectTimeoutMs = 60000;

  const DeviceIdentity* identity_ = nullptr;
  ProvisioningStore* provisioningStore_ = nullptr;
  ProvisioningContract::ProvisioningState provisioningState_ = ProvisioningContract::ProvisioningState::Ready;
  WebServer server_{80};
  bool completedProvisioning_ = false;
  bool portalStarted_ = false;
  unsigned long provisioningAttemptStartedAtMs_ = 0;
  bool running_ = false;
  String lastFailureReason_;
  wifi_event_id_t wifiEventHandlerId_ = 0;
};
