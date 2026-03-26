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

enum class BoardTransitionStyle : uint8_t {
  ColumnWipe = 0,
  ReverseWipe = 1,
  CenterSplit = 2,
  TopDrop = 3,
  DiagonalWave = 4,
  Constellation = 5,
  BottomRise = 6,
  EdgeClose = 7,
  ReverseDiagonal = 8,
  MatrixRain = 9,
  Venetian = 10,
  PulseRing = 11,
};

enum class BoardTransitionDirection : uint8_t {
  LeftToRight = 0,
  RightToLeft = 1,
};

enum class BoardTransitionPhase : uint8_t {
  Forward = 0,
  Reverse = 1,
};

class BoardTransition {
public:
  static unsigned long adaptiveDurationMs(const BoardTransitionPlan& plan,
                                          unsigned long minDurationMs,
                                          unsigned long maxDurationMs);
  static void apply(BoardTransitionStyle style,
                    const BoardFrame& fromFrame,
                    const BoardFrame& toFrame,
                    const BoardTransitionPlan& plan,
                    unsigned long elapsedMs,
                    unsigned long durationMs,
                    BoardTransitionPhase phase,
                    BoardFrame& outFrame);
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
  static const char* label(BoardTransitionStyle style);
  static void prepare(BoardTransitionStyle style,
                      const BoardFrame& fromFrame,
                      const BoardFrame& toFrame,
                      BoardTransitionPlan& outPlan);
  static void prepareColumnWipe(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan);
  static void prepareRandomOverlap(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan);
};
