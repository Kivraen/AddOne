#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "habit_tracker.h"

class BoardRenderer {
public:
  void begin();
  void render(const HabitTracker& tracker, const tm* localNow);
  void renderSetupState(bool apRunning, bool wifiConnected);

private:
  static constexpr uint16_t kTotalLeds = Config::kPanelRows * Config::kPanelCols;

  uint16_t logicalToIndex_(uint8_t row, uint8_t col) const;
  void clear_();
  void setPixel_(uint8_t row, uint8_t col, const CRGB& color);

  CRGB leds_[kTotalLeds]{};
};
