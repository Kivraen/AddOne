#pragma once

#include <Arduino.h>
#include <FastLED.h>

#include "config.h"

struct BoardFrame {
  CRGB pixels[Config::kPanelRows][Config::kPanelCols]{};
};

struct BoardTransitionPlan {
  uint16_t overlapIncomingRanks[Config::kPanelRows][Config::kPanelCols]{};
  uint16_t overlapOutgoingRanks[Config::kPanelRows][Config::kPanelCols]{};
  uint16_t changedPixelCount = 0;
};

enum class BoardTransitionDirection : uint8_t {
  LeftToRight = 0,
  RightToLeft = 1,
};

class BoardTransition {
public:
  static unsigned long adaptiveDurationMs(const BoardTransitionPlan& plan,
                                          unsigned long minDurationMs,
                                          unsigned long maxDurationMs);
  static void applyColumnWipe(const BoardFrame& fromFrame,
                              const BoardFrame& toFrame,
                              unsigned long elapsedMs,
                              unsigned long durationMs,
                              BoardTransitionDirection direction,
                              BoardFrame& outFrame);
  static void applyRandomOverlap(const BoardFrame& fromFrame,
                                 const BoardFrame& toFrame,
                                 const BoardTransitionPlan& plan,
                                 unsigned long elapsedMs,
                                 unsigned long durationMs,
                                 BoardFrame& outFrame);
  static void prepareColumnWipe(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan);
  static void prepareRandomOverlap(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan);
};
