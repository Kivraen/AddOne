#pragma once

#include <Arduino.h>

#include "ambient_light.h"
#include "ap_server.h"
#include "board_renderer.h"
#include "button_input.h"
#include "cloud_client.h"
#include "device_settings.h"
#include "device_identity.h"
#include "habit_tracker.h"
#include "provisioning_store.h"
#include "reward_engine.h"
#include "time_service.h"

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
  bool applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason);
  void beginWifiReconnect_();
  void enterState_(FirmwareState nextState);
  void flushPendingDeviceEvent_();
  void pollCommands_();
  void tickReward_();
  void tickSetupRecovery_();
  void tickTracking_();

  BoardRenderer boardRenderer_{};
  ButtonInput buttonInput_{};
  DeviceIdentity identity_{};
  FirmwareState state_ = FirmwareState::SetupRecovery;
  ApServer apServer_{};
  AmbientLight ambientLight_{};
  CloudClient cloudClient_{};
  DeviceSettingsStore deviceSettings_{};
  HabitTracker habitTracker_{};
  ProvisioningStore provisioningStore_{};
  RewardEngine rewardEngine_{};
  TimeService timeService_{};
  unsigned long enteredStateAtMs_ = 0;
  unsigned long lastClaimAttemptAtMs_ = 0;
  unsigned long lastCommandPollAtMs_ = 0;
  unsigned long lastDeviceSyncAttemptAtMs_ = 0;
  unsigned long lastHeartbeatAtMs_ = 0;
  bool recoveryRequestedAtBoot_ = false;
  bool wifiReconnectStarted_ = false;
  bool waitingForApFallback_ = false;
  unsigned long wifiReconnectStartedAtMs_ = 0;
};
