#include "device_settings.h"

#include <Preferences.h>

namespace {
bool isSupportedPalette(const char* value) {
  return strcmp(value, "classic") == 0 || strcmp(value, "amber") == 0 || strcmp(value, "ice") == 0 || strcmp(value, "rose") == 0;
}

uint8_t lerpBrightness(uint8_t from, uint8_t to, float amount) {
  if (amount < 0.0f) {
    amount = 0.0f;
  } else if (amount > 1.0f) {
    amount = 1.0f;
  }

  return static_cast<uint8_t>(from + ((to - from) * amount) + 0.5f);
}
} // namespace

void DeviceSettingsStore::begin() {
  load_();
}

bool DeviceSettingsStore::applySync(const DeviceSettingsSyncPayload& payload, String& error) {
  if (payload.hasAmbientAuto) {
    settings_.ambientAuto = payload.ambientAuto;
  }
  if (payload.hasRewardEnabled) {
    settings_.rewardEnabled = payload.rewardEnabled;
  }
  if (payload.hasBrightness) {
    settings_.brightness = clampBrightness_(payload.brightness);
  }
  if (payload.hasWeeklyTarget) {
    settings_.weeklyTarget = clampWeeklyTarget_(payload.weeklyTarget);
  }
  if (payload.hasRewardTrigger) {
    settings_.rewardTrigger = parseRewardTrigger_(payload.rewardTrigger);
  }
  if (payload.hasRewardType) {
    settings_.rewardType = parseRewardType_(payload.rewardType);
  }

  if (payload.hasDayResetTime &&
      !normalizeResetTime_(payload.dayResetTime, settings_.dayResetTime, sizeof(settings_.dayResetTime))) {
    error = "Invalid day reset time.";
    return false;
  }
  if (payload.hasName) {
    const String name = payload.name.isEmpty() ? String("AddOne") : payload.name;
    strncpy(settings_.name, name.c_str(), sizeof(settings_.name) - 1);
    settings_.name[sizeof(settings_.name) - 1] = '\0';
  }

  if (payload.hasPalettePreset &&
      !normalizePalette_(payload.palettePreset, settings_.palettePreset, sizeof(settings_.palettePreset))) {
    error = "Invalid palette preset.";
    return false;
  }

  if (payload.hasTimezone) {
    const String timezone = payload.timezone.isEmpty() ? String(Config::kDefaultTimezoneIana) : payload.timezone;
    strncpy(settings_.timezone, timezone.c_str(), sizeof(settings_.timezone) - 1);
    settings_.timezone[sizeof(settings_.timezone) - 1] = '\0';
  }

  return persist_();
}

uint8_t DeviceSettingsStore::clampBrightness_(uint8_t brightness) {
  return min<uint8_t>(brightness, 100);
}

uint8_t DeviceSettingsStore::clampWeeklyTarget_(uint8_t weeklyTarget) {
  return constrain(weeklyTarget, 1, Config::kDaysPerWeek);
}

uint16_t DeviceSettingsState::dayResetMinutes() const {
  int hours = 0;
  int minutes = 0;
  if (sscanf(dayResetTime, "%d:%d", &hours, &minutes) != 2) {
    return 0;
  }

  return static_cast<uint16_t>(constrain(hours, 0, 23) * 60 + constrain(minutes, 0, 59));
}

uint16_t DeviceSettingsStore::dayResetMinutes() const {
  return settings_.dayResetMinutes();
}

void DeviceSettingsStore::load_() {
  Preferences prefs;
  if (!prefs.begin(kNamespace, true)) {
    return;
  }

  settings_.ambientAuto = prefs.getBool(kAmbientAutoKey, true);
  settings_.rewardEnabled = prefs.getBool(kRewardEnabledKey, false);
  settings_.brightness = clampBrightness_(prefs.getUChar(kBrightnessKey, 70));
  settings_.weeklyTarget = clampWeeklyTarget_(prefs.getUChar(kWeeklyTargetKey, Config::kDefaultWeeklyMinimum));

  String storedReset = prefs.getString(kDayResetTimeKey, "00:00:00");
  normalizeResetTime_(storedReset, settings_.dayResetTime, sizeof(settings_.dayResetTime));

  String storedName = prefs.getString(kNameKey, "AddOne");
  strncpy(settings_.name, storedName.c_str(), sizeof(settings_.name) - 1);
  settings_.name[sizeof(settings_.name) - 1] = '\0';

  String storedPalette = prefs.getString(kPalettePresetKey, "classic");
  normalizePalette_(storedPalette, settings_.palettePreset, sizeof(settings_.palettePreset));

  String storedTimezone = prefs.getString(kTimezoneKey, Config::kDefaultTimezoneIana);
  strncpy(settings_.timezone, storedTimezone.c_str(), sizeof(settings_.timezone) - 1);
  settings_.timezone[sizeof(settings_.timezone) - 1] = '\0';

  settings_.rewardTrigger = parseRewardTrigger_(prefs.getString(kRewardTriggerKey, "daily"));
  settings_.rewardType = parseRewardType_(prefs.getString(kRewardTypeKey, "paint"));
  prefs.end();
}

bool DeviceSettingsStore::normalizeResetTime_(const String& input, char* outValue, size_t outValueSize) {
  int hours = 0;
  int minutes = 0;
  int seconds = 0;

  if (sscanf(input.c_str(), "%d:%d:%d", &hours, &minutes, &seconds) < 2) {
    snprintf(outValue, outValueSize, "%s", "00:00:00");
    return input.isEmpty();
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return false;
  }

  snprintf(outValue, outValueSize, "%02d:%02d:%02d", hours, minutes, seconds);
  return true;
}

bool DeviceSettingsStore::normalizePalette_(const String& input, char* outValue, size_t outValueSize) {
  const String normalized = input.isEmpty() ? String("classic") : input;
  if (!isSupportedPalette(normalized.c_str())) {
    return false;
  }

  strncpy(outValue, normalized.c_str(), outValueSize - 1);
  outValue[outValueSize - 1] = '\0';
  return true;
}

bool DeviceSettingsStore::persist_() const {
  Preferences prefs;
  if (!prefs.begin(kNamespace, false)) {
    return false;
  }

  prefs.putBool(kAmbientAutoKey, settings_.ambientAuto);
  prefs.putBool(kRewardEnabledKey, settings_.rewardEnabled);
  prefs.putUChar(kBrightnessKey, settings_.brightness);
  prefs.putUChar(kWeeklyTargetKey, settings_.weeklyTarget);
  prefs.putString(kDayResetTimeKey, settings_.dayResetTime);
  prefs.putString(kNameKey, settings_.name);
  prefs.putString(kPalettePresetKey, settings_.palettePreset);
  prefs.putString(kTimezoneKey, settings_.timezone);
  prefs.putString(kRewardTriggerKey, rewardTriggerName_(settings_.rewardTrigger));
  prefs.putString(kRewardTypeKey, rewardTypeName_(settings_.rewardType));
  prefs.end();
  return true;
}

RewardTrigger DeviceSettingsStore::parseRewardTrigger_(const String& input) {
  return input == "weekly" ? RewardTrigger::Weekly : RewardTrigger::Daily;
}

RewardType DeviceSettingsStore::parseRewardType_(const String& input) {
  return input == "clock" ? RewardType::Clock : RewardType::Paint;
}

const char* DeviceSettingsStore::rewardTriggerName_(RewardTrigger trigger) {
  return trigger == RewardTrigger::Weekly ? "weekly" : "daily";
}

const char* DeviceSettingsStore::rewardTypeName_(RewardType type) {
  return type == RewardType::Clock ? "clock" : "paint";
}

uint8_t DeviceSettingsStore::resolveBrightness(float ambientNormalized01) const {
  const uint8_t manualTarget = map(settings_.brightness, 0, 100, Config::kMinVisibleBrightness, Config::kSafeMaxBrightness);
  if (!settings_.ambientAuto) {
    return manualTarget;
  }

  const uint8_t nightTarget = max<uint8_t>(Config::kMinVisibleBrightness, manualTarget / 4);
  return lerpBrightness(nightTarget, manualTarget, ambientNormalized01);
}
