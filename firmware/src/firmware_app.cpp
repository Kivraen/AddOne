#include "firmware_app.h"

#include "config.h"

namespace {
const char* stateName(FirmwareState state) {
  switch (state) {
    case FirmwareState::SetupRecovery:
      return "SetupRecovery";
    case FirmwareState::Tracking:
      return "Tracking";
    case FirmwareState::Reward:
      return "Reward";
    default:
      return "Unknown";
  }
}
} // namespace

void FirmwareApp::begin() {
  provisioningStore_.begin();
  cloudClient_.begin(identity_);

  Serial.printf("AddOne firmware %s\n", Config::kFirmwareVersion);
  Serial.printf("Hardware UID: %s\n", identity_.hardwareUid().c_str());
  Serial.printf("AP SSID: %s\n", identity_.apSsid().c_str());
  Serial.printf("Pending claim present: %s\n", provisioningStore_.hasPendingClaim() ? "yes" : "no");

  enterState_(FirmwareState::SetupRecovery);
}

void FirmwareApp::loop() {
  switch (state_) {
    case FirmwareState::SetupRecovery:
      tickSetupRecovery_();
      break;
    case FirmwareState::Tracking:
      tickTracking_();
      break;
    case FirmwareState::Reward:
      tickReward_();
      break;
  }
}

void FirmwareApp::enterState_(FirmwareState nextState) {
  state_ = nextState;
  enteredStateAtMs_ = millis();
  Serial.printf("State -> %s\n", stateName(nextState));
}

void FirmwareApp::tickSetupRecovery_() {
  if (!apServer_.isRunning()) {
    apServer_.begin(identity_, provisioningStore_);
  }

  apServer_.loop();
}

void FirmwareApp::tickTracking_() {
  // Placeholder only: single-button habit tracking comes after onboarding/cloud.
}

void FirmwareApp::tickReward_() {
  if (millis() - enteredStateAtMs_ >= Config::kRewardAutoDismissMs) {
    enterState_(FirmwareState::Tracking);
  }
}
