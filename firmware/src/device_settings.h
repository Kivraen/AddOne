#pragma once

#include <Arduino.h>

#include "config.h"

enum class RewardType : uint8_t {
  Paint = 0,
  Clock = 1,
};

enum class RewardTrigger : uint8_t {
  Daily = 0,
  Weekly = 1,
};

struct DeviceSettingsSyncPayload {
  bool hasAmbientAuto = false;
  bool hasBrightness = false;
  bool hasDayResetTime = false;
  bool hasName = false;
  bool hasPalettePreset = false;
  bool hasRewardEnabled = false;
  bool hasRewardTrigger = false;
  bool hasRewardType = false;
  bool hasTimezone = false;
  bool hasWeeklyTarget = false;
  bool ambientAuto = true;
  bool rewardEnabled = false;
  String dayResetTime{};
  String name{};
  String palettePreset{};
  String rewardTrigger{};
  String rewardType{};
  String timezone{};
  uint8_t brightness = 70;
  uint8_t weeklyTarget = Config::kDefaultWeeklyMinimum;
};

struct DeviceSettingsState {
  bool ambientAuto = true;
  bool rewardEnabled = false;
  char dayResetTime[9] = "00:00:00";
  char name[64] = "AddOne";
  char palettePreset[16] = "classic";
  char timezone[64] = "America/Los_Angeles";
  uint8_t brightness = 70;
  uint8_t weeklyTarget = Config::kDefaultWeeklyMinimum;
  RewardTrigger rewardTrigger = RewardTrigger::Daily;
  RewardType rewardType = RewardType::Paint;

  uint16_t dayResetMinutes() const;
};

class DeviceSettingsStore {
public:
  void begin();
  bool applySync(const DeviceSettingsSyncPayload& payload, String& error);
  const DeviceSettingsState& current() const { return settings_; }
  uint16_t dayResetMinutes() const;
  uint8_t resolveBrightness(float ambientNormalized01) const;

private:
  static constexpr const char* kNamespace = "ao_settings";
  static constexpr const char* kAmbientAutoKey = "ambAuto";
  static constexpr const char* kBrightnessKey = "bright";
  static constexpr const char* kDayResetTimeKey = "resetAt";
  static constexpr const char* kNameKey = "name";
  static constexpr const char* kPalettePresetKey = "palette";
  static constexpr const char* kRewardEnabledKey = "rewardOn";
  static constexpr const char* kRewardTriggerKey = "rewardTrg";
  static constexpr const char* kRewardTypeKey = "rewardTyp";
  static constexpr const char* kTimezoneKey = "tz";
  static constexpr const char* kWeeklyTargetKey = "weekly";

  static uint8_t clampBrightness_(uint8_t brightness);
  static uint8_t clampWeeklyTarget_(uint8_t weeklyTarget);
  static const char* rewardTriggerName_(RewardTrigger trigger);
  static const char* rewardTypeName_(RewardType type);
  static bool normalizeResetTime_(const String& input, char* outValue, size_t outValueSize);
  static bool normalizePalette_(const String& input, char* outValue, size_t outValueSize);
  static RewardTrigger parseRewardTrigger_(const String& input);
  static RewardType parseRewardType_(const String& input);

  bool persist_() const;
  void load_();

  DeviceSettingsState settings_{};
};
