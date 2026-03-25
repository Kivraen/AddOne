#include "board_transition.h"

#include <esp_system.h>

namespace {
constexpr uint16_t kTotalPixels = Config::kPanelRows * Config::kPanelCols;
constexpr uint16_t kUnchangedPixelRank = 0xFFFF;
constexpr int16_t kRowCenter2x = Config::kPanelRows - 1;
constexpr int16_t kColCenter2x = Config::kPanelCols - 1;
constexpr uint8_t kMaxRowIndex = Config::kPanelRows - 1;
constexpr uint8_t kMaxColIndex = Config::kPanelCols - 1;

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

uint8_t styleIndex(BoardTransitionStyle style) {
  return static_cast<uint8_t>(style);
}

uint16_t shuffledPixelRank(uint8_t row, uint8_t col) {
  const uint16_t linearIndex = static_cast<uint16_t>(row) * Config::kPanelCols + col;
  return static_cast<uint16_t>(((linearIndex * 73U) + 41U) % kTotalPixels);
}

uint16_t primaryKeyForStyle(BoardTransitionStyle style, uint8_t row, uint8_t col) {
  switch (style) {
    case BoardTransitionStyle::RandomMix:
      return shuffledPixelRank(row, col);
    case BoardTransitionStyle::CenterBloom:
      return static_cast<uint16_t>(abs16(static_cast<int16_t>(row * 2) - kRowCenter2x) +
                                   abs16(static_cast<int16_t>(col * 2) - kColCenter2x));
    case BoardTransitionStyle::CurtainOpen:
      return abs16(static_cast<int16_t>(col * 2) - kColCenter2x);
    case BoardTransitionStyle::LeftSweep:
      return col;
    case BoardTransitionStyle::RightSweep:
      return static_cast<uint16_t>(kMaxColIndex - col);
    case BoardTransitionStyle::TopDrop:
      return row;
    case BoardTransitionStyle::BottomRise:
      return static_cast<uint16_t>(kMaxRowIndex - row);
    case BoardTransitionStyle::DiagonalDown:
      return static_cast<uint16_t>(row + col);
    case BoardTransitionStyle::DiagonalUp:
      return static_cast<uint16_t>(row + (kMaxColIndex - col));
    case BoardTransitionStyle::EdgeCollapse: {
      const uint8_t rowDistance = row < (kMaxRowIndex - row) ? row : static_cast<uint8_t>(kMaxRowIndex - row);
      const uint8_t colDistance = col < (kMaxColIndex - col) ? col : static_cast<uint8_t>(kMaxColIndex - col);
      return rowDistance < colDistance ? rowDistance : colDistance;
    }
    case BoardTransitionStyle::RandomOverlap:
      return 0;
    case BoardTransitionStyle::Count:
      return 0;
  }

  return 0;
}

uint16_t secondaryKeyForStyle(BoardTransitionStyle style, uint8_t row, uint8_t col) {
  if (style == BoardTransitionStyle::RandomMix) {
    return 0;
  }

  return shuffledPixelRank(row, col);
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
  for (uint8_t style = 0; style < kBoardTransitionStyleCount; ++style) {
    for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
      for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
        outPlan.pixelRanks[style][row][col] = kUnchangedPixelRank;
      }
    }
  }

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

void assignRanksForStyle(BoardTransitionStyle style,
                         const BoardFrame& fromFrame,
                         const BoardFrame& toFrame,
                         BoardTransitionPlan& outPlan) {
  TransitionPixelEntry entries[kTotalPixels]{};
  uint16_t entryCount = 0;
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (colorsMatch(fromFrame.pixels[row][col], toFrame.pixels[row][col])) {
        continue;
      }

      entries[entryCount].row = row;
      entries[entryCount].col = col;
      entries[entryCount].primaryKey = primaryKeyForStyle(style, row, col);
      entries[entryCount].secondaryKey = secondaryKeyForStyle(style, row, col);
      ++entryCount;
    }
  }

  sortEntries(entries, entryCount);

  const uint8_t index = styleIndex(style);
  for (uint16_t rank = 0; rank < entryCount; ++rank) {
    outPlan.pixelRanks[index][entries[rank].row][entries[rank].col] = rank;
  }
}

void assignRandomOverlapRanks(const BoardFrame& fromFrame,
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

void BoardTransition::applyTransition(const BoardFrame& fromFrame,
                                      const BoardFrame& toFrame,
                                      const BoardTransitionPlan& plan,
                                      BoardTransitionStyle style,
                                      unsigned long elapsedMs,
                                      unsigned long durationMs,
                                      BoardFrame& outFrame) {
  if (plan.changedPixelCount == 0 || durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  if (style == BoardTransitionStyle::RandomOverlap) {
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
    return;
  }

  outFrame = fromFrame;
  const uint16_t swapCount = transitionCountForElapsed(elapsedMs, durationMs, plan.changedPixelCount);
  const uint8_t index = styleIndex(style);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (plan.pixelRanks[index][row][col] < swapCount) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      }
    }
  }
}

void BoardTransition::preparePlan(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan) {
  initializePlan(outPlan);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (!colorsMatch(fromFrame.pixels[row][col], toFrame.pixels[row][col])) {
        ++outPlan.changedPixelCount;
      }
    }
  }

  assignRanksForStyle(BoardTransitionStyle::RandomMix, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::CenterBloom, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::CurtainOpen, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::LeftSweep, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::RightSweep, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::TopDrop, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::BottomRise, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::DiagonalDown, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::DiagonalUp, fromFrame, toFrame, outPlan);
  assignRanksForStyle(BoardTransitionStyle::EdgeCollapse, fromFrame, toFrame, outPlan);
  assignRandomOverlapRanks(fromFrame, toFrame, outPlan.overlapOutgoingRanks);
  assignRandomOverlapRanks(fromFrame, toFrame, outPlan.overlapIncomingRanks);
}

const char* BoardTransition::styleName(BoardTransitionStyle style) {
  switch (style) {
    case BoardTransitionStyle::RandomMix:
      return "random-mix";
    case BoardTransitionStyle::CenterBloom:
      return "center-bloom";
    case BoardTransitionStyle::CurtainOpen:
      return "curtain-open";
    case BoardTransitionStyle::LeftSweep:
      return "left-sweep";
    case BoardTransitionStyle::RightSweep:
      return "right-sweep";
    case BoardTransitionStyle::TopDrop:
      return "top-drop";
    case BoardTransitionStyle::BottomRise:
      return "bottom-rise";
    case BoardTransitionStyle::DiagonalDown:
      return "diagonal-down";
    case BoardTransitionStyle::DiagonalUp:
      return "diagonal-up";
    case BoardTransitionStyle::EdgeCollapse:
      return "edge-collapse";
    case BoardTransitionStyle::RandomOverlap:
      return "random-overlap";
    case BoardTransitionStyle::Count:
      return "unknown";
  }

  return "unknown";
}

uint16_t BoardTransition::pixelRank_(uint8_t row, uint8_t col) {
  return shuffledPixelRank(row, col);
}
