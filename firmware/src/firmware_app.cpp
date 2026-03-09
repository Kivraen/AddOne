#include "firmware_app.h"

#include "config.h"

namespace {
constexpr unsigned long kClaimRetryIntervalMs = 3000;
constexpr unsigned long kHeartbeatIntervalMs = 60000;

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
  lastClaimAttemptAtMs_ = 0;
  lastHeartbeatAtMs_ = 0;
  Serial.printf("State -> %s\n", stateName(nextState));
}

void FirmwareApp::tickSetupRecovery_() {
  if (!apServer_.isRunning() && !apServer_.hasCompletedProvisioning()) {
    apServer_.begin(identity_, provisioningStore_);
  }

  apServer_.loop();

  if (!apServer_.hasCompletedProvisioning() || !apServer_.isWifiConnected()) {
    return;
  }

  if (!provisioningStore_.hasPendingClaim()) {
    if (cloudClient_.isConfigured()) {
      enterState_(FirmwareState::Tracking);
    }
    return;
  }

  if (millis() - lastClaimAttemptAtMs_ < kClaimRetryIntervalMs) {
    return;
  }
  lastClaimAttemptAtMs_ = millis();

  ProvisioningContract::PendingClaim claim;
  if (!provisioningStore_.loadPendingClaim(claim)) {
    Serial.println("Pending claim metadata could not be loaded.");
    return;
  }

  if (!cloudClient_.isConfigured()) {
    Serial.println("Cloud config missing; claim redemption deferred.");
    return;
  }

  if (cloudClient_.redeemPendingClaim(claim)) {
    provisioningStore_.clearPendingClaim();
    enterState_(FirmwareState::Tracking);
  }
}

void FirmwareApp::tickTracking_() {
  if (!cloudClient_.isConfigured()) {
    return;
  }

  if (millis() - lastHeartbeatAtMs_ < kHeartbeatIntervalMs) {
    return;
  }
  lastHeartbeatAtMs_ = millis();
  cloudClient_.heartbeat();
}

void FirmwareApp::tickReward_() {
  if (millis() - enteredStateAtMs_ >= Config::kRewardAutoDismissMs) {
    enterState_(FirmwareState::Tracking);
  }
}
