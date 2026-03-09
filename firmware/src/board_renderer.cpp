#include "board_renderer.h"

#include "config.h"

namespace {
const CRGB kDayOnColor = CRGB(245, 241, 232);
const CRGB kTodayPendingColor = CRGB(199, 144, 74);
const CRGB kWeekFailColor = CRGB(165, 84, 73);
const CRGB kWeekSuccessColor = CRGB(143, 211, 106);
const CRGB kWifiReadyColor = CRGB(199, 144, 74);
const CRGB kWifiConnectedColor = CRGB(143, 211, 106);
} // namespace

void BoardRenderer::begin() {
  FastLED.addLeds<NEOPIXEL, Config::kLedPin>(leds_, kTotalLeds);
  FastLED.setDither(BINARY_DITHER);
  FastLED.setMaxPowerInVoltsAndMilliamps(static_cast<uint8_t>(Config::kLedVoltageMv / 1000),
                                         Config::kLedCurrentLimitMa);
  FastLED.setBrightness(min<uint8_t>(Config::kDefaultBrightness, Config::kSafeMaxBrightness));
  clear_();
  FastLED.show();
}

void BoardRenderer::clear_() {
  fill_solid(leds_, kTotalLeds, CRGB::Black);
}

uint16_t BoardRenderer::logicalToIndex_(uint8_t row, uint8_t col) const {
  if (row >= Config::kPanelRows || col >= Config::kPanelCols) {
    return kTotalLeds;
  }

  const bool evenColumn = (col % 2) == 0;
  const uint16_t columnBase = col * Config::kPanelRows;
  const uint16_t rowOffset = evenColumn ? row : (Config::kPanelRows - 1) - row;
  return columnBase + rowOffset;
}

void BoardRenderer::render(const HabitTracker& tracker, const tm* localNow) {
  clear_();

  const HabitTracker::WeeklyGrid& grid = tracker.grid();
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      if (grid.days[day][week]) {
        setPixel_(day, week, kDayOnColor);
      }
    }

    if (grid.success[week] > 0) {
      setPixel_(Config::kPanelRows - 1, week, kWeekSuccessColor);
    } else if (grid.success[week] == 0) {
      setPixel_(Config::kPanelRows - 1, week, kWeekFailColor);
    }
  }

  if (localNow) {
    const uint8_t todayRow = tracker.todayRow(*localNow);
    if (!grid.days[todayRow][0]) {
      setPixel_(todayRow, 0, kTodayPendingColor);
    }
  }

  FastLED.show();
}

void BoardRenderer::renderSetupState(bool apRunning, bool wifiConnected) {
  clear_();
  if (wifiConnected) {
    setPixel_(3, 10, kWifiConnectedColor);
  } else if (apRunning) {
    setPixel_(3, 10, kWifiReadyColor);
  }
  FastLED.show();
}

void BoardRenderer::setPixel_(uint8_t row, uint8_t col, const CRGB& color) {
  const uint16_t index = logicalToIndex_(row, col);
  if (index < kTotalLeds) {
    leds_[index] = color;
  }
}
