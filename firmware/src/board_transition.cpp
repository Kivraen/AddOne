#include "board_transition.h"

#include <esp_system.h>

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

void BoardTransition::prepareRandomOverlap(const BoardFrame& fromFrame, const BoardFrame& toFrame, BoardTransitionPlan& outPlan) {
  initializePlan(outPlan);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (!colorsMatch(fromFrame.pixels[row][col], toFrame.pixels[row][col])) {
        ++outPlan.changedPixelCount;
      }
    }
  }

  assignRandomRanks(fromFrame, toFrame, outPlan.overlapOutgoingRanks);
  assignRandomRanks(fromFrame, toFrame, outPlan.overlapIncomingRanks);
}
