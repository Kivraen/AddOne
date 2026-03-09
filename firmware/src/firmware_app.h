#pragma once

#include <Arduino.h>

#include "ap_server.h"
#include "cloud_client.h"
#include "device_identity.h"
#include "provisioning_store.h"

enum class FirmwareState : uint8_t {
  SetupRecovery = 0,
  Tracking = 1,
  Reward = 2,
};

class FirmwareApp {
public:
  void begin();
  void loop();

  FirmwareState state() const { return state_; }

private:
  void enterState_(FirmwareState nextState);
  void tickReward_();
  void tickSetupRecovery_();
  void tickTracking_();

  DeviceIdentity identity_{};
  FirmwareState state_ = FirmwareState::SetupRecovery;
  ApServer apServer_{};
  CloudClient cloudClient_{};
  ProvisioningStore provisioningStore_{};
  unsigned long enteredStateAtMs_ = 0;
  unsigned long lastClaimAttemptAtMs_ = 0;
  unsigned long lastHeartbeatAtMs_ = 0;
};
