#include "board_transition.h"

namespace {
constexpr uint16_t kTotalPixels = Config::kPanelRows * Config::kPanelCols;

uint16_t transitionCountForElapsed(unsigned long elapsedMs, unsigned long durationMs) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    return kTotalPixels;
  }

  return static_cast<uint16_t>((static_cast<uint64_t>(elapsedMs) * kTotalPixels) / durationMs);
}
} // namespace

void BoardTransition::applyRandomDissolve(const BoardFrame& fromFrame,
                                          const BoardFrame& toFrame,
                                          unsigned long elapsedMs,
                                          unsigned long durationMs,
                                          BoardFrame& outFrame) {
  if (durationMs == 0 || elapsedMs >= durationMs) {
    outFrame = toFrame;
    return;
  }

  const unsigned long phaseSplitMs = durationMs / 2UL;
  if (elapsedMs < phaseSplitMs) {
    outFrame = fromFrame;
    const uint16_t clearCount = transitionCountForElapsed(elapsedMs, phaseSplitMs == 0 ? 1 : phaseSplitMs);
    for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
      for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
        if (pixelRank_(row, col) < clearCount) {
          outFrame.pixels[row][col] = CRGB::Black;
        }
      }
    }
    return;
  }

  outFrame = BoardFrame{};
  const unsigned long secondPhaseElapsedMs = elapsedMs - phaseSplitMs;
  const unsigned long secondPhaseDurationMs = durationMs - phaseSplitMs;
  const uint16_t fillCount =
      transitionCountForElapsed(secondPhaseElapsedMs, secondPhaseDurationMs == 0 ? 1 : secondPhaseDurationMs);
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      if (pixelRank_(row, col) < fillCount) {
        outFrame.pixels[row][col] = toFrame.pixels[row][col];
      }
    }
  }
}

uint16_t BoardTransition::pixelRank_(uint8_t row, uint8_t col) {
  const uint16_t linearIndex = static_cast<uint16_t>(row) * Config::kPanelCols + col;
  return static_cast<uint16_t>(((linearIndex * 73U) + 41U) % kTotalPixels);
}
