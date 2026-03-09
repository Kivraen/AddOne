#include "firmware_app.h"

#include <WiFi.h>

#include "config.h"

namespace {
constexpr unsigned long kClaimRetryIntervalMs = 3000;
constexpr unsigned long kCommandPollIntervalMs = 10000;
constexpr unsigned long kDeviceSyncIntervalMs = 5000;
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
  habitTracker_.begin();
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
  lastCommandPollAtMs_ = 0;
  lastDeviceSyncAttemptAtMs_ = 0;
  lastHeartbeatAtMs_ = 0;
  Serial.printf("State -> %s\n", stateName(nextState));
}

bool FirmwareApp::applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason) {
  if (command.kind == "set_day_state") {
    if (!command.hasSetDayStatePayload || command.localDate.isEmpty()) {
      failureReason = "set_day_state payload missing local_date or is_done.";
      return false;
    }

    if (!habitTracker_.applyCloudState(command.localDate, command.isDone, command.effectiveAt)) {
      failureReason = "Failed to apply cloud day state locally.";
      return false;
    }

    Serial.printf("Applied cloud day state %s -> %s\n",
                  command.localDate.c_str(),
                  command.isDone ? "done" : "not_done");
    return true;
  }

  if (command.kind == "sync_settings") {
    failureReason = "sync_settings is not implemented yet.";
    return false;
  }

  failureReason = "Unsupported command kind.";
  return false;
}

void FirmwareApp::flushPendingDeviceEvent_() {
  HabitTracker::PendingDeviceEvent pendingEvent;
  if (!habitTracker_.pendingDeviceEvent(pendingEvent)) {
    return;
  }

  CloudClient::DayStateRecord record;
  record.deviceEventId = pendingEvent.deviceEventId;
  record.effectiveAt = pendingEvent.effectiveAt;
  record.localDate = pendingEvent.localDate;
  record.isDone = pendingEvent.isDone;

  if (!cloudClient_.recordDayState(record)) {
    Serial.println("Pending day-state sync failed.");
    return;
  }

  habitTracker_.markPendingDeviceEventSynced();
  Serial.printf("Synced local day event %s for %s\n",
                pendingEvent.deviceEventId.c_str(),
                pendingEvent.localDate.c_str());
}

void FirmwareApp::pollCommands_() {
  CloudClient::DeviceCommand commands[4];
  size_t commandCount = 0;
  if (!cloudClient_.pullCommands(commands, 4, commandCount)) {
    return;
  }

  for (size_t index = 0; index < commandCount; ++index) {
    String failureReason;
    const bool applied = applyCloudCommand_(commands[index], failureReason);
    const CloudClient::CommandAckStatus ackStatus =
        applied ? CloudClient::CommandAckStatus::Applied : CloudClient::CommandAckStatus::Failed;

    if (!cloudClient_.ackCommand(commands[index].id, ackStatus, failureReason)) {
      Serial.printf("Failed to ack command %s\n", commands[index].id.c_str());
      continue;
    }

    Serial.printf("Acked command %s as %s\n",
                  commands[index].id.c_str(),
                  applied ? "applied" : "failed");
  }
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
  if (!cloudClient_.isConfigured() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (millis() - lastDeviceSyncAttemptAtMs_ >= kDeviceSyncIntervalMs) {
    lastDeviceSyncAttemptAtMs_ = millis();
    flushPendingDeviceEvent_();
  }

  if (millis() - lastCommandPollAtMs_ >= kCommandPollIntervalMs) {
    lastCommandPollAtMs_ = millis();
    pollCommands_();
  }

  if (millis() - lastHeartbeatAtMs_ >= kHeartbeatIntervalMs) {
    lastHeartbeatAtMs_ = millis();
    cloudClient_.heartbeat();
  }
}

void FirmwareApp::tickReward_() {
  if (millis() - enteredStateAtMs_ >= Config::kRewardAutoDismissMs) {
    enterState_(FirmwareState::Tracking);
  }
}
