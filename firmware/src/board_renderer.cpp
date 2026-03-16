#include "board_renderer.h"

#include <ArduinoJson.h>
#include <stdlib.h>

#include "config.h"

namespace {
const CRGB kWifiReadyColor = CRGB(199, 144, 74);
const CRGB kWifiConnectedColor = CRGB(143, 211, 106);
constexpr uint8_t kDigitRows = 5;
constexpr uint8_t kDigitCols = 3;
constexpr uint8_t kClockTopRow = 1;
constexpr uint8_t kClockStartCol = 2;

const uint8_t kDigitGlyphs[10][kDigitRows] = {
    {0b111, 0b101, 0b101, 0b101, 0b111}, // 0
    {0b010, 0b110, 0b010, 0b010, 0b111}, // 1
    {0b111, 0b001, 0b111, 0b100, 0b111}, // 2
    {0b111, 0b001, 0b111, 0b001, 0b111}, // 3
    {0b101, 0b101, 0b111, 0b001, 0b001}, // 4
    {0b111, 0b100, 0b111, 0b001, 0b111}, // 5
    {0b111, 0b100, 0b111, 0b101, 0b111}, // 6
    {0b111, 0b001, 0b001, 0b001, 0b001}, // 7
    {0b111, 0b101, 0b111, 0b101, 0b111}, // 8
    {0b111, 0b101, 0b111, 0b001, 0b111}, // 9
};
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

BoardRenderer::Palette BoardRenderer::paletteForPreset_(const char* presetId) {
  if (presetId && strcmp(presetId, "amber") == 0) {
    return Palette{CRGB(246, 211, 154), CRGB(227, 169, 93), CRGB(248, 229, 190), CRGB(143, 78, 70), CRGB(216, 176, 107)};
  }
  if (presetId && strcmp(presetId, "ice") == 0) {
    return Palette{CRGB(217, 238, 245), CRGB(167, 217, 232), CRGB(232, 247, 253), CRGB(94, 112, 136), CRGB(120, 199, 216)};
  }
  if (presetId && strcmp(presetId, "rose") == 0) {
    return Palette{CRGB(243, 215, 216), CRGB(228, 164, 174), CRGB(248, 230, 232), CRGB(165, 84, 73), CRGB(216, 161, 164)};
  }

  return Palette{CRGB(245, 241, 232), CRGB(199, 144, 74), CRGB(245, 241, 232), CRGB(165, 84, 73), CRGB(143, 211, 106)};
}

CRGB BoardRenderer::colorFromHex_(const char* hex, const CRGB& fallback) {
  if (!hex || strlen(hex) != 7 || hex[0] != '#') {
    return fallback;
  }

  char* endPtr = nullptr;
  const long red = strtol(String(hex).substring(1, 3).c_str(), &endPtr, 16);
  if (!endPtr || *endPtr != '\0') {
    return fallback;
  }
  const long green = strtol(String(hex).substring(3, 5).c_str(), &endPtr, 16);
  if (!endPtr || *endPtr != '\0') {
    return fallback;
  }
  const long blue = strtol(String(hex).substring(5, 7).c_str(), &endPtr, 16);
  if (!endPtr || *endPtr != '\0') {
    return fallback;
  }

  return CRGB(static_cast<uint8_t>(red), static_cast<uint8_t>(green), static_cast<uint8_t>(blue));
}

void BoardRenderer::applyCustomPalette_(Palette& palette, const DeviceSettingsState& settings) {
  DynamicJsonDocument doc(384);
  if (deserializeJson(doc, settings.paletteCustomJson) != DeserializationError::Ok || !doc.is<JsonObject>()) {
    return;
  }

  JsonObject custom = doc.as<JsonObject>();
  if (custom["dayOn"].is<const char*>()) {
    palette.dayOn = colorFromHex_(custom["dayOn"], palette.dayOn);
  }
  if (custom["weekSuccess"].is<const char*>()) {
    palette.weekSuccess = colorFromHex_(custom["weekSuccess"], palette.weekSuccess);
  }
  if (custom["weekFail"].is<const char*>()) {
    palette.weekFail = colorFromHex_(custom["weekFail"], palette.weekFail);
  }
}

void BoardRenderer::render(const HabitTracker& tracker, const DeviceSettingsState& settings, const tm* localNow, uint8_t brightness) {
  clear_();
  Palette palette = paletteForPreset_(settings.palettePreset);
  applyCustomPalette_(palette, settings);

  const HabitTracker::WeeklyGrid& grid = tracker.grid();
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      if (grid.days[day][week]) {
        setPixel_(day, week, palette.dayOn);
      }
    }

    if (grid.success[week] > 0) {
      setPixel_(Config::kPanelRows - 1, week, palette.weekSuccess);
    } else if (grid.success[week] == 0) {
      setPixel_(Config::kPanelRows - 1, week, palette.weekFail);
    }
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

bool BoardRenderer::digitPixel_(uint8_t digit, uint8_t row, uint8_t col) {
  if (digit > 9 || row >= kDigitRows || col >= kDigitCols) {
    return false;
  }

  const uint8_t mask = static_cast<uint8_t>(1U << ((kDigitCols - 1) - col));
  return (kDigitGlyphs[digit][row] & mask) != 0;
}

void BoardRenderer::renderClockReward_(const Palette& palette, const tm& localNow) {
  const uint8_t hour = static_cast<uint8_t>(localNow.tm_hour);
  const uint8_t minute = static_cast<uint8_t>(localNow.tm_min);
  const uint8_t digits[4] = {
      static_cast<uint8_t>(hour / 10),
      static_cast<uint8_t>(hour % 10),
      static_cast<uint8_t>(minute / 10),
      static_cast<uint8_t>(minute % 10),
  };
  const uint8_t xOffsets[4] = {kClockStartCol, kClockStartCol + 4, kClockStartCol + 10, kClockStartCol + 14};

  for (uint8_t digitIndex = 0; digitIndex < 4; ++digitIndex) {
    for (uint8_t row = 0; row < kDigitRows; ++row) {
      for (uint8_t col = 0; col < kDigitCols; ++col) {
        if (digitPixel_(digits[digitIndex], row, col)) {
          setPixel_(kClockTopRow + row, xOffsets[digitIndex] + col, palette.rewardPrimary);
        }
      }
    }
  }

  setPixel_(kClockTopRow + 1, kClockStartCol + 8, palette.rewardSecondary);
  setPixel_(kClockTopRow + 3, kClockStartCol + 8, palette.rewardSecondary);
}

void BoardRenderer::renderPaintReward_(const Palette& palette, unsigned long elapsedMs) {
  const uint8_t phase = static_cast<uint8_t>((elapsedMs / 120UL) % 9UL);
  CRGB secondaryDim = palette.rewardSecondary;
  secondaryDim.nscale8_video(110);

  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      const uint8_t wave = static_cast<uint8_t>((row * 2U + col + phase) % 9U);
      if (wave <= 1U) {
        setPixel_(row, col, palette.rewardPrimary);
      } else if (wave <= 4U) {
        setPixel_(row, col, secondaryDim);
      }
    }
  }
}

void BoardRenderer::renderReward(const DeviceSettingsState& settings,
                                 RewardType rewardType,
                                 const tm* localNow,
                                 unsigned long elapsedMs,
                                 uint8_t brightness) {
  clear_();
  Palette palette = paletteForPreset_(settings.palettePreset);
  applyCustomPalette_(palette, settings);

  if (rewardType == RewardType::Clock && localNow) {
    renderClockReward_(palette, *localNow);
  } else {
    renderPaintReward_(palette, elapsedMs);
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::renderSetupState(bool apRunning, bool wifiConnected, uint8_t brightness) {
  clear_();
  if (wifiConnected) {
    setPixel_(3, 10, kWifiConnectedColor);
  } else if (apRunning) {
    setPixel_(3, 10, kWifiReadyColor);
  }
  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::setPixel_(uint8_t row, uint8_t col, const CRGB& color) {
  const uint16_t index = logicalToIndex_(row, col);
  if (index < kTotalLeds) {
    leds_[index] = color;
  }
}
