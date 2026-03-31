#include "firmware_app.h"

#include <ArduinoJson.h>
#include <WiFi.h>

#include "cloud_config.h"
#include "config.h"

namespace {
constexpr unsigned long kClaimRetryIntervalMs = 3000;
constexpr unsigned long kFallbackCommandPollWhenNoRealtimeMs = 5000;
constexpr unsigned long kRuntimeSnapshotSyncIntervalMs = 250;
constexpr unsigned long kHeartbeatIntervalMs = 60000;
constexpr unsigned long kCloudFallbackQuietPeriodMs = 1500;
constexpr unsigned long kRecoveryCommandCooldownMs = 15000;
constexpr unsigned long kRecoveryVisualCompletionMs = 1800;
constexpr unsigned long kRecoveryVisualFailureMs = 1100;
constexpr unsigned long kFactoryResetReconnectTimeoutMs = 6000;
constexpr unsigned long kFactoryResetReconnectPollMs = 100;
constexpr uint8_t kWifiReconnectMaxAttempts = 3;
constexpr size_t kFactoryQaCommandCapacity = 768;

enum class FriendCelebrationSpeed : uint8_t {
  VeryFast = 0,
  Fast = 1,
  Balanced = 2,
  Slow = 3,
  EvenSlower = 4,
};

unsigned long friendCelebrationTransitionDuration(FriendCelebrationSpeed speed, const BoardTransitionPlan& plan) {
  if (plan.changedPixelCount == 0) {
    return 0;
  }

  switch (speed) {
    case FriendCelebrationSpeed::VeryFast:
      return 500;
    case FriendCelebrationSpeed::Fast:
      return 1000;
    case FriendCelebrationSpeed::Balanced:
      return 2000;
    case FriendCelebrationSpeed::Slow:
      return 4600;
    case FriendCelebrationSpeed::EvenSlower:
      return 12200;
  }

  return 2000;
}

FriendCelebrationSpeed parseFriendCelebrationSpeed(const String& value) {
  if (value == "very_fast") {
    return FriendCelebrationSpeed::VeryFast;
  }

  if (value == "fast") {
    return FriendCelebrationSpeed::Fast;
  }

  if (value == "slow") {
    return FriendCelebrationSpeed::Slow;
  }

  if (value == "even_slower") {
    return FriendCelebrationSpeed::EvenSlower;
  }

  return FriendCelebrationSpeed::Balanced;
}

const char* friendCelebrationSpeedLabel(FriendCelebrationSpeed speed) {
  switch (speed) {
    case FriendCelebrationSpeed::VeryFast:
      return "very_fast";
    case FriendCelebrationSpeed::Fast:
      return "fast";
    case FriendCelebrationSpeed::Balanced:
      return "balanced";
    case FriendCelebrationSpeed::Slow:
      return "slow";
    case FriendCelebrationSpeed::EvenSlower:
      return "even_slower";
  }

  return "balanced";
}

BoardTransitionStyle parseFriendCelebrationTransitionStyle(const String& value) {
  if (value == "reverse_wipe") {
    return BoardTransitionStyle::ReverseWipe;
  }

  if (value == "center_split") {
    return BoardTransitionStyle::CenterSplit;
  }

  if (value == "top_drop") {
    return BoardTransitionStyle::TopDrop;
  }

  if (value == "diagonal_wave") {
    return BoardTransitionStyle::DiagonalWave;
  }

  if (value == "constellation") {
    return BoardTransitionStyle::Constellation;
  }

  if (value == "bottom_rise") {
    return BoardTransitionStyle::BottomRise;
  }

  if (value == "edge_close") {
    return BoardTransitionStyle::EdgeClose;
  }

  if (value == "reverse_diagonal") {
    return BoardTransitionStyle::ReverseDiagonal;
  }

  if (value == "matrix_rain") {
    return BoardTransitionStyle::MatrixRain;
  }

  if (value == "venetian") {
    return BoardTransitionStyle::Venetian;
  }

  if (value == "pulse_ring") {
    return BoardTransitionStyle::PulseRing;
  }

  if (value == "laser_scan") {
    return BoardTransitionStyle::LaserScan;
  }

  if (value == "spiral_collapse") {
    return BoardTransitionStyle::SpiralCollapse;
  }

  if (value == "glitch_overwrite") {
    return BoardTransitionStyle::GlitchOverwrite;
  }

  if (value == "comet_overwrite") {
    return BoardTransitionStyle::CometOverwrite;
  }

  return BoardTransitionStyle::ColumnWipe;
}

unsigned long parseFriendCelebrationDwellMs(JsonDocument& doc) {
  const int dwellSeconds = doc["dwell_seconds"] | static_cast<int>(Config::kFriendCelebrationDwellMs / 1000);
  const int clampedSeconds = dwellSeconds < 1 ? 1 : (dwellSeconds > 60 ? 60 : dwellSeconds);
  return static_cast<unsigned long>(clampedSeconds) * 1000UL;
}

bool parseWeekDateString(const String& input, HabitTracker::WeekDate& outDate) {
  int year = 0;
  int month = 0;
  int day = 0;
  if (sscanf(input.c_str(), "%d-%d-%d", &year, &month, &day) != 3) {
    return false;
  }

  outDate.year = year;
  outDate.month = month;
  outDate.day = day;
  return true;
}

void populateSettingsSyncPayload(JsonObjectConst settingsObject, DeviceSettingsSyncPayload& payload) {
  payload.hasAmbientAuto = !settingsObject["ambient_auto"].isNull();
  payload.hasBrightness = !settingsObject["brightness"].isNull();
  payload.hasDayResetTime = !settingsObject["day_reset_time"].isNull();
  payload.hasName = !settingsObject["name"].isNull();
  payload.hasPaletteCustom = settingsObject.containsKey("palette_custom") && settingsObject["palette_custom"].is<JsonObjectConst>();
  payload.hasPalettePreset = !settingsObject["palette_preset"].isNull();
  payload.hasRewardEnabled = !settingsObject["reward_enabled"].isNull();
  payload.hasRewardTrigger = !settingsObject["reward_trigger"].isNull();
  payload.hasRewardType = !settingsObject["reward_type"].isNull();
  payload.hasTimezone = !settingsObject["timezone"].isNull();
  payload.hasWeeklyTarget = !settingsObject["weekly_target"].isNull();

  payload.ambientAuto = payload.hasAmbientAuto ? settingsObject["ambient_auto"].as<bool>() : true;
  payload.rewardEnabled = payload.hasRewardEnabled ? settingsObject["reward_enabled"].as<bool>() : false;
  payload.dayResetTime = settingsObject["day_reset_time"] | "";
  payload.name = settingsObject["name"] | "";
  if (payload.hasPaletteCustom) {
    serializeJson(settingsObject["palette_custom"], payload.paletteCustomJson);
  } else {
    payload.paletteCustomJson = "";
  }
  payload.palettePreset = settingsObject["palette_preset"] | "";
  payload.rewardTrigger = settingsObject["reward_trigger"] | "";
  payload.rewardType = settingsObject["reward_type"] | "";
  payload.timezone = settingsObject["timezone"] | "";
  payload.brightness = payload.hasBrightness ? settingsObject["brightness"].as<uint8_t>() : 70;
  payload.weeklyTarget = payload.hasWeeklyTarget ? settingsObject["weekly_target"].as<uint8_t>() : Config::kDefaultWeeklyMinimum;
}

const char* stateName(FirmwareState state) {
  switch (state) {
    case FirmwareState::SetupRecovery:
      return "SetupRecovery";
    case FirmwareState::Tracking:
      return "Tracking";
    case FirmwareState::Reward:
      return "Reward";
    case FirmwareState::TimeInvalid:
      return "TimeInvalid";
    case FirmwareState::FriendCelebration:
      return "FriendCelebration";
    default:
      return "Unknown";
  }
}

const char* recoveryVisualStageName(RecoveryVisualStage stage) {
  switch (stage) {
    case RecoveryVisualStage::PortalReady:
      return "PortalReady";
    case RecoveryVisualStage::CredentialsReceived:
      return "CredentialsReceived";
    case RecoveryVisualStage::WifiConnected:
      return "WifiConnected";
    case RecoveryVisualStage::CloudConnected:
      return "CloudConnected";
    case RecoveryVisualStage::RestoreApplied:
      return "RestoreApplied";
    case RecoveryVisualStage::Failed:
      return "Failed";
    default:
      return "Unknown";
  }
}

String buildBoardDaysJson(const HabitTracker& tracker) {
  DynamicJsonDocument doc(4096);
  JsonArray weeks = doc.to<JsonArray>();
  const HabitTracker::WeeklyGrid& grid = tracker.grid();

  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    JsonArray weekDays = weeks.createNestedArray();
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      weekDays.add(grid.days[day][week]);
    }
  }

  String json;
  serializeJson(weeks, json);
  return json;
}

String buildBoardDaysJson(const HabitTracker::WeeklyGrid& grid) {
  DynamicJsonDocument doc(4096);
  JsonArray weeks = doc.to<JsonArray>();

  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    JsonArray weekDays = weeks.createNestedArray();
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      weekDays.add(grid.days[day][week]);
    }
  }

  String json;
  serializeJson(weeks, json);
  return json;
}

String buildSettingsJson(const DeviceSettingsState& settings) {
  DynamicJsonDocument doc(768);
  doc["ambient_auto"] = settings.ambientAuto;
  doc["brightness"] = settings.brightness;
  doc["day_reset_time"] = settings.dayResetTime;
  doc["name"] = settings.name;
  doc["palette_preset"] = settings.palettePreset;
  doc["reward_enabled"] = settings.rewardEnabled;
  doc["reward_trigger"] = settings.rewardTrigger == RewardTrigger::Weekly ? "weekly" : "daily";
  doc["reward_type"] = settings.rewardType == RewardType::Clock ? "clock" : "paint";
  doc["timezone"] = settings.timezone;
  doc["weekly_target"] = settings.weeklyTarget;
  DynamicJsonDocument paletteCustomDoc(384);
  if (deserializeJson(paletteCustomDoc, settings.paletteCustomJson) == DeserializationError::Ok && paletteCustomDoc.is<JsonObject>()) {
    doc["palette_custom"] = paletteCustomDoc.as<JsonObject>();
  } else {
    doc.createNestedObject("palette_custom");
  }

  String json;
  serializeJson(doc, json);
  return json;
}
} // namespace

void FirmwareApp::migrateReadyForTrackingFlag_() {
  if (!provisioningStore_.hasPendingClaim() &&
      !provisioningStore_.isReadyForTracking() &&
      cloudClient_.hasPersistedDeviceAuthToken()) {
    provisioningStore_.markReadyForTracking();
    Serial.println("Migrated device into ready-for-tracking state.");
  }
}

bool FirmwareApp::bootReadyForTracking_() const {
  return provisioningStore_.isReadyForTracking() && !provisioningStore_.hasPendingClaim();
}

bool FirmwareApp::hasAuthoritativeTime_() const {
  return timeService_.hasAuthoritativeTime();
}

bool FirmwareApp::prepareTrackerForCurrentTime_() {
  tm logicalNow{};
  if (!timeService_.nowLogical(logicalNow)) {
    return false;
  }

  return habitTracker_.checkWeekBoundary(logicalNow);
}

void FirmwareApp::resetWifiReconnectPolicy_() {
  nextWifiReconnectAttemptAtMs_ = 0;
  wifiReconnectAttemptStartedAtMs_ = 0;
  wifiReconnectAttemptActive_ = false;
  wifiReconnectAttemptCount_ = 0;
  wifiReconnectExhausted_ = false;
}

unsigned long FirmwareApp::wifiReconnectBackoffMs_(uint8_t attemptNumber) const {
  if (attemptNumber <= 1) {
    return 5000;
  }
  if (attemptNumber == 2) {
    return 15000;
  }
  return 30000;
}

bool FirmwareApp::tickWifiReconnectPolicy_(bool allowRecoveryEscalation) {
  if (apServer_.isRunning() || !cloudClient_.isConfigured()) {
    return false;
  }

  const bool wifiConnected = WiFi.status() == WL_CONNECTED;
  if (wifiConnected) {
    if (!lastWifiConnected_) {
      Serial.println("Wi-Fi connected.");
      markRuntimeSnapshotDirty_();
    }
    lastWifiConnected_ = true;
    resetWifiReconnectPolicy_();
    return false;
  }

  lastWifiConnected_ = false;

  if (wifiReconnectAttemptActive_) {
    if (millis() - wifiReconnectAttemptStartedAtMs_ < Config::kWifiReconnectTimeoutMs) {
      return false;
    }

    wifiReconnectAttemptActive_ = false;
    WiFi.disconnect(false, false);

    if (wifiReconnectAttemptCount_ >= kWifiReconnectMaxAttempts) {
      wifiReconnectExhausted_ = true;
      Serial.println("Wi-Fi reconnect attempts exhausted.");
      return allowRecoveryEscalation;
    }

    nextWifiReconnectAttemptAtMs_ = millis() + wifiReconnectBackoffMs_(wifiReconnectAttemptCount_);
    return false;
  }

  if (wifiReconnectExhausted_ || millis() < nextWifiReconnectAttemptAtMs_) {
    return false;
  }

  beginWifiReconnect_();
  return false;
}

unsigned long FirmwareApp::captureBootHoldDurationWithFeedback_() {
  pinMode(Config::kButtonPin, INPUT_PULLUP);
  if (digitalRead(Config::kButtonPin) == HIGH) {
    return 0;
  }

  const unsigned long startedAtMs = millis();
  for (;;) {
    const unsigned long heldMs = millis() - startedAtMs;
    const bool factoryResetReady = heldMs >= Config::kFactoryResetHoldMs;
    const bool recoveryReady = heldMs >= Config::kRecoveryHoldMs;
    const ResetHoldVisualStage stage =
        factoryResetReady ? ResetHoldVisualStage::FactoryResetReady
                          : recoveryReady ? ResetHoldVisualStage::RecoveryReady
                                          : ResetHoldVisualStage::Holding;
    boardRenderer_.renderResetHoldState(stage, Config::kDefaultBrightness);

    if (digitalRead(Config::kButtonPin) == HIGH) {
      return heldMs;
    }

    if (factoryResetReady) {
      return Config::kFactoryResetHoldMs;
    }

    delay(16);
  }
}

void FirmwareApp::begin() {
  boardRenderer_.begin();
  factoryQa_.inputBuffer.reserve(256);
  const unsigned long bootHoldDurationMs = captureBootHoldDurationWithFeedback_();
  factoryQaRequestedAtBoot_ =
      bootHoldDurationMs >= Config::kFactoryQaArmHoldMs &&
      bootHoldDurationMs < Config::kRecoveryHoldMs;
  recoveryRequestedAtBoot_ =
      bootHoldDurationMs >= Config::kRecoveryHoldMs &&
      bootHoldDurationMs < Config::kFactoryResetHoldMs;
  factoryResetRequestedAtBoot_ = bootHoldDurationMs >= Config::kFactoryResetHoldMs;
  buttonInput_.begin();
  deviceSettings_.begin();
  ambientLight_.begin();
  habitTracker_.begin();
  habitTracker_.setMinimum(deviceSettings_.current().weeklyTarget);
  provisioningStore_.begin();
  const bool freshFactoryBoard = !provisioningStore_.hasPendingClaim() && !provisioningStore_.isReadyForTracking();
  factoryQa_.available = factoryQaRequestedAtBoot_ || freshFactoryBoard;
  cloudClient_.begin(identity_);
  otaClient_.begin(identity_, cloudClient_);
  timeService_.begin();
  timeService_.applySettings(deviceSettings_.current());
  if (factoryResetRequestedAtBoot_) {
    performFactoryReset_("Boot-time factory reset requested.", true);
    return;
  }
  migrateReadyForTrackingFlag_();
  realtimeClient_.begin(identity_, cloudClient_);
  rewardEngine_.clear();

  const bool trackerShiftedAtBoot = bootReadyForTracking_() && hasAuthoritativeTime_() && prepareTrackerForCurrentTime_();
  if (trackerShiftedAtBoot) {
    runtimeSnapshotDirty_ = true;
  }

  queueMutex_ = xSemaphoreCreateMutex();
  stateMutex_ = xSemaphoreCreateMutex();
  if (!queueMutex_ || !stateMutex_) {
    Serial.println("Failed to create firmware mutexes.");
  }

  Serial.printf("AddOne firmware %s\n", Config::kFirmwareVersion);
  Serial.printf("Hardware UID: %s\n", identity_.hardwareUid().c_str());
  Serial.printf("AP SSID: %s\n", identity_.apSsid().c_str());
  Serial.printf("Pending claim present: %s\n", provisioningStore_.hasPendingClaim() ? "yes" : "no");
  Serial.printf("Ready for tracking: %s\n", provisioningStore_.isReadyForTracking() ? "yes" : "no");
  Serial.printf("Authoritative time available: %s\n", hasAuthoritativeTime_() ? "yes" : "no");
  Serial.printf("Factory QA available: %s\n", factoryQa_.available ? "yes" : "no");
  Serial.printf("Factory QA armed at boot: %s\n", factoryQaRequestedAtBoot_ ? "yes" : "no");
  Serial.printf("Recovery requested at boot: %s\n", recoveryRequestedAtBoot_ ? "yes" : "no");
  Serial.printf("Factory reset requested at boot: %s\n", factoryResetRequestedAtBoot_ ? "yes" : "no");
  Serial.printf("Current reset epoch: %lu\n", static_cast<unsigned long>(provisioningStore_.resetEpoch()));
  Serial.printf("Confirmed OTA release: %s\n",
                otaClient_.confirmedReleaseId().isEmpty() ? "(none)" : otaClient_.confirmedReleaseId().c_str());

  boardRenderer_.playStartupAnimation(deviceSettings_.resolveBrightness(ambientLight_.normalized01()));

  if (recoveryRequestedAtBoot_ || provisioningStore_.hasPendingClaim() || !bootReadyForTracking_()) {
    enterState_(FirmwareState::SetupRecovery);
  } else if (!hasAuthoritativeTime_()) {
    enterState_(FirmwareState::TimeInvalid);
  } else {
    enterState_(FirmwareState::Tracking);
  }

  if (queueMutex_ && stateMutex_ && !syncTaskHandle_) {
    // Resolve the initial firmware state before the sync task evaluates OTA
    // confirmation health gates, or pending images can be judged against the
    // default SetupRecovery state during boot.
    xTaskCreatePinnedToCore(syncTaskEntry_, "addone_sync", 16384, this, 1, &syncTaskHandle_, 0);
  }
}

void FirmwareApp::loop() {
  if (handleFactoryQa_()) {
    return;
  }

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
    case FirmwareState::TimeInvalid:
      tickTimeInvalid_();
      break;
    case FirmwareState::FriendCelebration:
      tickFriendCelebration_();
      break;
  }
}

void FirmwareApp::emitFactoryQaError_(const String& id, const char* cmd, const char* error) {
  DynamicJsonDocument responseDoc(256);
  responseDoc["type"] = "qa_response";
  responseDoc["id"] = id;
  responseDoc["cmd"] = cmd ? cmd : "";
  responseDoc["ok"] = false;
  responseDoc["error"] = error ? error : "Unknown QA error.";
  serializeJson(responseDoc, Serial);
  Serial.println();
}

void FirmwareApp::emitFactoryQaButtonEvent_(const char* kind) {
  DynamicJsonDocument eventDoc(256);
  eventDoc["type"] = "qa_event";
  eventDoc["event"] = "button";
  eventDoc["kind"] = kind ? kind : "unknown";
  eventDoc["at_ms"] = millis();
  serializeJson(eventDoc, Serial);
  Serial.println();
}

void FirmwareApp::processFactoryQaCommand_(const String& line) {
  DynamicJsonDocument commandDoc(kFactoryQaCommandCapacity);
  const DeserializationError error = deserializeJson(commandDoc, line);
  if (error || !commandDoc.is<JsonObjectConst>()) {
    emitFactoryQaError_("", "", "Invalid QA command.");
    return;
  }

  const String id = commandDoc["id"] | "";
  const char* cmd = commandDoc["cmd"] | "";
  if (!cmd || cmd[0] == '\0') {
    emitFactoryQaError_(id, cmd, "QA command name is required.");
    return;
  }

  DynamicJsonDocument responseDoc(kFactoryQaCommandCapacity);
  responseDoc["type"] = "qa_response";
  responseDoc["id"] = id;
  responseDoc["cmd"] = cmd;
  responseDoc["ok"] = true;
  JsonObject result = responseDoc.createNestedObject("result");

  if (strcmp(cmd, "qa_status") == 0) {
    result["available"] = factoryQa_.available;
    result["active"] = factoryQa_.active;
    result["required_hold_ms"] = Config::kFactoryQaArmHoldMs;
    result["state"] = stateName(state_);
    serializeJson(responseDoc, Serial);
    Serial.println();
    return;
  }

  if (!factoryQa_.available) {
    emitFactoryQaError_(id,
                        cmd,
                        "Factory QA access is unavailable on this boot.");
    return;
  }

  if (strcmp(cmd, "qa_exit") == 0) {
    factoryQa_.active = false;
    factoryQa_.buttonEventsEnabled = false;
    factoryQa_.ledPattern = QaLedPattern::Off;
    factoryQa_.apSuppressed = false;
    result["active"] = false;
    serializeJson(responseDoc, Serial);
    Serial.println();
    return;
  }

  factoryQa_.active = true;

  if (strcmp(cmd, "device_info") == 0) {
    result["hardware_uid"] = identity_.hardwareUid();
    result["ap_ssid"] = identity_.apSsid();
    result["firmware_version"] = Config::kFirmwareVersion;
    result["hardware_profile"] = Config::kHardwareProfile;
    result["state"] = stateName(state_);
    result["pending_claim"] = provisioningStore_.hasPendingClaim();
    result["ready_for_tracking"] = provisioningStore_.isReadyForTracking();
    result["reset_epoch"] = provisioningStore_.resetEpoch();
    result["rtc_present"] = timeService_.isRtcPresent();
    result["rtc_lost_power"] = timeService_.rtcLostPower();
    result["ambient_raw"] = ambientLight_.raw();
    result["ambient_filtered_raw"] = ambientLight_.filteredRaw();
    result["ambient_normalized"] = ambientLight_.normalized01();
  } else if (strcmp(cmd, "button_test") == 0) {
    const bool enabled = commandDoc["enabled"].isNull() ? true : commandDoc["enabled"].as<bool>();
    while (buttonInput_.consumeShortPress()) {
    }
    while (buttonInput_.consumeLongHold()) {
    }
    factoryQa_.buttonEventsEnabled = enabled;
    result["enabled"] = enabled;
  } else if (strcmp(cmd, "led_test") == 0) {
    const char* pattern = commandDoc["pattern"] | "";
    if (strcmp(pattern, "white") == 0) {
      factoryQa_.ledPattern = QaLedPattern::White;
    } else if (strcmp(pattern, "red") == 0) {
      factoryQa_.ledPattern = QaLedPattern::Red;
    } else if (strcmp(pattern, "green") == 0) {
      factoryQa_.ledPattern = QaLedPattern::Green;
    } else if (strcmp(pattern, "blue") == 0) {
      factoryQa_.ledPattern = QaLedPattern::Blue;
    } else if (strcmp(pattern, "mapping") == 0) {
      factoryQa_.ledPattern = QaLedPattern::Mapping;
    } else if (strcmp(pattern, "off") == 0 || pattern[0] == '\0') {
      factoryQa_.ledPattern = QaLedPattern::Off;
    } else {
      emitFactoryQaError_(id, cmd, "Unsupported LED QA pattern.");
      return;
    }
    result["pattern"] = pattern[0] == '\0' ? "off" : pattern;
  } else if (strcmp(cmd, "ambient_sample") == 0) {
    result["raw"] = ambientLight_.raw();
    result["filtered_raw"] = ambientLight_.filteredRaw();
    result["normalized"] = ambientLight_.normalized01();
  } else if (strcmp(cmd, "rtc_status") == 0) {
    result["present"] = timeService_.isRtcPresent();
    result["lost_power"] = timeService_.rtcLostPower();
    time_t rtcUtc = 0;
    if (timeService_.readRtcUtc(rtcUtc)) {
      result["rtc_epoch"] = static_cast<int64_t>(rtcUtc);
    } else {
      result["rtc_epoch"] = nullptr;
    }
    result["system_utc"] = static_cast<int64_t>(timeService_.currentUtc());
  } else if (strcmp(cmd, "rtc_set") == 0) {
    if (commandDoc["epoch"].isNull()) {
      emitFactoryQaError_(id, cmd, "RTC epoch is required.");
      return;
    }
    const int64_t epoch = commandDoc["epoch"].as<int64_t>();
    if (epoch <= 0) {
      emitFactoryQaError_(id, cmd, "RTC epoch must be positive.");
      return;
    }
    if (!timeService_.setRtcUtc(static_cast<time_t>(epoch))) {
      emitFactoryQaError_(id, cmd, "RTC time could not be written.");
      return;
    }
    result["rtc_epoch"] = epoch;
  } else if (strcmp(cmd, "rtc_read") == 0) {
    time_t rtcUtc = 0;
    if (!timeService_.readRtcUtc(rtcUtc)) {
      emitFactoryQaError_(id, cmd, "RTC time is not available.");
      return;
    }
    result["rtc_epoch"] = static_cast<int64_t>(rtcUtc);
    result["lost_power"] = timeService_.rtcLostPower();
  } else if (strcmp(cmd, "factory_reset") == 0) {
    factoryQa_.resetRequested = true;
    result["accepted"] = true;
  } else {
    emitFactoryQaError_(id, cmd, "Unsupported QA command.");
    return;
  }

  serializeJson(responseDoc, Serial);
  Serial.println();
}

bool FirmwareApp::handleFactoryQa_() {
  while (Serial.available() > 0) {
    const char next = static_cast<char>(Serial.read());
    if (next == '\r') {
      continue;
    }
    if (next == '\n') {
      if (!factoryQa_.inputBuffer.isEmpty()) {
        const String commandLine = factoryQa_.inputBuffer;
        factoryQa_.inputBuffer = "";
        processFactoryQaCommand_(commandLine);
      }
      continue;
    }
    if (factoryQa_.inputBuffer.length() < 512) {
      factoryQa_.inputBuffer += next;
    }
  }

  if (!factoryQa_.active) {
    return false;
  }

  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);

  if (!factoryQa_.apSuppressed && apServer_.isRunning()) {
    apServer_.stop();
    factoryQa_.apSuppressed = true;
  }

  if (factoryQa_.buttonEventsEnabled) {
    while (buttonInput_.consumeShortPress()) {
      emitFactoryQaButtonEvent_("short_press");
    }
    while (buttonInput_.consumeLongHold()) {
      emitFactoryQaButtonEvent_("long_hold");
    }
  } else {
    while (buttonInput_.consumeShortPress()) {
    }
    while (buttonInput_.consumeLongHold()) {
    }
  }

  boardRenderer_.renderQaPattern(factoryQa_.ledPattern, Config::kSafeMaxBrightness, millis());

  if (factoryQa_.resetRequested) {
    factoryQa_.active = false;
    factoryQa_.available = false;
    factoryQa_.buttonEventsEnabled = false;
    factoryQa_.ledPattern = QaLedPattern::Off;
    factoryQa_.resetRequested = false;
    factoryQa_.apSuppressed = false;
    performFactoryReset_("Factory QA requested reset.", false);
    return true;
  }

  return true;
}

void FirmwareApp::enterState_(FirmwareState nextState) {
  state_ = nextState;
  enteredStateAtMs_ = millis();
  lastClaimAttemptAtMs_ = 0;
  lastCommandPollAtMs_ = 0;
  lastRuntimeSnapshotAttemptAtMs_ = 0;
  lastHeartbeatAtMs_ = 0;
  lastLocalInteractionAtMs_ = 0;
  resetWifiReconnectPolicy_();
  if (nextState == FirmwareState::Tracking) {
    runtimeSnapshotDirty_ = true;
  }
  if (nextState != FirmwareState::Tracking && nextState != FirmwareState::TimeInvalid) {
    onboardingVisualActive_ = false;
    onboardingVisualActivatedAtMs_ = 0;
  }
  if (nextState == FirmwareState::SetupRecovery) {
    onboardingVisualActive_ = false;
    onboardingVisualActivatedAtMs_ = 0;
    recoveryVisualActive_ = true;
    recoveryVisualStage_ = RecoveryVisualStage::PortalReady;
    recoveryVisualUntilMs_ = 0;
  }
  if (nextState == FirmwareState::FriendCelebration) {
    friendCelebrationPlayback_.active = true;
  } else {
    friendCelebrationPlayback_.active = false;
  }
  if (nextState != FirmwareState::Reward) {
    rewardEngine_.clear();
  }
  Serial.printf("State -> %s\n", stateName(nextState));
}

void FirmwareApp::markRuntimeSnapshotDirty_() {
  runtimeSnapshotDirty_ = true;
}

void FirmwareApp::dismissOnboardingVisual_(bool playExitAnimation) {
  if (!onboardingVisualActive_) {
    return;
  }

  if (playExitAnimation) {
    boardRenderer_.playStartupAnimation(deviceSettings_.resolveBrightness(ambientLight_.normalized01()));
  }

  const unsigned long visibleForMs =
      onboardingVisualActivatedAtMs_ > 0 ? millis() - onboardingVisualActivatedAtMs_ : 0;
  onboardingVisualActive_ = false;
  onboardingVisualActivatedAtMs_ = 0;
  Serial.printf("Onboarding visual dismissed after %lu ms.\n", visibleForMs);
}

void FirmwareApp::clearPendingFriendCelebrationSenderStateLocked_() {
  friendCelebrationSender_.pending = false;
  friendCelebrationSender_.pendingLocalDate = "";
  friendCelebrationSender_.stableUntilMs = 0;
  friendCelebrationSender_.emitExpiresAtMs = 0;
}

void FirmwareApp::updateFriendCelebrationSenderStateLocked_(const tm& logicalNow) {
  const String logicalDate = timeService_.currentLogicalDate();
  if (logicalDate.isEmpty()) {
    clearPendingFriendCelebrationSenderStateLocked_();
    return;
  }

  if (friendCelebrationSender_.pending && friendCelebrationSender_.pendingLocalDate != logicalDate) {
    clearPendingFriendCelebrationSenderStateLocked_();
  }

  const uint8_t todayRow = habitTracker_.todayRow(logicalNow);
  const bool todayDone = habitTracker_.grid().days[todayRow][0];
  if (!todayDone) {
    clearPendingFriendCelebrationSenderStateLocked_();
    return;
  }

  if (friendCelebrationSender_.lastEmittedLocalDate == logicalDate) {
    clearPendingFriendCelebrationSenderStateLocked_();
    return;
  }

  if (!friendCelebrationSender_.pending) {
    friendCelebrationSender_.pending = true;
    friendCelebrationSender_.pendingLocalDate = logicalDate;
    friendCelebrationSender_.stableUntilMs = millis() + Config::kFriendCelebrationStableMs;
    friendCelebrationSender_.emitExpiresAtMs =
        friendCelebrationSender_.stableUntilMs + Config::kFriendCelebrationEmitWindowMs;
    Serial.printf("Friend celebration armed for %s\n", logicalDate.c_str());
  }
}

void FirmwareApp::setRecoveryVisualStage_(RecoveryVisualStage stage) {
  if (recoveryVisualActive_ && recoveryVisualStage_ == stage) {
    return;
  }

  recoveryVisualActive_ = true;
  recoveryVisualStage_ = stage;
  if (stage != RecoveryVisualStage::RestoreApplied) {
    recoveryVisualUntilMs_ = 0;
  }
  Serial.printf("Recovery visual -> %s\n", recoveryVisualStageName(stage));
}

void FirmwareApp::startRecoveryVisualCompletion_() {
  recoveryVisualActive_ = true;
  recoveryVisualStage_ = RecoveryVisualStage::RestoreApplied;
  recoveryVisualUntilMs_ = millis() + kRecoveryVisualCompletionMs;
  Serial.printf("Recovery visual -> %s\n", recoveryVisualStageName(recoveryVisualStage_));
}

bool FirmwareApp::renderOnboardingVisualIfActive_(uint8_t brightness) {
  if (!onboardingVisualActive_) {
    return false;
  }

  boardRenderer_.renderOnboardingHoldState(WiFi.status() == WL_CONNECTED, brightness);
  return true;
}

bool FirmwareApp::renderRecoveryVisualIfActive_(uint8_t brightness) {
  if (!recoveryVisualActive_) {
    return false;
  }

  if ((recoveryVisualStage_ == RecoveryVisualStage::CloudConnected ||
       recoveryVisualStage_ == RecoveryVisualStage::RestoreApplied) &&
      recoveryVisualUntilMs_ > 0 &&
      millis() >= recoveryVisualUntilMs_) {
    recoveryVisualActive_ = false;
    recoveryVisualUntilMs_ = 0;
    return false;
  }

  boardRenderer_.renderRecoveryState(recoveryVisualStage_, brightness);
  return true;
}

bool FirmwareApp::tryEmitFriendCelebration_() {
  if (!hasAuthoritativeTime_()) {
    return false;
  }

  String boardDaysJson;
  String emittedAt;
  String paletteCustomJson;
  String palettePreset;
  String sourceLocalDate;
  HabitTracker::WeekDate currentWeekStart{};
  uint8_t todayRow = 0;
  uint8_t weeklyTarget = Config::kDefaultWeeklyMinimum;

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  bool readyToPublish = false;
  tm logicalNow{};
  if (timeService_.nowLogical(logicalNow)) {
    updateFriendCelebrationSenderStateLocked_(logicalNow);
    if (friendCelebrationSender_.pending) {
      if (millis() > friendCelebrationSender_.emitExpiresAtMs) {
        Serial.println("Friend celebration expired before delivery.");
        clearPendingFriendCelebrationSenderStateLocked_();
      } else if (millis() >= friendCelebrationSender_.stableUntilMs) {
        DeviceSettingsState settings = deviceSettings_.current();
        HabitTracker::WeekDate weekStart{};
        if (habitTracker_.currentWeekStart(weekStart)) {
          boardDaysJson = buildBoardDaysJson(habitTracker_.grid());
          emittedAt = timeService_.currentUtcIsoTimestamp();
          paletteCustomJson = settings.paletteCustomJson;
          palettePreset = settings.palettePreset;
          sourceLocalDate = friendCelebrationSender_.pendingLocalDate;
          currentWeekStart = weekStart;
          todayRow = habitTracker_.todayRow(logicalNow);
          weeklyTarget = settings.weeklyTarget;
          readyToPublish = !emittedAt.isEmpty() && !sourceLocalDate.isEmpty();
        }
      }
    }
  } else {
    clearPendingFriendCelebrationSenderStateLocked_();
  }

  if (stateMutex_) {
    xSemaphoreGive(stateMutex_);
  }

  if (!readyToPublish) {
    return false;
  }

  bool published = false;
  if (realtimeClient_.isConnected()) {
    published = realtimeClient_.publishFriendCelebrationReady(
        cloudClient_.deviceAuthToken(),
        sourceLocalDate,
        currentWeekStart,
        todayRow,
        weeklyTarget,
        boardDaysJson,
        palettePreset,
        paletteCustomJson,
        emittedAt);
  }

  if (!published) {
    published = cloudClient_.queueFriendCelebration(
        sourceLocalDate,
        currentWeekStart,
        todayRow,
        weeklyTarget,
        boardDaysJson,
        palettePreset,
        paletteCustomJson,
        emittedAt);
  }
  if (!published) {
    return false;
  }

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
    if (friendCelebrationSender_.pending && friendCelebrationSender_.pendingLocalDate == sourceLocalDate) {
      friendCelebrationSender_.lastEmittedLocalDate = sourceLocalDate;
      clearPendingFriendCelebrationSenderStateLocked_();
    }
    xSemaphoreGive(stateMutex_);
  }

  Serial.printf("Published friend celebration for %s\n", sourceLocalDate.c_str());
  return true;
}

bool FirmwareApp::tryReconnectForFactoryResetReport_(uint32_t nextResetEpoch) {
  if (!cloudClient_.isConfigured() || !cloudClient_.hasPersistedDeviceAuthToken()) {
    Serial.println("Skipping boot-time reset report: cloud auth is unavailable.");
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin();
  Serial.println("Attempting Wi-Fi reconnect for boot-time reset report.");

  const unsigned long startedAtMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAtMs < kFactoryResetReconnectTimeoutMs) {
    delay(kFactoryResetReconnectPollMs);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Boot-time reset report skipped: Wi-Fi did not reconnect in time.");
    return false;
  }

  const bool reported = cloudClient_.reportFactoryReset(nextResetEpoch);
  Serial.printf("Boot-time reset report %s.\n", reported ? "sent" : "failed");
  return reported;
}

void FirmwareApp::performFactoryReset_(const char* reason, bool allowReconnectForCloudReport) {
  Serial.printf("%s\n", reason);
  const uint32_t nextResetEpoch = provisioningStore_.resetEpoch() + 1;

  bool reportedReset = false;
  if (WiFi.status() == WL_CONNECTED && cloudClient_.isConfigured()) {
    markRuntimeSnapshotDirty_();
    flushRuntimeSnapshot_();
    reportedReset = cloudClient_.reportFactoryReset(nextResetEpoch);
  } else if (allowReconnectForCloudReport) {
    reportedReset = tryReconnectForFactoryResetReport_(nextResetEpoch);
  }

  if (!reportedReset) {
    Serial.println("Factory reset proceeding without cloud reset report.");
  }

  tm resetBaseline{};
  bool haveLogicalNow = timeService_.nowLogical(resetBaseline);
  if (!haveLogicalNow) {
    resetBaseline.tm_year = 126;
    resetBaseline.tm_mon = 0;
    resetBaseline.tm_mday = 5;
    resetBaseline.tm_hour = 12;
    resetBaseline.tm_isdst = -1;
    mktime(&resetBaseline);
  }

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
    deviceSettings_.clearToDefaults();
    habitTracker_.clearToDefaults(resetBaseline);
    xSemaphoreGive(stateMutex_);
  } else {
    deviceSettings_.clearToDefaults();
    habitTracker_.clearToDefaults(resetBaseline);
  }

  provisioningStore_.incrementResetEpoch();
  provisioningStore_.clearAllUserState();
  cloudClient_.clearPersistedDeviceAuthToken();
  cloudClient_.clearPersistedMqttTransportCredentials();
  pendingFactoryReset_ = false;
  recoveryRequestedAtRuntime_ = false;
  recoveryRequestedAtBoot_ = false;
  factoryResetRequestedAtBoot_ = false;

  apServer_.stop();
  timeService_.applySettings(deviceSettings_.current());

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(150);
  ESP.restart();
}

void FirmwareApp::syncTaskEntry_(void* context) {
  if (!context) {
    vTaskDelete(nullptr);
    return;
  }

  static_cast<FirmwareApp*>(context)->syncTask_();
}

bool FirmwareApp::enqueuePendingAck_(const String& commandId,
                                     CloudClient::CommandAckStatus status,
                                     const String& failureReason) {
  if (queueMutex_ && xSemaphoreTake(queueMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  const auto releaseMutex = [this]() {
    if (queueMutex_) {
      xSemaphoreGive(queueMutex_);
    }
  };

  for (size_t index = 0; index < pendingCommandAckCount_; ++index) {
    if (pendingCommandAcks_[index].commandId == commandId) {
      pendingCommandAcks_[index].status = status;
      pendingCommandAcks_[index].failureReason = failureReason;
      releaseMutex();
      return true;
    }
  }

  if (pendingCommandAckCount_ >= kPendingCommandAckQueueSize) {
    Serial.println("Pending ack queue full.");
    releaseMutex();
    return false;
  }

  PendingCommandAck& pending = pendingCommandAcks_[pendingCommandAckCount_++];
  pending.commandId = commandId;
  pending.status = status;
  pending.failureReason = failureReason;
  releaseMutex();
  return true;
}

bool FirmwareApp::dequeuePendingAck_(PendingCommandAck& outAck) {
  if (queueMutex_ && xSemaphoreTake(queueMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  if (pendingCommandAckCount_ == 0) {
    if (queueMutex_) {
      xSemaphoreGive(queueMutex_);
    }
    return false;
  }

  outAck = pendingCommandAcks_[0];
  for (size_t index = 1; index < pendingCommandAckCount_; ++index) {
    pendingCommandAcks_[index - 1] = pendingCommandAcks_[index];
  }
  pendingCommandAcks_[pendingCommandAckCount_ - 1] = PendingCommandAck{};
  pendingCommandAckCount_--;
  if (queueMutex_) {
    xSemaphoreGive(queueMutex_);
  }
  return true;
}

void FirmwareApp::flushPendingCommandAcks_() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  PendingCommandAck pending;
  if (!dequeuePendingAck_(pending)) {
    return;
  }

  bool acked = false;
  if (realtimeClient_.isConnected()) {
    acked = realtimeClient_.publishAck(cloudClient_.deviceAuthToken(), pending.commandId, pending.status, pending.failureReason);
    if (!acked) {
      Serial.printf("Realtime ack publish failed for %s; retrying via RPC.\n", pending.commandId.c_str());
    }
  }

  if (!acked) {
    acked = cloudClient_.ackCommand(pending.commandId, pending.status, pending.failureReason);
  }

  if (!acked) {
    Serial.printf("Failed to ack command %s\n", pending.commandId.c_str());
    enqueuePendingAck_(pending.commandId, pending.status, pending.failureReason);
    return;
  }

  Serial.printf("Acked command %s as %s\n",
                pending.commandId.c_str(),
                pending.status == CloudClient::CommandAckStatus::Applied ? "applied" :
                pending.status == CloudClient::CommandAckStatus::Failed ? "failed" : "cancelled");

}

bool FirmwareApp::hasPendingAcks_() {
  if (queueMutex_ && xSemaphoreTake(queueMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return true;
  }

  const bool hasPending = pendingCommandAckCount_ > 0;
  if (queueMutex_) {
    xSemaphoreGive(queueMutex_);
  }
  return hasPending;
}

void FirmwareApp::enterWifiRecoveryMode_() {
  Serial.println("Entering Wi-Fi recovery mode.");
  apServer_.resetForRecovery();
  WiFi.disconnect(false, false);
  delay(50);
  enterState_(FirmwareState::SetupRecovery);
}

bool FirmwareApp::copyRuntimeSnapshotPayload_(String& boardDaysJson,
                                              String& settingsJson,
                                              HabitTracker::WeekDate& currentWeekStart,
                                              uint8_t& todayRow,
                                              uint32_t& revision,
                                              String& generatedAt) {
  if (!hasAuthoritativeTime_()) {
    return false;
  }

  tm logicalNow{};
  if (!timeService_.nowLogical(logicalNow)) {
    return false;
  }

  HabitTracker::WeeklyGrid board{};
  DeviceSettingsState settings{};
  bool haveWeekStart = false;

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  board = habitTracker_.grid();
  settings = deviceSettings_.current();
  revision = habitTracker_.runtimeRevision();
  todayRow = habitTracker_.todayRow(logicalNow);
  haveWeekStart = habitTracker_.currentWeekStart(currentWeekStart);

  if (stateMutex_) {
    xSemaphoreGive(stateMutex_);
  }

  if (!haveWeekStart) {
    return false;
  }

  boardDaysJson = buildBoardDaysJson(board);
  settingsJson = buildSettingsJson(settings);
  generatedAt = timeService_.currentUtcIsoTimestamp();
  return true;
}

bool FirmwareApp::applyCloudCommand_(const CloudClient::DeviceCommand& command, String& failureReason) {
  if (command.kind == "set_day_state") {
    if (!hasAuthoritativeTime_()) {
      failureReason = "Authoritative time is unavailable.";
      return false;
    }

    tm nowLogical{};
    if (!timeService_.nowLogical(nowLogical)) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    if (!command.hasSetDayStatePayload || command.localDate.isEmpty() || !command.hasBaseRevision) {
      failureReason = "set_day_state payload missing local_date, is_done, or base_revision.";
      return false;
    }

    const String currentLogicalDate = timeService_.currentLogicalDate();
    if (currentLogicalDate.isEmpty()) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    if (command.localDate != currentLogicalDate) {
      failureReason = "set_day_state only supports the current logical day.";
      return false;
    }

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      failureReason = "Device state busy.";
      return false;
    }

    const bool applied =
        habitTracker_.applyCloudState(command.localDate, command.isDone, nowLogical, command.baseRevision, failureReason);
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }

    if (!applied) {
      return false;
    }

    markRuntimeSnapshotDirty_();
    Serial.printf("Applied cloud day state %s -> %s\n",
                  command.localDate.c_str(),
                  command.isDone ? "done" : "not_done");
    return true;
  }

  if (command.kind == "apply_history_draft") {
    if (!hasAuthoritativeTime_()) {
      failureReason = "Authoritative time is unavailable.";
      return false;
    }

    if (!command.hasHistoryDraftPayload || command.payloadJson.isEmpty() || !command.hasBaseRevision) {
      failureReason = "History draft payload missing updates or base_revision.";
      return false;
    }

    tm nowLogical{};
    if (!timeService_.nowLogical(nowLogical)) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    const size_t payloadCapacity = command.payloadJson.length() * 2U + 2048U;
    DynamicJsonDocument doc(payloadCapacity > 4096U ? payloadCapacity : 4096U);
    DeserializationError error = deserializeJson(doc, command.payloadJson);
    if (error) {
      failureReason = "Failed to parse history draft payload.";
      return false;
    }

    JsonArrayConst updatesJson = doc["updates"].as<JsonArrayConst>();
    if (updatesJson.isNull() || updatesJson.size() == 0) {
      failureReason = "History draft payload missing updates.";
      return false;
    }

    HabitTracker::HistoryDraftUpdate* updates = new HabitTracker::HistoryDraftUpdate[updatesJson.size()];
    for (size_t index = 0; index < updatesJson.size(); ++index) {
      JsonObjectConst update = updatesJson[index];
      updates[index].localDate = update["local_date"] | "";
      updates[index].isDone = update["is_done"].as<bool>();
    }

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      delete[] updates;
      failureReason = "Device state busy.";
      return false;
    }

    const bool applied = habitTracker_.applyHistoryDraft(
        updates, updatesJson.size(), nowLogical, command.baseRevision, failureReason);
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }
    delete[] updates;
    if (!applied) {
      return false;
    }

    markRuntimeSnapshotDirty_();
    Serial.println("Applied cloud history draft.");
    return true;
  }

  if (command.kind == "apply_device_settings") {
    if (!command.hasSyncSettingsPayload) {
      failureReason = "apply_device_settings payload is empty.";
      return false;
    }

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      failureReason = "Device state busy.";
      return false;
    }

    const bool settingsApplied = deviceSettings_.applySync(command.settingsSync, failureReason);
    if (!settingsApplied) {
      if (stateMutex_) {
        xSemaphoreGive(stateMutex_);
      }
      if (failureReason.isEmpty()) {
        failureReason = "Failed to persist device settings.";
      }
      return false;
    }

    habitTracker_.setMinimum(deviceSettings_.current().weeklyTarget);
    if (!habitTracker_.bumpRuntimeRevision()) {
      if (stateMutex_) {
        xSemaphoreGive(stateMutex_);
      }
      failureReason = "Failed to persist runtime revision after settings update.";
      return false;
    }
    timeService_.applySettings(deviceSettings_.current());
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }
    markRuntimeSnapshotDirty_();
    Serial.println("Applied cloud device settings.");
    return true;
  }

  if (command.kind == "begin_firmware_update") {
    if (!otaClient_.handleBeginUpdateCommand(command, failureReason)) {
      return false;
    }

    Serial.println("Firmware OTA update check requested from cloud.");
    return true;
  }

  if (command.kind == "request_runtime_snapshot") {
    if (onboardingVisualActive_) {
      dismissOnboardingVisual_(true);
    }
    if (!hasAuthoritativeTime_()) {
      failureReason = "Authoritative time is unavailable.";
      return false;
    }

    markRuntimeSnapshotDirty_();
    Serial.println("Runtime snapshot requested.");
    return true;
  }

  if (command.kind == "enter_wifi_recovery") {
    if (ignoreRecoveryCommandsUntilMs_ > millis()) {
      Serial.println("Ignoring stale Wi-Fi recovery command during recovery cooldown.");
      return true;
    }
    recoveryRequestedAtRuntime_ = true;
    Serial.println("Wi-Fi recovery requested from app.");
    return true;
  }

  if (command.kind == "factory_reset") {
    if (WiFi.status() == WL_CONNECTED) {
      markRuntimeSnapshotDirty_();
      flushRuntimeSnapshot_();
    }

    pendingFactoryReset_ = true;
    Serial.println("Factory reset requested from app.");
    return true;
  }

  if (command.kind == "reset_history") {
    if (!hasAuthoritativeTime_()) {
      failureReason = "Authoritative time is unavailable.";
      return false;
    }

    if (!command.hasBaseRevision) {
      failureReason = "reset_history payload missing base_revision.";
      return false;
    }

    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, command.payloadJson);
    if (error) {
      failureReason = "Failed to parse reset history payload.";
      return false;
    }

    DeviceSettingsSyncPayload resetSettings{};
    populateSettingsSyncPayload(doc.as<JsonObjectConst>(), resetSettings);

    tm nowLogical{};
    if (!timeService_.nowLogical(nowLogical)) {
      failureReason = "Logical time is unavailable.";
      return false;
    }

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      failureReason = "Device state busy.";
      return false;
    }

    const bool settingsApplied = deviceSettings_.applySync(resetSettings, failureReason);
    if (!settingsApplied) {
      if (stateMutex_) {
        xSemaphoreGive(stateMutex_);
      }
      if (failureReason.isEmpty()) {
        failureReason = "Failed to apply reset history settings.";
      }
      return false;
    }

    timeService_.applySettings(deviceSettings_.current());
    const uint8_t nextMinimum = deviceSettings_.current().weeklyTarget;
    const bool resetApplied = habitTracker_.resetHistory(nowLogical, nextMinimum, command.baseRevision, failureReason);
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }

    if (!resetApplied) {
      return false;
    }

    markRuntimeSnapshotDirty_();
    Serial.println("Reset board history from cloud.");
    return true;
  }

  if (command.kind == "restore_board_backup") {
    if (command.payloadJson.isEmpty()) {
      failureReason = "Restore payload is empty.";
      return false;
    }

    DynamicJsonDocument doc(12288);
    DeserializationError error = deserializeJson(doc, command.payloadJson);
    if (error) {
      failureReason = "Failed to parse restore payload.";
      return false;
    }

    const String currentWeekStartValue = doc["current_week_start"] | "";
    HabitTracker::WeekDate restoredWeekStart{};
    if (!parseWeekDateString(currentWeekStartValue, restoredWeekStart)) {
      failureReason = "Restore payload is missing a valid current_week_start.";
      return false;
    }

    JsonVariantConst boardDaysJsonVariant = doc["board_days"];
    JsonObjectConst settingsObject = doc["settings"].as<JsonObjectConst>();
    if (!boardDaysJsonVariant.is<JsonArrayConst>() || settingsObject.isNull()) {
      failureReason = "Restore payload is missing board_days or settings.";
      return false;
    }

    String restoredBoardDaysJson;
    serializeJson(boardDaysJsonVariant, restoredBoardDaysJson);

    DeviceSettingsSyncPayload restoreSettings{};
    populateSettingsSyncPayload(settingsObject, restoreSettings);
    const uint32_t nextRevision = static_cast<uint32_t>((doc["source_snapshot_revision"] | 0) + 1);

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      failureReason = "Device state busy.";
      return false;
    }

    const bool settingsApplied = deviceSettings_.applySync(restoreSettings, failureReason);
    if (!settingsApplied) {
      if (stateMutex_) {
        xSemaphoreGive(stateMutex_);
      }
      if (failureReason.isEmpty()) {
        failureReason = "Failed to apply restored device settings.";
      }
      return false;
    }

    timeService_.applySettings(deviceSettings_.current());
    const bool restored = habitTracker_.restoreFromSnapshot(
        restoredBoardDaysJson,
        restoredWeekStart,
        deviceSettings_.current().weeklyTarget,
        nextRevision,
        failureReason);
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }
    if (!restored) {
      return false;
    }

    markRuntimeSnapshotDirty_();
    startRecoveryVisualCompletion_();
    Serial.println("Restored board backup from cloud.");
    return true;
  }

  if (command.kind == "play_friend_celebration") {
    if (state_ != FirmwareState::Tracking || recoveryVisualActive_ || pendingFactoryReset_ || recoveryRequestedAtRuntime_ ||
        friendCelebrationPlayback_.active) {
      Serial.println("Ignoring friend celebration while tracking is unavailable.");
      return true;
    }

    if (!hasAuthoritativeTime_()) {
      Serial.println("Ignoring friend celebration because time is unavailable.");
      return true;
    }

    if (command.payloadJson.isEmpty()) {
      failureReason = "Friend celebration payload is empty.";
      return false;
    }

    DynamicJsonDocument doc(12288);
    DeserializationError error = deserializeJson(doc, command.payloadJson);
    if (error) {
      failureReason = "Failed to parse friend celebration payload.";
      return false;
    }

    const String expiresAt = doc["expires_at"] | "";
    if (expiresAt.isEmpty()) {
      failureReason = "Friend celebration payload is missing expires_at.";
      return false;
    }

    const String currentUtc = timeService_.currentUtcIsoTimestamp();
    if (!currentUtc.isEmpty() && currentUtc >= expiresAt) {
      Serial.println("Ignoring expired friend celebration.");
      return true;
    }

    const int weeklyTarget = doc["weekly_target"] | 0;
    const char* palettePreset = doc["palette_preset"] | "classic";
    const FriendCelebrationSpeed transitionSpeed =
        parseFriendCelebrationSpeed(doc["transition_speed"] | "balanced");
    const BoardTransitionStyle transitionStyle =
        parseFriendCelebrationTransitionStyle(doc["transition_style"] | "column_wipe");
    const unsigned long dwellDurationMs = parseFriendCelebrationDwellMs(doc);
    JsonVariantConst boardDaysVariant = doc["board_days"];
    if (!boardDaysVariant.is<JsonArrayConst>() || weeklyTarget < 1 || weeklyTarget > Config::kDaysPerWeek) {
      failureReason = "Friend celebration payload is missing board_days or weekly_target.";
      return false;
    }

    String boardDaysJson;
    serializeJson(boardDaysVariant, boardDaysJson);

    String paletteCustomJson = "{}";
    if (doc["palette_custom"].is<JsonObjectConst>()) {
      serializeJson(doc["palette_custom"], paletteCustomJson);
    }

    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
      failureReason = "Device state busy.";
      return false;
    }

    boardRenderer_.buildTrackingFrame(habitTracker_, deviceSettings_.current(), friendCelebrationPlayback_.ownerFrame);
    if (stateMutex_) {
      xSemaphoreGive(stateMutex_);
    }

    if (!boardRenderer_.buildSnapshotFrame(
            boardDaysJson,
            static_cast<uint8_t>(weeklyTarget),
            palettePreset,
            paletteCustomJson,
            friendCelebrationPlayback_.friendFrame)) {
      failureReason = "Friend celebration snapshot is invalid.";
      return false;
    }

    friendCelebrationPlayback_.transitionStyle = transitionStyle;
    BoardTransition::prepare(
        friendCelebrationPlayback_.transitionStyle,
        friendCelebrationPlayback_.ownerFrame,
        friendCelebrationPlayback_.friendFrame,
        friendCelebrationPlayback_.transitionPlan);
    friendCelebrationPlayback_.dwellDurationMs = dwellDurationMs;
    friendCelebrationPlayback_.dissolveDurationMs =
        friendCelebrationTransitionDuration(transitionSpeed, friendCelebrationPlayback_.transitionPlan);
    friendCelebrationPlayback_.startedAtMs = millis();
    enterState_(FirmwareState::FriendCelebration);
    Serial.printf(
        "Playing friend celebration from %s with %s (%s, %u changed pixels, %lu ms transition, %lu ms dwell)\n",
        (doc["source_device_id"] | "friend"),
        BoardTransition::label(friendCelebrationPlayback_.transitionStyle),
        friendCelebrationSpeedLabel(transitionSpeed),
        friendCelebrationPlayback_.transitionPlan.changedPixelCount,
        friendCelebrationPlayback_.dissolveDurationMs,
        friendCelebrationPlayback_.dwellDurationMs);
    return true;
  }

  failureReason = "Unsupported command kind.";
  return false;
}

bool FirmwareApp::flushRuntimeSnapshot_() {
  if (!runtimeSnapshotDirty_ || WiFi.status() != WL_CONNECTED || !cloudClient_.isConfigured()) {
    return false;
  }

  HabitTracker::WeekDate weekStart{};
  uint8_t todayRow = 0;
  uint32_t revision = 0;
  String boardDaysJson;
  String settingsJson;
  String generatedAt;
  if (!copyRuntimeSnapshotPayload_(boardDaysJson, settingsJson, weekStart, todayRow, revision, generatedAt)) {
    return false;
  }

  const bool uploaded =
      (realtimeClient_.isConnected() &&
       realtimeClient_.publishRuntimeSnapshot(
           cloudClient_.deviceAuthToken(), revision, weekStart, todayRow, boardDaysJson, settingsJson, generatedAt)) ||
      cloudClient_.uploadRuntimeSnapshot(
          revision, weekStart, todayRow, boardDaysJson, settingsJson, generatedAt);
  if (uploaded) {
    uint32_t currentRevision = revision;
    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
      currentRevision = habitTracker_.runtimeRevision();
      xSemaphoreGive(stateMutex_);
    }

    if (currentRevision == revision) {
      runtimeSnapshotDirty_ = false;
      Serial.printf("Uploaded runtime snapshot revision %lu\n", static_cast<unsigned long>(revision));
    } else {
      runtimeSnapshotDirty_ = true;
      Serial.printf("Uploaded stale runtime snapshot revision %lu; latest revision is %lu, keeping snapshot dirty.\n",
                    static_cast<unsigned long>(revision),
                    static_cast<unsigned long>(currentRevision));
    }
  } else {
    Serial.println("Runtime snapshot upload failed.");
  }

  return uploaded;
}

void FirmwareApp::pollCommands_() {
  CloudClient::DeviceCommand commands[4];
  size_t commandCount = 0;
  if (!cloudClient_.pullCommands(commands, 4, commandCount)) {
    return;
  }

  for (size_t index = 0; index < commandCount; ++index) {
    if (!enqueueIncomingCommand_(commands[index])) {
      Serial.println("Incoming command queue full; stopping HTTP command fetch processing.");
      break;
    }
  }
}

void FirmwareApp::processRealtimeCommands_() {
  CloudClient::DeviceCommand command;
  while (realtimeClient_.popCommand(command)) {
    if (!enqueueIncomingCommand_(command)) {
      Serial.println("Incoming command queue full; dropping realtime command.");
    }
  }
}

bool FirmwareApp::enqueueIncomingCommand_(const CloudClient::DeviceCommand& command) {
  if (queueMutex_ && xSemaphoreTake(queueMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  if (incomingCommandCount_ >= kIncomingCommandQueueSize) {
    if (queueMutex_) {
      xSemaphoreGive(queueMutex_);
    }
    return false;
  }

  IncomingCommand& slot = incomingCommands_[incomingCommandCount_++];
  slot.command = command;
  slot.occupied = true;

  if (queueMutex_) {
    xSemaphoreGive(queueMutex_);
  }
  return true;
}

bool FirmwareApp::dequeueIncomingCommand_(CloudClient::DeviceCommand& outCommand) {
  if (queueMutex_ && xSemaphoreTake(queueMutex_, pdMS_TO_TICKS(25)) != pdTRUE) {
    return false;
  }

  if (incomingCommandCount_ == 0) {
    if (queueMutex_) {
      xSemaphoreGive(queueMutex_);
    }
    return false;
  }

  outCommand = incomingCommands_[0].command;
  for (size_t index = 1; index < incomingCommandCount_; ++index) {
    incomingCommands_[index - 1] = incomingCommands_[index];
  }
  incomingCommands_[incomingCommandCount_ - 1] = IncomingCommand{};
  incomingCommandCount_--;

  if (queueMutex_) {
    xSemaphoreGive(queueMutex_);
  }
  return true;
}

void FirmwareApp::drainIncomingCommands_() {
  for (uint8_t processed = 0; processed < 2; ++processed) {
    CloudClient::DeviceCommand command;
    if (!dequeueIncomingCommand_(command)) {
      return;
    }

    String failureReason;
    const bool applied = applyCloudCommand_(command, failureReason);
    const CloudClient::CommandAckStatus ackStatus =
        applied ? CloudClient::CommandAckStatus::Applied : CloudClient::CommandAckStatus::Failed;
    if (!applied) {
      Serial.printf("Command %s (%s) failed: %s\n",
                    command.id.c_str(),
                    command.kind.c_str(),
                    failureReason.c_str());
    }
    enqueuePendingAck_(command.id, ackStatus, failureReason);
  }
}

void FirmwareApp::syncTask_() {
  for (;;) {
    flushPendingCommandAcks_();

    otaClient_.service(state_,
                       bootReadyForTracking_(),
                       recoveryRequestedAtRuntime_,
                       pendingFactoryReset_,
                       WiFi.status() == WL_CONNECTED);

    if (state_ == FirmwareState::SetupRecovery || !cloudClient_.isConfigured() || WiFi.status() != WL_CONNECTED) {
      vTaskDelay(pdMS_TO_TICKS(50));
      continue;
    }

    realtimeClient_.loop();
    processRealtimeCommands_();

    const bool realtimeConnected = realtimeClient_.isConnected();
    tryEmitFriendCelebration_();

    if (runtimeSnapshotDirty_ && millis() - lastRuntimeSnapshotAttemptAtMs_ >= kRuntimeSnapshotSyncIntervalMs) {
      lastRuntimeSnapshotAttemptAtMs_ = millis();
      flushRuntimeSnapshot_();
    }

    if (!realtimeConnected && millis() - lastCommandPollAtMs_ >= kFallbackCommandPollWhenNoRealtimeMs) {
      lastCommandPollAtMs_ = millis();
      pollCommands_();
    }

    if (millis() - lastHeartbeatAtMs_ >= kHeartbeatIntervalMs) {
      lastHeartbeatAtMs_ = millis();
      if (!realtimeConnected ||
          !realtimeClient_.publishPresence(cloudClient_.deviceAuthToken(),
                                           String(Config::kFirmwareVersion),
                                           String(Config::kHardwareProfile),
                                           timeService_.currentUtcIsoTimestamp())) {
        cloudClient_.heartbeat();
      }
    }

    vTaskDelay(pdMS_TO_TICKS(15));
  }
}

void FirmwareApp::beginWifiReconnect_() {
  if (wifiReconnectAttemptActive_ || WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  const bool preferBootstrapCredentials = state_ == FirmwareState::SetupRecovery && provisioningStore_.hasPendingClaim();
  if (preferBootstrapCredentials && strlen(CloudConfig::kBootstrapWifiSsid) > 0) {
    WiFi.begin(CloudConfig::kBootstrapWifiSsid, CloudConfig::kBootstrapWifiPassword);
    Serial.printf("Attempting bootstrap Wi-Fi '%s'.\n", CloudConfig::kBootstrapWifiSsid);
  } else {
    WiFi.begin();
    Serial.println("Attempting reconnect with stored Wi-Fi credentials.");
  }
  wifiReconnectAttemptActive_ = true;
  wifiReconnectAttemptStartedAtMs_ = millis();
  wifiReconnectAttemptCount_++;
}

void FirmwareApp::tickSetupRecovery_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
    clearPendingFriendCelebrationSenderStateLocked_();
    xSemaphoreGive(stateMutex_);
  }

  while (buttonInput_.consumeLongHold()) {
  }

  const bool pendingClaimBeforeApLoop = provisioningStore_.hasPendingClaim();
  if (pendingClaimBeforeApLoop) {
    tickWifiReconnectPolicy_(false);
  }

  if (!pendingClaimBeforeApLoop && !apServer_.isRunning() && !apServer_.hasCompletedProvisioning()) {
    apServer_.begin(identity_, provisioningStore_);
    recoveryRequestedAtRuntime_ = false;
  } else if ((recoveryRequestedAtRuntime_ || recoveryRequestedAtBoot_ || (pendingClaimBeforeApLoop && wifiReconnectExhausted_)) &&
             !apServer_.isRunning() &&
             !apServer_.hasCompletedProvisioning()) {
    apServer_.begin(identity_, provisioningStore_);
    recoveryRequestedAtRuntime_ = false;
  }

  if (apServer_.isRunning()) {
    apServer_.loop();
  }

  if (apServer_.consumeFailureVisualPending()) {
    setRecoveryVisualStage_(RecoveryVisualStage::Failed);
    recoveryVisualUntilMs_ = millis() + kRecoveryVisualFailureMs;
  }

  const bool recoveryFailureFlashActive =
      recoveryVisualStage_ == RecoveryVisualStage::Failed &&
      recoveryVisualUntilMs_ > 0 &&
      millis() < recoveryVisualUntilMs_;

  const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  if (!recoveryFailureFlashActive) {
    if (apServer_.isRunning()) {
      if (apServer_.provisioningState() == ProvisioningContract::ProvisioningState::Busy) {
        setRecoveryVisualStage_(RecoveryVisualStage::CredentialsReceived);
      } else {
        setRecoveryVisualStage_(RecoveryVisualStage::PortalReady);
      }
    }

    if (!apServer_.isRunning() && (apServer_.hasCompletedProvisioning() || apServer_.isWifiConnected() || WiFi.status() == WL_CONNECTED)) {
      setRecoveryVisualStage_(RecoveryVisualStage::WifiConnected);
    }
  }
  boardRenderer_.renderRecoveryState(recoveryVisualStage_, brightness);

  if (!apServer_.hasCompletedProvisioning() || !apServer_.isWifiConnected()) {
    return;
  }

  // Re-read the claim after the AP loop. A fast Wi-Fi join can complete in the
  // same tick that accepted provisioning, and using the stale pre-loop value
  // can incorrectly skip cloud claim redemption.
  const bool pendingClaim = provisioningStore_.hasPendingClaim();
  if (!pendingClaim) {
    provisioningStore_.markReadyForTracking();
    ignoreRecoveryCommandsUntilMs_ = millis() + kRecoveryCommandCooldownMs;
    if (hasAuthoritativeTime_()) {
      if (prepareTrackerForCurrentTime_()) {
        markRuntimeSnapshotDirty_();
      }
      enterState_(FirmwareState::Tracking);
    } else {
      enterState_(FirmwareState::TimeInvalid);
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

  if (cloudClient_.redeemPendingClaim(claim, provisioningStore_.resetEpoch())) {
    provisioningStore_.clearPendingClaim();
    provisioningStore_.markReadyForTracking();
    markRuntimeSnapshotDirty_();
    startRecoveryVisualCompletion_();
    onboardingVisualActive_ = true;
    onboardingVisualActivatedAtMs_ = millis();
    ignoreRecoveryCommandsUntilMs_ = millis() + kRecoveryCommandCooldownMs;
    if (hasAuthoritativeTime_()) {
      if (prepareTrackerForCurrentTime_()) {
        markRuntimeSnapshotDirty_();
      }
      enterState_(FirmwareState::Tracking);
    } else {
      enterState_(FirmwareState::TimeInvalid);
    }
  }
}

void FirmwareApp::tickTracking_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  if (buttonInput_.consumeLongHold()) {
    recoveryRequestedAtRuntime_ = true;
  }

  tickWifiReconnectPolicy_(false);

  drainIncomingCommands_();

  if (!hasAuthoritativeTime_()) {
    enterState_(FirmwareState::TimeInvalid);
    return;
  }

  tm logicalNow{};
  if (timeService_.nowLogical(logicalNow)) {
    if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
      if (habitTracker_.checkWeekBoundary(logicalNow)) {
        markRuntimeSnapshotDirty_();
      }

      const bool shortPress = buttonInput_.consumeShortPress();
      if (onboardingVisualActive_) {
        if (shortPress) {
          dismissOnboardingVisual_(false);
        }
        while (buttonInput_.consumeShortPress()) {
        }
      } else if (shortPress) {
        bool isDone = false;
        const int8_t weekSuccessBefore = habitTracker_.currentWeekSuccess();
        if (habitTracker_.queueLocalToggleToday(logicalNow, isDone)) {
          lastLocalInteractionAtMs_ = millis();
          markRuntimeSnapshotDirty_();
          Serial.printf("Local toggle for %s -> %s\n",
                        timeService_.currentLogicalDate().c_str(),
                        isDone ? "done" : "not_done");

          const int8_t weekSuccessAfter = habitTracker_.currentWeekSuccess();
          if (rewardEngine_.shouldTrigger(deviceSettings_.current(), isDone, weekSuccessBefore, weekSuccessAfter)) {
            updateFriendCelebrationSenderStateLocked_(logicalNow);
            rewardEngine_.start(deviceSettings_.current());
            xSemaphoreGive(stateMutex_);
            enterState_(FirmwareState::Reward);
            return;
          }
        }
      }

      updateFriendCelebrationSenderStateLocked_(logicalNow);

      const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
      if (!renderRecoveryVisualIfActive_(brightness)) {
        if (!renderOnboardingVisualIfActive_(brightness)) {
          boardRenderer_.render(habitTracker_, deviceSettings_.current(), &logicalNow, brightness);
        }
      }
      xSemaphoreGive(stateMutex_);
    }
  } else {
    const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
    if (!renderOnboardingVisualIfActive_(brightness)) {
      boardRenderer_.renderTimeErrorState(false, WiFi.status() == WL_CONNECTED, brightness);
    }
  }

  if (recoveryRequestedAtRuntime_ && !hasPendingAcks_()) {
    enterWifiRecoveryMode_();
    return;
  }

  if (pendingFactoryReset_ && !hasPendingAcks_()) {
    performFactoryReset_("App-triggered factory reset requested.");
  }
}

void FirmwareApp::tickReward_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  tickWifiReconnectPolicy_(false);
  drainIncomingCommands_();

  if (buttonInput_.consumeLongHold()) {
    recoveryRequestedAtRuntime_ = true;
    enterState_(FirmwareState::Tracking);
    return;
  }

  if (pendingFactoryReset_ && !hasPendingAcks_()) {
    performFactoryReset_("App-triggered factory reset requested.");
    return;
  }

  if (buttonInput_.consumeShortPress() || rewardEngine_.shouldDismiss()) {
    enterState_(FirmwareState::Tracking);
    return;
  }

  tm logicalNow{};
  const tm* logicalNowPtr = timeService_.nowLogical(logicalNow) ? &logicalNow : nullptr;
  DeviceSettingsState settings{};
  uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
    if (logicalNowPtr) {
      updateFriendCelebrationSenderStateLocked_(logicalNow);
    } else {
      clearPendingFriendCelebrationSenderStateLocked_();
    }
    settings = deviceSettings_.current();
    brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
    xSemaphoreGive(stateMutex_);
  }
  boardRenderer_.renderReward(
      settings, rewardEngine_.type(), logicalNowPtr, rewardEngine_.elapsedMs(), brightness);
}

void FirmwareApp::tickFriendCelebration_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  tickWifiReconnectPolicy_(false);
  drainIncomingCommands_();

  if (buttonInput_.consumeLongHold()) {
    recoveryRequestedAtRuntime_ = true;
  }

  if (!hasAuthoritativeTime_()) {
    enterState_(FirmwareState::TimeInvalid);
    return;
  }

  if (recoveryRequestedAtRuntime_ && !hasPendingAcks_()) {
    enterWifiRecoveryMode_();
    return;
  }

  if (pendingFactoryReset_ && !hasPendingAcks_()) {
    performFactoryReset_("App-triggered factory reset requested.");
    return;
  }

  while (buttonInput_.consumeShortPress()) {
  }

  if (!friendCelebrationPlayback_.active) {
    enterState_(FirmwareState::Tracking);
    return;
  }

  const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  const unsigned long elapsedMs = millis() - friendCelebrationPlayback_.startedAtMs;
  const unsigned long dissolveDurationMs = friendCelebrationPlayback_.dissolveDurationMs;
  const unsigned long dwellDurationMs = friendCelebrationPlayback_.dwellDurationMs;
  const unsigned long totalDurationMs = dissolveDurationMs + dwellDurationMs + dissolveDurationMs;
  if (elapsedMs >= totalDurationMs) {
    boardRenderer_.renderFrame(friendCelebrationPlayback_.ownerFrame, brightness);
    enterState_(FirmwareState::Tracking);
    return;
  }

  if (elapsedMs < dissolveDurationMs) {
    BoardFrame transitionFrame{};
    BoardTransition::apply(
        friendCelebrationPlayback_.transitionStyle,
        friendCelebrationPlayback_.ownerFrame,
        friendCelebrationPlayback_.friendFrame,
        friendCelebrationPlayback_.transitionPlan,
        elapsedMs,
        dissolveDurationMs,
        BoardTransitionPhase::Forward,
        transitionFrame);
    boardRenderer_.renderFrame(transitionFrame, brightness);
    return;
  }

  if (elapsedMs < dissolveDurationMs + dwellDurationMs) {
    boardRenderer_.renderFrame(friendCelebrationPlayback_.friendFrame, brightness);
    return;
  }

  BoardFrame transitionFrame{};
  BoardTransition::apply(
      friendCelebrationPlayback_.transitionStyle,
      friendCelebrationPlayback_.friendFrame,
      friendCelebrationPlayback_.ownerFrame,
      friendCelebrationPlayback_.transitionPlan,
      elapsedMs - dissolveDurationMs - dwellDurationMs,
      dissolveDurationMs,
      BoardTransitionPhase::Reverse,
      transitionFrame);
  boardRenderer_.renderFrame(transitionFrame, brightness);
}

void FirmwareApp::tickTimeInvalid_() {
  buttonInput_.loop();
  ambientLight_.loop();
  timeService_.update(WiFi.status() == WL_CONNECTED);
  drainIncomingCommands_();

  if (stateMutex_ && xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
    clearPendingFriendCelebrationSenderStateLocked_();
    xSemaphoreGive(stateMutex_);
  }

  if (buttonInput_.consumeLongHold()) {
    recoveryRequestedAtRuntime_ = true;
  }

  if (onboardingVisualActive_ && buttonInput_.consumeShortPress()) {
    dismissOnboardingVisual_(false);
  }
  while (onboardingVisualActive_ && buttonInput_.consumeShortPress()) {
  }

  if (tickWifiReconnectPolicy_(false)) {
    recoveryRequestedAtRuntime_ = true;
  }

  if (hasAuthoritativeTime_()) {
    bool trackerReady = false;
    if (!stateMutex_) {
      if (prepareTrackerForCurrentTime_()) {
        markRuntimeSnapshotDirty_();
      }
      trackerReady = true;
    } else if (xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(25)) == pdTRUE) {
      if (prepareTrackerForCurrentTime_()) {
        markRuntimeSnapshotDirty_();
      }
      xSemaphoreGive(stateMutex_);
      trackerReady = true;
    }

    if (trackerReady) {
      enterState_(FirmwareState::Tracking);
    }
    return;
  }

  const uint8_t brightness = deviceSettings_.resolveBrightness(ambientLight_.normalized01());
  if (!renderOnboardingVisualIfActive_(brightness)) {
    boardRenderer_.renderTimeErrorState(apServer_.isRunning(), WiFi.status() == WL_CONNECTED, brightness);
  }

  if (recoveryRequestedAtRuntime_ && !hasPendingAcks_()) {
    enterWifiRecoveryMode_();
    return;
  }

  if (pendingFactoryReset_ && !hasPendingAcks_()) {
    performFactoryReset_("App-triggered factory reset requested.");
  }
}
