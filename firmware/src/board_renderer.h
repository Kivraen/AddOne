#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "board_transition.h"
#include "device_settings.h"
#include "habit_tracker.h"

enum class RecoveryVisualStage : uint8_t {
  PortalReady = 0,
  CredentialsReceived = 1,
  WifiConnected = 2,
  CloudConnected = 3,
  RestoreApplied = 4,
};

enum class ResetHoldVisualStage : uint8_t {
  Holding = 0,
  RecoveryReady = 1,
  FactoryResetReady = 2,
};

enum class QaLedPattern : uint8_t {
  Off = 0,
  White = 1,
  Red = 2,
  Green = 3,
  Blue = 4,
  Mapping = 5,
};

class BoardRenderer {
public:
  void begin();
  bool buildSnapshotFrame(const String& boardDaysJson,
                          uint8_t weeklyTarget,
                          const char* palettePreset,
                          const String& paletteCustomJson,
                          BoardFrame& outFrame) const;
  void buildTrackingFrame(const HabitTracker& tracker, const DeviceSettingsState& settings, BoardFrame& outFrame) const;
  void renderQaPattern(QaLedPattern pattern, uint8_t brightness, unsigned long elapsedMs);
  void renderFrame(const BoardFrame& frame, uint8_t brightness);
  void renderResetHoldState(ResetHoldVisualStage stage, uint8_t brightness);
  void render(const HabitTracker& tracker, const DeviceSettingsState& settings, const tm* localNow, uint8_t brightness);
  void renderRecoveryState(RecoveryVisualStage stage, uint8_t brightness);
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
  static void applyCustomPaletteJson_(Palette& palette, const String& paletteCustomJson);
  static void clearFrame_(BoardFrame& frame);
  static CRGB colorFromHex_(const char* hex, const CRGB& fallback);
  static Palette paletteForPreset_(const char* presetId);
  static void setFramePixel_(BoardFrame& frame, uint8_t row, uint8_t col, const CRGB& color);
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
