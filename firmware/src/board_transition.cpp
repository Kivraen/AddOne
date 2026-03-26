#include "board_transition.h"

#include <esp_system.h>
#include <math.h>

namespace {
constexpr uint16_t kTotalPixels = Config::kPanelRows * Config::kPanelCols;
constexpr uint16_t kUnchangedPixelRank = 0xFFFF;

struct TransitionPixelEntry {
  uint8_t row = 0;
  uint8_t col = 0;
  uint16_t primaryKey = 0;
  uint16_t secondaryKey = 0;
};

bool colorsMatch(const CRGB& left, const CRGB& right) {
  return left.r == right.r && left.g == right.g && left.b == right.b;
}

uint16_t abs16(int16_t value) {
  return static_cast<uint16_t>(value < 0 ? -value : value);
}

uint16_t random16() {
  return static_cast<uint16_t>(esp_random() & 0xFFFFU);
}

bool shouldShiftEntry(const TransitionPixelEntry& current, const TransitionPixelEntry& candidate) {
  if (current.primaryKey != candidate.primaryKey) {
    return current.primaryKey > candidate.primaryKey;
  }

  return current.secondaryKey > candidate.secondaryKey;
}

void sortEntries(TransitionPixelEntry* entries, uint16_t count) {
  for (uint16_t index = 1; index < count; ++index) {
    TransitionPixelEntry candidate = entries[index];
    int16_t scan = static_cast<int16_t>(index) - 1;
    while (scan >= 0 && shouldShiftEntry(entries[scan], candidate)) {
      entries[scan + 1] = entries[scan];
      --scan;
    }
    entries[scan + 1] = candidate;
  }
}

void initializePlan(BoardTransitionPlan& outPlan) {
  outPlan.changedPixelCount = 0;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      outPlan.overlapIncomingRanks[row][col] = kUnchangedPixelRank;
      outPlan.overlapOutgoingRanks[row][col] = kUnchangedPixelRank;
    }
  }
}

uint16_t transitionCountForElapsed(unsigned long elapsedMs, unsigned long durationMs, uint16_t totalCount) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return totalCount;
  }

  return static_cast<uint16_t>((static_cast<uint64_t>(elapsedMs) * totalCount) / durationMs);
}

uint16_t countChangedPixels(const BoardFrame& fromFrame, const BoardFrame& toFrame) {
  uint16_t changedCount = 0;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (!colorsMatch(fromFrame.pixels[row][col], toFrame.pixels[row][col])) {
        ++changedCount;
      }
    }
  }

  return changedCount;
}

void prepareSimplePlan(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan) {
  initializePlan(outPlan);
  outPlan.changedPixelCount = countChangedPixels(fromFrame, toFrame);
}

void assignRandomRanks(const BoardFrame& fromFrame,
                       const BoardFrame& toFrame,
                       uint16_t outRanks[Config::kPanelRows][Config::kPanelCols]) {
  TransitionPixelEntry entries[kTotalPixels]{};
  uint16_t entryCount = 0;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (colorsMatch(fromFrame.pixels[row][col], toFrame.pixels[row][col])) {
        continue;
      }

      entries[entryCount].row = row;
      entries[entryCount].col = col;
      entries[entryCount].primaryKey = random16();
      entries[entryCount].secondaryKey = random16();
      ++entryCount;
    }
  }

  sortEntries(entries, entryCount);
  for (uint16_t rank = 0; rank < entryCount; ++rank) {
    outRanks[entries[rank].row][entries[rank].col] = rank;
  }
}

int16_t wipeEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs, BoardTransitionDirection direction) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return direction == BoardTransitionDirection::LeftToRight
        ? static_cast<int16_t>(Config::kPanelCols)
        : static_cast<int16_t>(-1);
  }

  const unsigned long totalSteps = Config::kPanelCols + 1;
  const unsigned long progressedSteps =
      (static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs;

  if (direction == BoardTransitionDirection::LeftToRight) {
    return static_cast<int16_t>(progressedSteps);
  }

  return static_cast<int16_t>(Config::kPanelCols - 1) - static_cast<int16_t>(progressedSteps);
}

int16_t rowEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs, bool topDown) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return topDown ? static_cast<int16_t>(Config::kPanelRows) : static_cast<int16_t>(-1);
  }

  const unsigned long totalSteps = Config::kPanelRows + 1;
  const unsigned long progressedSteps =
      (static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs;

  if (topDown) {
    return static_cast<int16_t>(progressedSteps);
  }

  return static_cast<int16_t>(Config::kPanelRows - 1) - static_cast<int16_t>(progressedSteps);
}

uint8_t maxCenterDistance() {
  const int16_t centerLeft = static_cast<int16_t>(Config::kPanelCols - 1) / 2;
  const int16_t centerRight = static_cast<int16_t>(Config::kPanelCols) / 2;
  const uint16_t leftDistance = abs16(0 - centerRight);
  const uint16_t rightDistance = abs16(static_cast<int16_t>(Config::kPanelCols - 1) - centerLeft);
  return static_cast<uint8_t>(leftDistance > rightDistance ? leftDistance : rightDistance);
}

uint8_t centerDistanceForColumn(uint8_t col) {
  const int16_t centerLeft = static_cast<int16_t>(Config::kPanelCols - 1) / 2;
  const int16_t centerRight = static_cast<int16_t>(Config::kPanelCols) / 2;
  const uint16_t distanceLeft = abs16(static_cast<int16_t>(col) - centerLeft);
  const uint16_t distanceRight = abs16(static_cast<int16_t>(col) - centerRight);
  return static_cast<uint8_t>(distanceLeft < distanceRight ? distanceLeft : distanceRight);
}

uint8_t centerEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return static_cast<uint8_t>(maxCenterDistance() + 1);
  }

  const unsigned long totalSteps = static_cast<unsigned long>(maxCenterDistance()) + 2;
  return static_cast<uint8_t>((static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs);
}

uint8_t diagonalEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs) {
  const uint8_t maxDiagonal = Config::kPanelRows + Config::kPanelCols - 2;
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return static_cast<uint8_t>(maxDiagonal + 1);
  }

  const unsigned long totalSteps = static_cast<unsigned long>(maxDiagonal) + 2;
  return static_cast<uint8_t>((static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs);
}

uint8_t reverseDiagonalEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs) {
  const uint8_t maxDiagonal = Config::kPanelRows + Config::kPanelCols - 2;
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return static_cast<uint8_t>(maxDiagonal + 1);
  }

  const unsigned long totalSteps = static_cast<unsigned long>(maxDiagonal) + 2;
  return static_cast<uint8_t>((static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs);
}

float centerRow() {
  return (static_cast<float>(Config::kPanelRows) - 1.0f) * 0.5f;
}

float centerCol() {
  return (static_cast<float>(Config::kPanelCols) - 1.0f) * 0.5f;
}

uint8_t maxPulseDistance() {
  const float cRow = centerRow();
  const float cCol = centerCol();
  float maxDistance = 0.0f;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const float distance = fabsf(static_cast<float>(row) - cRow) + fabsf(static_cast<float>(col) - cCol);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
  }
  return static_cast<uint8_t>(maxDistance) + 1;
}

uint8_t pulseDistanceForCell(uint8_t row, uint8_t col) {
  const float distance = fabsf(static_cast<float>(row) - centerRow()) + fabsf(static_cast<float>(col) - centerCol());
  return static_cast<uint8_t>(distance);
}

uint8_t pulseEdgeForElapsed(unsigned long elapsedMs, unsigned long durationMs) {
  const uint8_t maxDistance = maxPulseDistance();
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return static_cast<uint8_t>(maxDistance + 1);
  }

  const unsigned long totalSteps = static_cast<unsigned long>(maxDistance) + 2;
  return static_cast<uint8_t>((static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs);
}

void applyCenterSplit(const BoardFrame& fromFrame,
                      const BoardFrame& toFrame,
                      unsigned long elapsedMs,
                      unsigned long durationMs,
                      BoardTransitionPhase phase,
                      BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint8_t edge = centerEdgeForElapsed(elapsedMs, durationMs);
  const uint8_t maxDistance = maxCenterDistance();
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t centerDistance = centerDistanceForColumn(col);
      const uint8_t comparisonDistance = phase == BoardTransitionPhase::Forward
          ? centerDistance
          : static_cast<uint8_t>(maxDistance - centerDistance);
      if (comparisonDistance < edge) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonDistance == edge) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

void applyRowWipe(const BoardFrame& fromFrame,
                  const BoardFrame& toFrame,
                  unsigned long elapsedMs,
                  unsigned long durationMs,
                  bool topDown,
                  BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const int16_t wipeEdge = rowEdgeForElapsed(elapsedMs, durationMs, topDown);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (topDown) {
        if (static_cast<int16_t>(row) < wipeEdge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(row) == wipeEdge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      } else {
        if (static_cast<int16_t>(row) > wipeEdge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(row) == wipeEdge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      }
    }
  }
}

void applyDiagonalWave(const BoardFrame& fromFrame,
                       const BoardFrame& toFrame,
                       unsigned long elapsedMs,
                       unsigned long durationMs,
                       BoardTransitionPhase phase,
                       BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint8_t edge = diagonalEdgeForElapsed(elapsedMs, durationMs);
  const uint8_t maxDiagonal = Config::kPanelRows + Config::kPanelCols - 2;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t diagonal = row + col;
      const uint8_t comparisonDiagonal = phase == BoardTransitionPhase::Forward
          ? diagonal
          : static_cast<uint8_t>(maxDiagonal - diagonal);
      if (comparisonDiagonal < edge) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonDiagonal == edge) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

void applyReverseDiagonalWave(const BoardFrame& fromFrame,
                              const BoardFrame& toFrame,
                              unsigned long elapsedMs,
                              unsigned long durationMs,
                              BoardTransitionPhase phase,
                              BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint8_t edge = reverseDiagonalEdgeForElapsed(elapsedMs, durationMs);
  const uint8_t maxDiagonal = Config::kPanelRows + Config::kPanelCols - 2;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t diagonal = row + static_cast<uint8_t>((Config::kPanelCols - 1) - col);
      const uint8_t comparisonDiagonal = phase == BoardTransitionPhase::Forward
          ? diagonal
          : static_cast<uint8_t>(maxDiagonal - diagonal);
      if (comparisonDiagonal < edge) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonDiagonal == edge) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

void applyEdgeClose(const BoardFrame& fromFrame,
                    const BoardFrame& toFrame,
                    unsigned long elapsedMs,
                    unsigned long durationMs,
                    BoardTransitionPhase phase,
                    BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint8_t edge = centerEdgeForElapsed(elapsedMs, durationMs);
  const uint8_t maxDistance = maxCenterDistance();
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t centerDistance = centerDistanceForColumn(col);
      const uint8_t comparisonDistance = phase == BoardTransitionPhase::Forward
          ? static_cast<uint8_t>(maxDistance - centerDistance)
          : centerDistance;
      if (comparisonDistance < edge) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonDistance == edge) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

void applyVenetian(const BoardFrame& fromFrame,
                   const BoardFrame& toFrame,
                   unsigned long elapsedMs,
                   unsigned long durationMs,
                   BoardTransitionPhase phase,
                   BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const unsigned long totalSteps = Config::kPanelCols + 2;
  const unsigned long progressedSteps =
      (static_cast<uint64_t>(elapsedMs) * totalSteps) / durationMs;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t order = static_cast<uint8_t>((col / 2) + ((col % 2) == 0 ? 0 : ((Config::kPanelCols + 1) / 2)));
      const uint8_t comparisonOrder = phase == BoardTransitionPhase::Forward
          ? order
          : static_cast<uint8_t>((Config::kPanelCols - 1) - order);
      if (comparisonOrder < progressedSteps) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonOrder == progressedSteps) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

void applyMatrixRain(const BoardFrame& fromFrame,
                     const BoardFrame& toFrame,
                     unsigned long elapsedMs,
                     unsigned long durationMs,
                     BoardTransitionPhase phase,
                     BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const unsigned long baseDuration = durationMs / 2;
  const unsigned long staggerSpan = durationMs > baseDuration ? durationMs - baseDuration : durationMs / 3;
  const uint8_t maxStaggerSteps = Config::kPanelCols > 1 ? Config::kPanelCols - 1 : 1;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t staggerIndex = phase == BoardTransitionPhase::Forward
          ? static_cast<uint8_t>((col * 3) % Config::kPanelCols)
          : static_cast<uint8_t>((((Config::kPanelCols - 1) - col) * 3) % Config::kPanelCols);
      const unsigned long offset = (static_cast<uint64_t>(staggerSpan) * staggerIndex) / maxStaggerSteps;
      if (elapsedMs <= offset) {
        continue;
      }

      unsigned long localElapsed = elapsedMs - offset;
      if (localElapsed > baseDuration) {
        localElapsed = baseDuration;
      }

      const int16_t edge = rowEdgeForElapsed(localElapsed, baseDuration, phase == BoardTransitionPhase::Forward);
      if (phase == BoardTransitionPhase::Forward) {
        if (static_cast<int16_t>(row) < edge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(row) == edge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      } else {
        if (static_cast<int16_t>(row) > edge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(row) == edge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      }
    }
  }
}

void applyPulseRing(const BoardFrame& fromFrame,
                    const BoardFrame& toFrame,
                    unsigned long elapsedMs,
                    unsigned long durationMs,
                    BoardTransitionPhase phase,
                    BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint8_t edge = pulseEdgeForElapsed(elapsedMs, durationMs);
  const uint8_t maxDistance = maxPulseDistance();
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t pulseDistance = pulseDistanceForCell(row, col);
      const uint8_t comparisonDistance = phase == BoardTransitionPhase::Forward
          ? pulseDistance
          : static_cast<uint8_t>(maxDistance - pulseDistance);
      if (comparisonDistance < edge) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (comparisonDistance == edge) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}
} // namespace

unsigned long BoardTransition::adaptiveDurationMs(const BoardTransitionPlan& plan,
                                                  unsigned long minDurationMs,
                                                  unsigned long maxDurationMs) {
  if (plan.changedPixelCount == 0) {
    return 0;
  }

  if (maxDurationMs <= minDurationMs) {
    return minDurationMs;
  }

  const unsigned long durationRangeMs = maxDurationMs - minDurationMs;
  return minDurationMs +
         static_cast<unsigned long>((static_cast<uint64_t>(durationRangeMs) * plan.changedPixelCount) / kTotalPixels);
}

void BoardTransition::apply(BoardTransitionStyle style,
                            const BoardFrame& fromFrame,
                            const BoardFrame& toFrame,
                            const BoardTransitionPlan& plan,
                            unsigned long elapsedMs,
                            unsigned long durationMs,
                            BoardTransitionPhase phase,
                            BoardFrame& outFrame) {
  switch (style) {
    case BoardTransitionStyle::ColumnWipe:
      applyColumnWipe(
          fromFrame,
          toFrame,
          elapsedMs,
          durationMs,
          phase == BoardTransitionPhase::Forward ? BoardTransitionDirection::LeftToRight : BoardTransitionDirection::RightToLeft,
          outFrame);
      return;
    case BoardTransitionStyle::ReverseWipe:
      applyColumnWipe(
          fromFrame,
          toFrame,
          elapsedMs,
          durationMs,
          phase == BoardTransitionPhase::Forward ? BoardTransitionDirection::RightToLeft : BoardTransitionDirection::LeftToRight,
          outFrame);
      return;
    case BoardTransitionStyle::CenterSplit:
      applyCenterSplit(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::TopDrop:
      applyRowWipe(fromFrame, toFrame, elapsedMs, durationMs, phase == BoardTransitionPhase::Forward, outFrame);
      return;
    case BoardTransitionStyle::DiagonalWave:
      applyDiagonalWave(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::Constellation:
      applyRandomOverlap(fromFrame, toFrame, plan, elapsedMs, durationMs, outFrame);
      return;
    case BoardTransitionStyle::BottomRise:
      applyRowWipe(fromFrame, toFrame, elapsedMs, durationMs, phase != BoardTransitionPhase::Forward, outFrame);
      return;
    case BoardTransitionStyle::EdgeClose:
      applyEdgeClose(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::ReverseDiagonal:
      applyReverseDiagonalWave(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::MatrixRain:
      applyMatrixRain(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::Venetian:
      applyVenetian(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
    case BoardTransitionStyle::PulseRing:
      applyPulseRing(fromFrame, toFrame, elapsedMs, durationMs, phase, outFrame);
      return;
  }
}

void BoardTransition::applyColumnWipe(const BoardFrame& fromFrame,
                                      const BoardFrame& toFrame,
                                      unsigned long elapsedMs,
                                      unsigned long durationMs,
                                      BoardTransitionDirection direction,
                                      BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const int16_t wipeEdge = wipeEdgeForElapsed(elapsedMs, durationMs, direction);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (direction == BoardTransitionDirection::LeftToRight) {
        if (static_cast<int16_t>(col) < wipeEdge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(col) == wipeEdge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      } else {
        if (static_cast<int16_t>(col) > wipeEdge) {
          outFrame.pixels[row][col] = toFrame.pixels[row][col];
        } else if (static_cast<int16_t>(col) == wipeEdge) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      }
    }
  }
}

void BoardTransition::applyRandomOverlap(const BoardFrame& fromFrame,
                                         const BoardFrame& toFrame,
                                         const BoardTransitionPlan& plan,
                                         unsigned long elapsedMs,
                                         unsigned long durationMs,
                                         BoardFrame& outFrame) {
  if (plan.changedPixelCount == 0 || durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  outFrame = fromFrame;
  const uint16_t outgoingCount = transitionCountForElapsed(elapsedMs, durationMs, plan.changedPixelCount);
  const uint16_t incomingCount = transitionCountForElapsed(elapsedMs, durationMs, plan.changedPixelCount);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const bool shouldShowIncoming = plan.overlapIncomingRanks[row][col] < incomingCount;
      const bool shouldClearOutgoing = plan.overlapOutgoingRanks[row][col] < outgoingCount;
      if (shouldShowIncoming) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      } else if (shouldClearOutgoing) {
        outFrame.pixels[row][col] = CRGB::Black;
      }
    }
  }
}

const char* BoardTransition::label(BoardTransitionStyle style) {
  switch (style) {
    case BoardTransitionStyle::ColumnWipe:
      return "blade-sweep";
    case BoardTransitionStyle::ReverseWipe:
      return "counter-sweep";
    case BoardTransitionStyle::CenterSplit:
      return "center-bloom";
    case BoardTransitionStyle::TopDrop:
      return "skyfall";
    case BoardTransitionStyle::DiagonalWave:
      return "diagonal-rush";
    case BoardTransitionStyle::Constellation:
      return "constellation";
    case BoardTransitionStyle::BottomRise:
      return "ground-rise";
    case BoardTransitionStyle::EdgeClose:
      return "curtain-close";
    case BoardTransitionStyle::ReverseDiagonal:
      return "backslash";
    case BoardTransitionStyle::MatrixRain:
      return "matrix-rain";
    case BoardTransitionStyle::Venetian:
      return "venetian";
    case BoardTransitionStyle::PulseRing:
      return "pulse-ring";
  }

  return "blade-sweep";
}

void BoardTransition::prepare(BoardTransitionStyle style,
                              const BoardFrame& fromFrame,
                              const BoardFrame& toFrame,
                              BoardTransitionPlan& outPlan) {
  switch (style) {
    case BoardTransitionStyle::Constellation:
      prepareRandomOverlap(fromFrame, toFrame, outPlan);
      return;
    case BoardTransitionStyle::ColumnWipe:
    case BoardTransitionStyle::ReverseWipe:
    case BoardTransitionStyle::CenterSplit:
    case BoardTransitionStyle::TopDrop:
    case BoardTransitionStyle::DiagonalWave:
    case BoardTransitionStyle::BottomRise:
    case BoardTransitionStyle::EdgeClose:
    case BoardTransitionStyle::ReverseDiagonal:
    case BoardTransitionStyle::MatrixRain:
    case BoardTransitionStyle::Venetian:
    case BoardTransitionStyle::PulseRing:
      prepareColumnWipe(fromFrame, toFrame, outPlan);
      return;
  }
}

void BoardTransition::prepareColumnWipe(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan) {
  prepareSimplePlan(fromFrame, toFrame, outPlan);
}

void BoardTransition::prepareRandomOverlap(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan) {
  initializePlan(outPlan);
  outPlan.changedPixelCount = countChangedPixels(fromFrame, toFrame);
  assignRandomRanks(fromFrame, toFrame, outPlan.overlapOutgoingRanks);
  assignRandomRanks(fromFrame, toFrame, outPlan.overlapIncomingRanks);
}
