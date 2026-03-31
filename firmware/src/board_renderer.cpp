#include "board_renderer.h"

#include <ArduinoJson.h>
#include <stdlib.h>

#include "config.h"

namespace {
const CRGB kRecoveryCenterColor = CRGB(70, 146, 255);
const CRGB kRecoveryCompletedColor = CRGB(88, 176, 255);
const CRGB kRecoveryActiveColor = CRGB(246, 249, 255);
const CRGB kRecoverySuccessColor = CRGB(120, 224, 138);
const CRGB kOnboardingLogoColor = CRGB(242, 244, 247);
const CRGB kStartupCheckColors[4] = {
    CRGB(255, 50, 150),
    CRGB(50, 255, 200),
    CRGB(200, 255, 50),
    CRGB(255, 150, 50),
};
const CRGB kResetRecoveryReadyColor = CRGB(60, 214, 215);
const CRGB kResetFactoryReadyColor = CRGB::Red;
const CRGB kWifiReadyColor = CRGB(199, 144, 74);
const CRGB kWifiConnectedColor = CRGB(143, 211, 106);
const CRGB kTimeErrorColor = CRGB(228, 110, 88);
constexpr unsigned long kStartupPixelDelayMs = 120;
constexpr unsigned long kStartupHoldMs = 2000;
constexpr uint8_t kStartupFadeStep = 2;
constexpr unsigned long kStartupFadeDelayMs = 40;
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

struct RecoveryPixel {
  uint8_t row;
  uint8_t col;
};

const RecoveryPixel kStartupCheckPixels[4] = {
    {4, 9},
    {5, 10},
    {4, 11},
    {3, 12},
};

CRGB pulseColor(const CRGB& base, uint8_t minScale, uint8_t maxScale) {
  CRGB result = base;
  const uint16_t phase = static_cast<uint16_t>((millis() / 16UL) % 512UL);
  const uint16_t triangle = phase < 256U ? phase : (511U - phase);
  const uint8_t scale = static_cast<uint8_t>(minScale + ((static_cast<uint16_t>(maxScale - minScale) * triangle) / 255U));
  result.nscale8_video(scale);
  return result;
}

CRGB smoothPulseColor(const CRGB& base, uint8_t minScale, uint8_t maxScale, unsigned long cadenceMs) {
  CRGB result = base;
  const unsigned long safeCadenceMs = cadenceMs == 0 ? 1 : cadenceMs;
  const uint8_t wave = sin8(static_cast<uint8_t>((millis() / safeCadenceMs) & 0xffU));
  const uint8_t scale = static_cast<uint8_t>(
      minScale + ((static_cast<uint16_t>(maxScale - minScale) * wave) / 255U));
  result.nscale8_video(scale);
  return result;
}

} // namespace

void BoardRenderer::clearFrame_(BoardFrame& frame) {
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      frame.pixels[row][col] = CRGB::Black;
    }
  }
}

void BoardRenderer::begin() {
  FastLED.addLeds<NEOPIXEL, Config::kLedPin>(leds_, kTotalLeds);
  FastLED.setDither(BINARY_DITHER);
  FastLED.setMaxPowerInVoltsAndMilliamps(static_cast<uint8_t>(Config::kLedVoltageMv / 1000),
                                         Config::kLedCurrentLimitMa);
  FastLED.setBrightness(min<uint8_t>(Config::kDefaultBrightness, Config::kSafeMaxBrightness));
  clear_();
  FastLED.show();
}

void BoardRenderer::playStartupAnimation(uint8_t brightness) {
  clear_();
  FastLED.setBrightness(brightness);
  FastLED.show();

  for (uint8_t index = 0; index < 4; ++index) {
    const RecoveryPixel& pixel = kStartupCheckPixels[index];
    setPixel_(pixel.row, pixel.col, kStartupCheckColors[index]);
    FastLED.show();
    delay(kStartupPixelDelayMs);
  }

  delay(kStartupHoldMs);

  for (int level = static_cast<int>(brightness); level >= 0; level -= kStartupFadeStep) {
    FastLED.setBrightness(static_cast<uint8_t>(level));
    FastLED.show();
    delay(kStartupFadeDelayMs);
  }

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
    return Palette{CRGB(255, 210, 63), CRGB(227, 169, 93), CRGB(248, 229, 190), CRGB(255, 90, 31), CRGB(255, 179, 0)};
  }
  if (presetId && strcmp(presetId, "ice") == 0) {
    return Palette{CRGB(234, 249, 255), CRGB(167, 217, 232), CRGB(232, 247, 253), CRGB(63, 99, 255), CRGB(56, 214, 255)};
  }
  if (presetId && strcmp(presetId, "rose") == 0) {
    return Palette{CRGB(125, 255, 0), CRGB(106, 240, 90), CRGB(216, 255, 200), CRGB(255, 45, 0), CRGB(57, 255, 20)};
  }

  return Palette{CRGB(255, 255, 255), CRGB(199, 144, 74), CRGB(245, 241, 232), CRGB(255, 45, 0), CRGB(77, 255, 0)};
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
  applyCustomPaletteJson_(palette, settings.paletteCustomJson);
}

void BoardRenderer::applyCustomPaletteJson_(Palette& palette, const String& paletteCustomJson) {
  DynamicJsonDocument doc(384);
  if (deserializeJson(doc, paletteCustomJson) != DeserializationError::Ok || !doc.is<JsonObject>()) {
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

void BoardRenderer::setFramePixel_(BoardFrame& frame, uint8_t row, uint8_t col, const CRGB& color) {
  if (row >= Config::kPanelRows || col >= Config::kPanelCols) {
    return;
  }

  frame.pixels[row][col] = color;
}

void BoardRenderer::renderResetHoldState(ResetHoldVisualStage stage, uint8_t brightness) {
  clear_();

  const uint8_t centerRow = Config::kPanelRows / 2;
  const uint8_t centerCol = Config::kPanelCols / 2;

  if (stage == ResetHoldVisualStage::FactoryResetReady) {
    const CRGB center = pulseColor(kResetFactoryReadyColor, 150, 255);
    const CRGB petals = pulseColor(kResetFactoryReadyColor, 120, 220);
    setPixel_(centerRow, centerCol, center);
    setPixel_(centerRow, static_cast<uint8_t>(centerCol - 1), petals);
    setPixel_(static_cast<uint8_t>(centerRow - 1), centerCol, petals);
    setPixel_(centerRow, static_cast<uint8_t>(centerCol + 1), petals);
    setPixel_(static_cast<uint8_t>(centerRow + 1), centerCol, petals);
  } else if (stage == ResetHoldVisualStage::RecoveryReady) {
    const CRGB center = pulseColor(kResetRecoveryReadyColor, 150, 255);
    const CRGB petals = pulseColor(kResetRecoveryReadyColor, 120, 220);
    setPixel_(centerRow, centerCol, center);
    setPixel_(centerRow, static_cast<uint8_t>(centerCol - 1), petals);
    setPixel_(static_cast<uint8_t>(centerRow - 1), centerCol, petals);
    setPixel_(centerRow, static_cast<uint8_t>(centerCol + 1), petals);
    setPixel_(static_cast<uint8_t>(centerRow + 1), centerCol, petals);
  } else {
    setPixel_(centerRow, centerCol, pulseColor(kRecoveryCenterColor, 132, 255));
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::renderQaPattern(QaLedPattern pattern, uint8_t brightness, unsigned long elapsedMs) {
  clear_();

  switch (pattern) {
    case QaLedPattern::White:
      fill_solid(leds_, kTotalLeds, CRGB::White);
      break;
    case QaLedPattern::Red:
      fill_solid(leds_, kTotalLeds, CRGB::Red);
      break;
    case QaLedPattern::Green:
      fill_solid(leds_, kTotalLeds, CRGB::Green);
      break;
    case QaLedPattern::Blue:
      fill_solid(leds_, kTotalLeds, CRGB::Blue);
      break;
    case QaLedPattern::Mapping: {
      const uint16_t currentIndex = static_cast<uint16_t>((elapsedMs / 120UL) % kTotalLeds);
      const uint16_t previousIndex = currentIndex == 0 ? static_cast<uint16_t>(kTotalLeds - 1) : static_cast<uint16_t>(currentIndex - 1);
      leds_[0] = CRGB(255, 64, 64);
      leds_[kTotalLeds - 1] = CRGB(64, 128, 255);
      leds_[previousIndex] = CRGB(255, 180, 64);
      leds_[currentIndex] = CRGB::White;
      break;
    }
    case QaLedPattern::Off:
    default:
      break;
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::buildTrackingFrame(const HabitTracker& tracker, const DeviceSettingsState& settings, BoardFrame& outFrame) const {
  clearFrame_(outFrame);
  Palette palette = paletteForPreset_(settings.palettePreset);
  applyCustomPalette_(palette, settings);

  const HabitTracker::WeeklyGrid& grid = tracker.grid();
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      if (grid.days[day][week]) {
        setFramePixel_(outFrame, day, week, palette.dayOn);
      }
    }

    if (grid.success[week] > 0) {
      setFramePixel_(outFrame, Config::kPanelRows - 1, week, palette.weekSuccess);
    } else if (grid.success[week] == 0) {
      setFramePixel_(outFrame, Config::kPanelRows - 1, week, palette.weekFail);
    }
  }
}

bool BoardRenderer::buildSnapshotFrame(const String& boardDaysJson,
                                       uint8_t weeklyTarget,
                                       const String& weekTargetsJson,
                                       const char* palettePreset,
                                       const String& paletteCustomJson,
                                       BoardFrame& outFrame) const {
  clearFrame_(outFrame);
  Palette palette = paletteForPreset_(palettePreset);
  applyCustomPaletteJson_(palette, paletteCustomJson);

  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, boardDaysJson);
  if (error) {
    return false;
  }

  JsonArrayConst weeks = doc.as<JsonArrayConst>();
  if (weeks.isNull() || weeks.size() != Config::kWeeks) {
    return false;
  }

  const uint8_t normalizedWeeklyTarget = constrain(weeklyTarget, 1, Config::kDaysPerWeek);
  uint8_t parsedWeekTargets[Config::kWeeks]{};
  const bool hasWeekTargets = !weekTargetsJson.isEmpty();
  if (hasWeekTargets) {
    DynamicJsonDocument weekTargetsDoc(1024);
    DeserializationError weekTargetsError = deserializeJson(weekTargetsDoc, weekTargetsJson);
    if (weekTargetsError) {
      return false;
    }

    JsonArrayConst weekTargets = weekTargetsDoc.as<JsonArrayConst>();
    if (weekTargets.isNull() || weekTargets.size() != Config::kWeeks) {
      return false;
    }

    for (uint8_t week = 0; week < Config::kWeeks; ++week) {
      const int target = weekTargets[week] | 0;
      if (target < 1 || target > Config::kDaysPerWeek) {
        return false;
      }
      parsedWeekTargets[week] = static_cast<uint8_t>(target);
    }
  }

  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    JsonArrayConst weekDays = weeks[week].as<JsonArrayConst>();
    if (weekDays.isNull() || weekDays.size() != Config::kDaysPerWeek) {
      return false;
    }

    const uint8_t resolvedWeekTarget = hasWeekTargets ? parsedWeekTargets[week] : normalizedWeeklyTarget;
    uint8_t count = 0;
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      if (weekDays[day].as<bool>()) {
        setFramePixel_(outFrame, day, week, palette.dayOn);
        count++;
      }
    }

    if (week == 0) {
      if (count >= resolvedWeekTarget) {
        setFramePixel_(outFrame, Config::kPanelRows - 1, week, palette.weekSuccess);
      }
      continue;
    }

    setFramePixel_(
        outFrame,
        Config::kPanelRows - 1,
        week,
        count >= resolvedWeekTarget ? palette.weekSuccess : palette.weekFail);
  }

  return true;
}

void BoardRenderer::renderFrame(const BoardFrame& frame, uint8_t brightness) {
  clear_();
  for (uint8_t row = 0; row < Config::kPanelRows; ++row) {
    for (uint8_t col = 0; col < Config::kPanelCols; ++col) {
      setPixel_(row, col, frame.pixels[row][col]);
    }
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::render(const HabitTracker& tracker, const DeviceSettingsState& settings, const tm* localNow, uint8_t brightness) {
  (void)localNow;
  BoardFrame frame{};
  buildTrackingFrame(tracker, settings, frame);
  renderFrame(frame, brightness);
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

void BoardRenderer::drawWifiGlyph_(const CRGB& color) {
  const uint8_t pixels[][2] = {
      {1, 10},
      {2, 8}, {2, 9}, {2, 10}, {2, 11}, {2, 12},
      {3, 7}, {3, 13},
      {4, 6}, {4, 8}, {4, 12}, {4, 14},
      {5, 7}, {5, 9}, {5, 11}, {5, 13},
      {6, 10},
  };

  for (const auto& pixel : pixels) {
    setPixel_(pixel[0], pixel[1], color);
  }
}

void BoardRenderer::drawExclamationGlyph_(const CRGB& color) {
  for (uint8_t row = 1; row <= 4; ++row) {
    setPixel_(row, 10, color);
  }
  setPixel_(6, 10, color);
  setPixel_(4, 9, color);
  setPixel_(4, 11, color);
}

void BoardRenderer::renderRecoveryState(RecoveryVisualStage stage, uint8_t brightness) {
  clear_();

  const uint8_t centerRow = Config::kPanelRows / 2;
  const uint8_t centerCol = Config::kPanelCols / 2;
  CRGB centerColor = CRGB::Black;

  switch (stage) {
    case RecoveryVisualStage::PortalReady:
      centerColor = CRGB(70, 146, 255);
      break;
    case RecoveryVisualStage::CredentialsReceived:
      centerColor = smoothPulseColor(kRecoveryCenterColor, 12, 255, 6UL);
      break;
    case RecoveryVisualStage::WifiConnected:
    case RecoveryVisualStage::CloudConnected:
    case RecoveryVisualStage::RestoreApplied:
      centerColor = kRecoverySuccessColor;
      break;
    case RecoveryVisualStage::Failed:
      centerColor = CRGB::Red;
      break;
    default:
      centerColor = CRGB(70, 146, 255);
      break;
  }

  setPixel_(centerRow, centerCol, centerColor);

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::renderOnboardingHoldState(bool wifiConnected, uint8_t brightness) {
  (void)wifiConnected;
  clear_();
  for (const RecoveryPixel& pixel : kStartupCheckPixels) {
    setPixel_(pixel.row, pixel.col, kOnboardingLogoColor);
  }

  FastLED.setBrightness(brightness);
  FastLED.show();
}

void BoardRenderer::renderTimeErrorState(bool apRunning, bool wifiConnected, uint8_t brightness) {
  clear_();
  drawExclamationGlyph_(kTimeErrorColor);

  const CRGB wifiColor = wifiConnected ? kWifiConnectedColor : kWifiReadyColor;
  setPixel_(1, 15, wifiColor);
  setPixel_(2, 14, wifiColor);
  setPixel_(2, 16, wifiColor);
  setPixel_(3, 13, wifiColor);
  setPixel_(3, 17, wifiColor);
  setPixel_(4, 15, wifiColor);

  if (apRunning) {
    setPixel_(6, 2, kWifiReadyColor);
    setPixel_(6, 3, kWifiReadyColor);
    setPixel_(6, 4, kWifiReadyColor);
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
