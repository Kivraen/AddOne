#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "device_settings.h"
#include "habit_tracker.h"

class BoardRenderer {
public:
  void begin();
  void render(const HabitTracker& tracker, const DeviceSettingsState& settings, const tm* localNow, uint8_t brightness);
  void renderRecoveryState(bool apRunning, bool wifiConnected, uint8_t brightness);
  void renderReward(const DeviceSettingsState& settings,
                    RewardType rewardType,
                    const tm* localNow,
                    unsigned long elapsedMs,
                    uint8_t brightness);
  void renderTimeErrorState(bool apRunning, bool wifiConnected, uint8_t brightness);

private:
  struct Palette {
    CRGB dayOn;
    CRGB rewardPrimary;
    CRGB rewardSecondary;
    CRGB weekFail;
    CRGB weekSuccess;
  };

  static void applyCustomPalette_(Palette& palette, const DeviceSettingsState& settings);
  static CRGB colorFromHex_(const char* hex, const CRGB& fallback);
  static Palette paletteForPreset_(const char* presetId);
  static bool digitPixel_(uint8_t digit, uint8_t row, uint8_t col);
  static constexpr uint16_t kTotalLeds = Config::kPanelRows * Config::kPanelCols;

  void drawExclamationGlyph_(const CRGB& color);
  void drawWifiGlyph_(const CRGB& color);
  uint16_t logicalToIndex_(uint8_t row, uint8_t col) const;
  void clear_();
  void renderClockReward_(const Palette& palette, const tm& localNow);
  void renderPaintReward_(const Palette& palette, unsigned long elapsedMs);
  void setPixel_(uint8_t row, uint8_t col, const CRGB& color);

  CRGB leds_[kTotalLeds]{};
};
