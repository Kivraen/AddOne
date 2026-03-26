#pragma once

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

#include "ambient_light.h"
#include "ap_server.h"
#include "board_renderer.h"
#include "button_input.h"
#include "cloud_client.h"
#include "device_settings.h"
#include "device_identity.h"
#include "habit_tracker.h"
#include "provisioning_store.h"
#include "realtime_client.h"
#include "reward_engine.h"
#include "time_service.h"

enum class FirmwareState : uint8_t {
  SetupRecovery = 0,
  Tracking = 1,
  Reward = 2,
  TimeInvalid = 3,
  FriendCelebration = 4,
};

class FirmwareApp {
public:
  void begin();
  void loop();

  FirmwareState state() const { return state_; }

private:
  struct IncomingCommand {
    CloudClient::DeviceCommand command{};
    bool occupied = false;
  };

  struct PendingCommandAck {
    String commandId{};
    String failureReason{};
    CloudClient::CommandAckStatus status = CloudClient::CommandAckStatus::Applied;
  };

  struct FactoryQaState {
    bool active = false;
    bool apSuppressed = false;
    bool available = false;
    bool buttonEventsEnabled = false;
    bool resetRequested = false;
    QaLedPattern ledPattern = QaLedPattern::Off;
    String inputBuffer{};
  };

  struct FriendCelebrationSenderState {
    String lastEmittedLocalDate{};
    String pendingLocalDate{};
    unsigned long emitExpiresAtMs = 0;
    unsigned long stableUntilMs = 0;
    bool pending = false;
  };

  struct FriendCelebrationPlaybackState {
    BoardFrame friendFrame{};
    BoardFrame ownerFrame{};
    BoardTransitionPlan transitionPlan{};
    unsigned long dissolveDurationMs = 0;
    unsigned long startedAtMs = 0;
    bool active = false;
  };

  struct AmbientBrightnessLogState {
    bool enabled = false;
    bool fsReady = false;
    unsigned long lastSampleAtMs = 0;
    size_t lastFileSizeBytes = 0;
    String activePath{};
    String lastError{};
  };

  struct AmbientBrightnessLogStatus {
    bool enabled = false;
    bool fsReady = false;
    unsigned long sampleIntervalMs = 0;
    uint32_t maxFileBytes = 0;
    uint32_t reserveBytes = 0;
    bool timeValid = false;
    FirmwareState state = FirmwareState::SetupRecovery;
    bool ambientAuto = true;
    uint8_t manualBrightnessSetting = 0;
    uint16_t rawSensor = 0;
    uint16_t smoothedSensor = 0;
    float normalizedSensor = 0.0f;
    uint8_t targetBrightness = 0;
    uint8_t actualBrightness = 0;
    String currentPath{};
    uint32_t lastFileSizeBytes = 0;
    String lastError{};
    bool hasFsStats = false;
    uint32_t fsTotalBytes = 0;
    uint32_t fsUsedBytes = 0;
  };

  struct AmbientBrightnessLogCommand {
    String id{};
    String cmd{};
    bool clearExisting = false;
    String requestedDate{};
    String requestedPath{};
  };

  static constexpr size_t kPendingCommandAckQueueSize = 16;
  static constexpr size_t kIncomingCommandQueueSize = 16;

  bool applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason);
  void beginWifiReconnect_();
  bool bootReadyForTracking_() const;
  unsigned long captureBootHoldDurationWithFeedback_();
  void clearPendingFriendCelebrationSenderStateLocked_();
  void performFactoryReset_(const char* reason, bool allowReconnectForCloudReport = false);
  static void syncTaskEntry_(void* context);
  bool copyRuntimeSnapshotPayload_(String& boardDaysJson,
                                   String& settingsJson,
                                   HabitTracker::WeekDate& currentWeekStart,
                                   uint8_t& todayRow,
                                   uint32_t& revision,
                                   String& generatedAt);
  bool dequeueIncomingCommand_(CloudClient::DeviceCommand& outCommand);
  bool dequeuePendingAck_(PendingCommandAck& outAck);
  void drainIncomingCommands_();
  void enterWifiRecoveryMode_();
  bool enqueueIncomingCommand_(const CloudClient::DeviceCommand& command);
  bool enqueuePendingAck_(const String& commandId, CloudClient::CommandAckStatus status, const String& failureReason);
  void enterState_(FirmwareState nextState);
  void emitFactoryQaButtonEvent_(const char* kind);
  void emitFactoryQaError_(const String& id, const char* cmd, const char* error);
  AmbientBrightnessLogStatus captureAmbientBrightnessLogStatus_() const;
  String formatAmbientLocalTimestamp_() const;
  String formatAmbientLogPath_(const String& localDate) const;
  void flushPendingCommandAcks_();
  bool flushRuntimeSnapshot_();
  bool handleFactoryQa_();
  bool handleAmbientBrightnessLogCommand_(const AmbientBrightnessLogCommand& command);
  bool hasAuthoritativeTime_() const;
  bool hasPendingAcks_();
  bool clearAmbientBrightnessLogs_(String& errorOut);
  void loadAmbientBrightnessLogPrefs_();
  bool mountAmbientBrightnessFs_();
  void migrateReadyForTrackingFlag_();
  void markRuntimeSnapshotDirty_();
  void pollCommands_();
  void processFactoryQaCommand_(const String& line);
  void processRealtimeCommands_();
  bool prepareTrackerForCurrentTime_();
  bool renderRecoveryVisualIfActive_(uint8_t brightness);
  void resetWifiReconnectPolicy_();
  void setRecoveryVisualStage_(RecoveryVisualStage stage);
  bool shouldProcessTrackingShortPress_();
  void startRecoveryVisualCompletion_();
  void syncTask_();
  bool setAmbientBrightnessLoggingEnabled_(bool enabled, String& errorOut);
  bool streamAmbientBrightnessLog_(const String& requestedDate, const String& requestedPath, String& errorOut);
  void tickFriendCelebration_();
  void tickAmbientBrightnessLogging_();
  void tickReward_();
  void tickSetupRecovery_();
  void tickTracking_();
  void tickTimeInvalid_();
  bool tickWifiReconnectPolicy_(bool allowRecoveryEscalation);
  bool tryEmitFriendCelebration_();
  bool tryReconnectForFactoryResetReport_(uint32_t nextResetEpoch);
  void updateFriendCelebrationSenderStateLocked_(const tm& logicalNow);
  unsigned long wifiReconnectBackoffMs_(uint8_t attemptNumber) const;
  bool writeAmbientBrightnessLogRow_();

  BoardRenderer boardRenderer_{};
  ButtonInput buttonInput_{};
  DeviceIdentity identity_{};
  volatile FirmwareState state_ = FirmwareState::SetupRecovery;
  ApServer apServer_{};
  AmbientLight ambientLight_{};
  CloudClient cloudClient_{};
  DeviceSettingsStore deviceSettings_{};
  HabitTracker habitTracker_{};
  ProvisioningStore provisioningStore_{};
  RealtimeClient realtimeClient_{};
  RewardEngine rewardEngine_{};
  TimeService timeService_{};
  IncomingCommand incomingCommands_[kIncomingCommandQueueSize]{};
  PendingCommandAck pendingCommandAcks_[kPendingCommandAckQueueSize]{};
  size_t pendingCommandAckCount_ = 0;
  size_t incomingCommandCount_ = 0;
  SemaphoreHandle_t queueMutex_ = nullptr;
  SemaphoreHandle_t stateMutex_ = nullptr;
  TaskHandle_t syncTaskHandle_ = nullptr;
  unsigned long enteredStateAtMs_ = 0;
  unsigned long lastClaimAttemptAtMs_ = 0;
  unsigned long lastCommandPollAtMs_ = 0;
  unsigned long lastRuntimeSnapshotAttemptAtMs_ = 0;
  unsigned long lastHeartbeatAtMs_ = 0;
  unsigned long lastLocalInteractionAtMs_ = 0;
  unsigned long ignoreRecoveryCommandsUntilMs_ = 0;
  unsigned long nextWifiReconnectAttemptAtMs_ = 0;
  unsigned long wifiReconnectAttemptStartedAtMs_ = 0;
  FriendCelebrationSenderState friendCelebrationSender_{};
  FriendCelebrationPlaybackState friendCelebrationPlayback_{};
  AmbientBrightnessLogState ambientBrightnessLog_{};
  bool recoveryRequestedAtBoot_ = false;
  bool factoryQaRequestedAtBoot_ = false;
  bool factoryResetRequestedAtBoot_ = false;
  bool recoveryRequestedAtRuntime_ = false;
  bool deferredShortPressAfterFriendCelebration_ = false;
  bool pendingFactoryReset_ = false;
  volatile bool runtimeSnapshotDirty_ = true;
  bool lastWifiConnected_ = false;
  bool wifiReconnectAttemptActive_ = false;
  bool wifiReconnectExhausted_ = false;
  bool recoveryVisualActive_ = false;
  uint8_t wifiReconnectAttemptCount_ = 0;
  RecoveryVisualStage recoveryVisualStage_ = RecoveryVisualStage::PortalReady;
  unsigned long recoveryVisualUntilMs_ = 0;
  FactoryQaState factoryQa_{};
};
