#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "config.h"

struct BoardFrame {
  CRGB pixels[Config::kPanelRows][Config::kPanelCols]{};
};

enum class BoardTransitionStyle : uint8_t {
  RandomMix = 0,
  CenterBloom = 1,
  CurtainOpen = 2,
  LeftSweep = 3,
  RightSweep = 4,
  TopDrop = 5,
  BottomRise = 6,
  DiagonalDown = 7,
  DiagonalUp = 8,
  EdgeCollapse = 9,
  Count = 10,
};

constexpr uint8_t kBoardTransitionStyleCount = static_cast<uint8_t>(BoardTransitionStyle::Count);

struct BoardTransitionPlan {
  uint16_t pixelRanks[kBoardTransitionStyleCount][Config::kPanelRows][Config::kPanelCols]{};
  uint16_t changedPixelCount = 0;
};

class BoardTransition {
public:
  static unsigned long adaptiveDurationMs(const BoardTransitionPlan& plan,
                                          unsigned long minDurationMs,
                                          unsigned long maxDurationMs);
  static void applyTransition(const BoardFrame& fromFrame,
                              const BoardFrame& toFrame,
                              const BoardTransitionPlan& plan,
                              BoardTransitionStyle style,
                              unsigned long elapsedMs,
                              unsigned long durationMs,
                              BoardFrame& outFrame);
  static void preparePlan(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan);
  static const char* styleName(BoardTransitionStyle style);

private:
  static uint16_t pixelRank_(uint8_t row, uint8_t col);
};
