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
  recoveryRequestedAtBoot_ = ButtonInput::recoveryHeldAtBoot();
  buttonInput_.begin();
  boardRenderer_.begin();
  habitTracker_.begin();
  provisioningStore_.begin();
  cloudClient_.begin(identity_);
  timeService_.begin();

  Serial.printf("AddOne firmware %s\n", Config::kFirmwareVersion);
  Serial.printf("Hardware UID: %s\n", identity_.hardwareUid().c_str());
  Serial.printf("AP SSID: %s\n", identity_.apSsid().c_str());
  Serial.printf("Pending claim present: %s\n", provisioningStore_.hasPendingClaim() ? "yes" : "no");
  Serial.printf("Recovery requested at boot: %s\n", recoveryRequestedAtBoot_ ? "yes" : "no");

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
  waitingForApFallback_ = false;
  wifiReconnectStarted_ = false;
  wifiReconnectStartedAtMs_ = 0;
  Serial.printf("State -> %s\n", stateName(nextState));
}

bool FirmwareApp::applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason) {
  tm nowLocal{};
  if (!timeService_.nowLocal(nowLocal)) {
    failureReason = "Local time is unavailable.";
    return false;
  }

  if (command.kind == "set_day_state") {
    if (!command.hasSetDayStatePayload || command.localDate.isEmpty()) {
      failureReason = "set_day_state payload missing local_date or is_done.";
      return false;
    }

    if (!habitTracker_.applyCloudState(command.localDate, command.isDone, command.effectiveAt, nowLocal)) {
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

void FirmwareApp::beginWifiReconnect_() {
  if (wifiReconnectStarted_) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin();
  wifiReconnectStarted_ = true;
  wifiReconnectStartedAtMs_ = millis();
  Serial.println("Attempting reconnect with stored Wi-Fi credentials.");
}

void FirmwareApp::tickSetupRecovery_() {
  timeService_.update(WiFi.status() == WL_CONNECTED);

  if (!provisioningStore_.hasPendingClaim() && !apServer_.isRunning()) {
    beginWifiReconnect_();
  }

  if (wifiReconnectStarted_ && WiFi.status() == WL_CONNECTED && !provisioningStore_.hasPendingClaim()) {
    enterState_(FirmwareState::Tracking);
    return;
  }

  if (!apServer_.isRunning() && !apServer_.hasCompletedProvisioning()) {
    const bool reconnectTimedOut =
        wifiReconnectStarted_ && (millis() - wifiReconnectStartedAtMs_ >= Config::kWifiReconnectTimeoutMs);
    const bool forceRecovery =
        recoveryRequestedAtBoot_ || !wifiReconnectStarted_ || waitingForApFallback_ || reconnectTimedOut || provisioningStore_.hasPendingClaim();

    if (forceRecovery) {
      apServer_.begin(identity_, provisioningStore_);
      waitingForApFallback_ = true;
    }
  }

  if (apServer_.isRunning()) {
    apServer_.loop();
  }
  boardRenderer_.renderSetupState(apServer_.isRunning(), WiFi.status() == WL_CONNECTED);

  if (!apServer_.hasCompletedProvisioning() || !apServer_.isWifiConnected()) {
    return;
  }

  if (!provisioningStore_.hasPendingClaim()) {
    enterState_(FirmwareState::Tracking);
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
  buttonInput_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);

  tm nowLocal{};
  if (timeService_.nowLocal(nowLocal)) {
    habitTracker_.checkWeekBoundary(nowLocal);

    if (buttonInput_.consumeShortPress()) {
      bool isDone = false;
      const String effectiveAt = timeService_.currentUtcIsoTimestamp();
      if (habitTracker_.queueLocalToggleToday(nowLocal, effectiveAt, isDone)) {
        Serial.printf("Local toggle for %s -> %s\n",
                      timeService_.currentLocalDate().c_str(),
                      isDone ? "done" : "not_done");
      }
    }

    boardRenderer_.render(habitTracker_, &nowLocal);
  } else {
    boardRenderer_.renderSetupState(false, WiFi.status() == WL_CONNECTED);
  }

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
