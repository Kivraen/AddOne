#pragma once

#include <Arduino.h>
#include <WebServer.h>

#include "device_identity.h"
#include "provisioning_contract.h"
#include "provisioning_store.h"

class ApServer {
public:
  void begin(const DeviceIdentity& identity, ProvisioningStore& provisioningStore);
  bool hasCompletedProvisioning() const { return completedProvisioning_; }
  bool isWifiConnected() const;
  bool isRunning() const { return running_; }
  void loop();
  void stop();

private:
  String buildNetworksJson_();
  void handleInfo_();
  void handleNetworks_();
  void handleRoot_();
  void handleSession_();
  void resetProvisioningAttempt_();
  void sendJson_(int statusCode, const String& body);
  String buildInfoJson_() const;
  String buildSessionResponseJson_(bool accepted, const char* nextStep, bool rebootRequired, const String& message) const;
  String currentProvisioningStateName_() const;

  static constexpr unsigned long kWifiConnectTimeoutMs = 60000;

  const DeviceIdentity* identity_ = nullptr;
  ProvisioningStore* provisioningStore_ = nullptr;
  ProvisioningContract::ProvisioningState provisioningState_ = ProvisioningContract::ProvisioningState::Ready;
  WebServer server_{80};
  bool completedProvisioning_ = false;
  bool portalStarted_ = false;
  unsigned long provisioningAttemptStartedAtMs_ = 0;
  bool running_ = false;
};
