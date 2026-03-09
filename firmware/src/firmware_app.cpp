#include "firmware_app.h"

#include <ArduinoJson.h>
#include <WiFi.h>

#include "cloud_config.h"
#include "config.h"

namespace {
constexpr unsigned long kClaimRetryIntervalMs = 3000;
constexpr unsigned long kFallbackCommandPollWhenNoRealtimeMs = 5000;
constexpr unsigned long kDeviceSyncIntervalMs = 250;
constexpr unsigned long kHeartbeatIntervalMs = 60000;
constexpr unsigned long kCloudFallbackQuietPeriodMs = 1500;

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
  deviceSettings_.begin();
  ambientLight_.begin();
  boardRenderer_.begin();
  habitTracker_.begin();
  habitTracker_.setMinimum(deviceSettings_.current().weeklyTarget);
  provisioningStore_.begin();
  cloudClient_.begin(identity_);
  realtimeClient_.begin(identity_);
  timeService_.begin();
  timeService_.applySettings(deviceSettings_.current());
  rewardEngine_.clear();

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
  lastLocalInteractionAtMs_ = 0;
  waitingForApFallback_ = false;
  wifiReconnectStarted_ = false;
  wifiReconnectStartedAtMs_ = 0;
  if (nextState != FirmwareState::Reward) {
    rewardEngine_.clear();
  }
  Serial.printf("State -> %s\n", stateName(nextState));
}

bool FirmwareApp::enqueuePendingAck_(const String& commandId,
                                     CloudClient::CommandAckStatus status,
                                     const String& failureReason) {
  for (size_t index = 0; index < pendingCommandAckCount_; ++index) {
    if (pendingCommandAcks_[index].commandId == commandId) {
      pendingCommandAcks_[index].status = status;
      pendingCommandAcks_[index].failureReason = failureReason;
      return true;
    }
  }

  if (pendingCommandAckCount_ >= kPendingCommandAckQueueSize) {
    Serial.println("Pending ack queue full.");
    return false;
  }

  PendingCommandAck& pending = pendingCommandAcks_[pendingCommandAckCount_++];
  pending.commandId = commandId;
  pending.status = status;
  pending.failureReason = failureReason;
  return true;
}

void FirmwareApp::flushPendingCommandAcks_() {
  if (WiFi.status() != WL_CONNECTED || pendingCommandAckCount_ == 0) {
    return;
  }

  const PendingCommandAck pending = pendingCommandAcks_[0];
  const bool acked =
      realtimeClient_.isConnected()
          ? realtimeClient_.publishAck(cloudClient_.deviceAuthToken(), pending.commandId, pending.status, pending.failureReason)
          : cloudClient_.ackCommand(pending.commandId, pending.status, pending.failureReason);
  if (!acked) {
    Serial.printf("Failed to ack command %s\n", pending.commandId.c_str());
    return;
  }

  Serial.printf("Acked command %s as %s\n",
                pending.commandId.c_str(),
                pending.status == CloudClient::CommandAckStatus::Applied ? "applied" :
                pending.status == CloudClient::CommandAckStatus::Failed ? "failed" : "cancelled");

  for (size_t index = 1; index < pendingCommandAckCount_; ++index) {
    pendingCommandAcks_[index - 1] = pendingCommandAcks_[index];
  }
  pendingCommandAcks_[pendingCommandAckCount_ - 1] = PendingCommandAck{};
  pendingCommandAckCount_--;
}

bool FirmwareApp::applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason) {
  if (command.kind == "sync_day_states_batch") {
    if (!command.hasBatchDayStatesPayload || command.batchPayloadJson.isEmpty()) {
      failureReason = "sync_day_states_batch payload missing updates.";
      return false;
    }

    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, command.batchPayloadJson);
    if (error) {
      failureReason = "Failed to parse batch history payload.";
      return false;
    }

    JsonArrayConst updates = doc["updates"].as<JsonArrayConst>();
    if (updates.isNull()) {
      failureReason = "Batch history payload missing updates array.";
      return false;
    }

    tm nowLogical{};
    if (!timeService_.nowLogical(nowLogical)) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    for (JsonObjectConst update : updates) {
      const String localDate = update["local_date"] | "";
      if (localDate.isEmpty() || update["is_done"].isNull()) {
        continue;
      }

      const bool isDone = update["is_done"].as<bool>();
      const String effectiveAt = update["effective_at"] | command.effectiveAt;
      if (!habitTracker_.applyCloudState(localDate, isDone, effectiveAt, nowLogical)) {
        failureReason = "Failed to apply one or more batch day states locally.";
        return false;
      }
    }

    Serial.println("Applied cloud batch history sync.");
    return true;
  }

  if (command.kind == "set_day_state") {
    tm nowLogical{};
    if (!timeService_.nowLogical(nowLogical)) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    if (!command.hasSetDayStatePayload || command.localDate.isEmpty()) {
      failureReason = "set_day_state payload missing local_date or is_done.";
      return false;
    }

    if (!habitTracker_.applyCloudState(command.localDate, command.isDone, command.effectiveAt, nowLogical)) {
      failureReason = "Failed to apply cloud day state locally.";
      return false;
    }

    Serial.printf("Applied cloud day state %s -> %s\n",
                  command.localDate.c_str(),
                  command.isDone ? "done" : "not_done");
    return true;
  }

  if (command.kind == "sync_settings") {
    if (!command.hasSyncSettingsPayload) {
      failureReason = "sync_settings payload missing required fields.";
      return false;
    }

    if (!deviceSettings_.applySync(command.settingsSync, failureReason)) {
      if (failureReason.isEmpty()) {
        failureReason = "Failed to persist device settings.";
      }
      return false;
    }

    habitTracker_.setMinimum(deviceSettings_.current().weeklyTarget);
    timeService_.applySettings(deviceSettings_.current());
    Serial.println("Applied cloud settings sync.");
    return true;
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

  const bool synced =
      realtimeClient_.isConnected()
          ? realtimeClient_.publishDayStateEvent(cloudClient_.deviceAuthToken(), record)
          : cloudClient_.recordDayState(record);
  if (!synced) {
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

    enqueuePendingAck_(commands[index].id, ackStatus, failureReason);
  }
}

void FirmwareApp::processRealtimeCommands_() {
  CloudClient::DeviceCommand command;
  while (realtimeClient_.popCommand(command)) {
    String failureReason;
    const bool applied = applyCloudCommand_(command, failureReason);
    const CloudClient::CommandAckStatus ackStatus =
        applied ? CloudClient::CommandAckStatus::Applied : CloudClient::CommandAckStatus::Failed;

    enqueuePendingAck_(command.id, ackStatus, failureReason);
  }
}

void FirmwareApp::beginWifiReconnect_() {
  if (wifiReconnectStarted_) {
    return;
  }

  WiFi.mode(WIFI_STA);
  if (strlen(CloudConfig::kBootstrapWifiSsid) > 0) {
    WiFi.begin(CloudConfig::kBootstrapWifiSsid, CloudConfig::kBootstrapWifiPassword);
    Serial.printf("Attempting bootstrap Wi-Fi '%s'.\n", CloudConfig::kBootstrapWifiSsid);
  } else {
    WiFi.begin();
    Serial.println("Attempting reconnect with stored Wi-Fi credentials.");
  }
  wifiReconnectStarted_ = true;
  wifiReconnectStartedAtMs_ = millis();
}

void FirmwareApp::tickSetupRecovery_() {
  ambientLight_.loop();
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
  const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  boardRenderer_.renderSetupState(apServer_.isRunning(), WiFi.status() == WL_CONNECTED, brightness);

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
    pollCommands_();
    enterState_(FirmwareState::Tracking);
  }
}

void FirmwareApp::tickTracking_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  realtimeClient_.loop();
  processRealtimeCommands_();

  tm logicalNow{};
  if (timeService_.nowLogical(logicalNow)) {
    habitTracker_.checkWeekBoundary(logicalNow);

    if (buttonInput_.consumeShortPress()) {
      bool isDone = false;
      const int8_t weekSuccessBefore = habitTracker_.currentWeekSuccess();
      const String effectiveAt = timeService_.currentUtcIsoTimestamp();
      if (habitTracker_.queueLocalToggleToday(logicalNow, effectiveAt, isDone)) {
        lastLocalInteractionAtMs_ = millis();
        Serial.printf("Local toggle for %s -> %s\n",
                      timeService_.currentLogicalDate().c_str(),
                      isDone ? "done" : "not_done");
        if (realtimeClient_.isConnected()) {
          flushPendingDeviceEvent_();
        }

        const int8_t weekSuccessAfter = habitTracker_.currentWeekSuccess();
        if (rewardEngine_.shouldTrigger(deviceSettings_.current(), isDone, weekSuccessBefore, weekSuccessAfter)) {
          rewardEngine_.start(deviceSettings_.current());
          enterState_(FirmwareState::Reward);
          return;
        }
      }
    }

    const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
    boardRenderer_.render(habitTracker_, deviceSettings_.current(), &logicalNow, brightness);
  } else {
    const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
    boardRenderer_.renderSetupState(false, WiFi.status() == WL_CONNECTED, brightness);
  }

  if (!cloudClient_.isConfigured() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  const bool realtimeConnected = realtimeClient_.isConnected();
  const bool quietForFallback = millis() - lastLocalInteractionAtMs_ >= kCloudFallbackQuietPeriodMs;

  if (millis() - lastDeviceSyncAttemptAtMs_ >= kDeviceSyncIntervalMs) {
    const bool canFlushPendingEvent = realtimeConnected || quietForFallback;
    if (habitTracker_.hasPendingDeviceEvent() && canFlushPendingEvent) {
      lastDeviceSyncAttemptAtMs_ = millis();
      flushPendingDeviceEvent_();
    }
  }

  if (realtimeConnected || quietForFallback) {
    flushPendingCommandAcks_();
  }

  const bool shouldUseHttpFallback = !realtimeConnected;
  if (shouldUseHttpFallback &&
      quietForFallback &&
      millis() - lastCommandPollAtMs_ >= kFallbackCommandPollWhenNoRealtimeMs) {
    lastCommandPollAtMs_ = millis();
    pollCommands_();
  }

  if (millis() - lastHeartbeatAtMs_ >= kHeartbeatIntervalMs) {
    lastHeartbeatAtMs_ = millis();
    if (!realtimeConnected ||
        !realtimeClient_.publishPresence(
            cloudClient_.deviceAuthToken(),
            String(Config::kFirmwareVersion),
            String(Config::kHardwareProfile),
            timeService_.currentUtcIsoTimestamp())) {
      if (quietForFallback) {
        cloudClient_.heartbeat();
      }
    }
  }
}

void FirmwareApp::tickReward_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  realtimeClient_.loop();
  processRealtimeCommands_();

  if (buttonInput_.consumeShortPress() || rewardEngine_.shouldDismiss()) {
    enterState_(FirmwareState::Tracking);
    return;
  }

  tm logicalNow{};
  const tm* logicalNowPtr = timeService_.nowLogical(logicalNow) ? &logicalNow : nullptr;
  const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  boardRenderer_.renderReward(deviceSettings_.current(),
                              rewardEngine_.type(),
                              logicalNowPtr,
                              rewardEngine_.elapsedMs(),
                              brightness);

  if (realtimeClient_.isConnected()) {
    flushPendingCommandAcks_();
  }
}
