#pragma once

#include <Arduino.h>

namespace Config {

constexpr const char* kFirmwareVersion = "2.0.0-alpha.1";
constexpr const char* kHardwareProfile = "addone-v1";

constexpr uint8_t kButtonPin = 33;
constexpr uint8_t kLedPin = 5;

constexpr uint8_t kPanelRows = 8;
constexpr uint8_t kPanelCols = 21;

constexpr uint16_t kRewardAutoDismissMs = 2500;
constexpr uint16_t kMainLoopDelayMs = 10;

} // namespace Config
