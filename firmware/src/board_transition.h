#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "config.h"

struct BoardFrame {
  CRGB pixels[Config::kPanelRows][Config::kPanelCols]{};
};

class BoardTransition {
public:
  static void applyRandomDissolve(const BoardFrame& fromFrame,
                                  const BoardFrame& toFrame,
                                  unsigned long elapsedMs,
                                  unsigned long durationMs,
                                  BoardFrame& outFrame);

private:
  static uint16_t pixelRank_(uint8_t row, uint8_t col);
};
