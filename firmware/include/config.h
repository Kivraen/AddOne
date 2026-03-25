#pragma once

#include <Arduino.h>

namespace Config {

constexpr const char* kFirmwareVersion = "2.0.0-beta.1";
constexpr const char* kHardwareProfile = "addone-v1";
constexpr const char* kDefaultTimezonePosix = "PST8PDT,M3.2.0/2,M11.1.0/2";
constexpr const char* kNtpServer = "pool.ntp.org";
constexpr const char* kNtpServer2 = "time.nist.gov";
constexpr const char* kNtpServer3 = "time.google.com";
constexpr const char* kDefaultTimezoneIana = "America/Los_Angeles";

constexpr uint8_t kButtonPin = 33;
constexpr unsigned long kButtonDebounceMs = 25;
constexpr unsigned long kFactoryQaArmHoldMs = 3000;
constexpr unsigned long kRecoveryHoldMs = 5000;
constexpr unsigned long kFactoryResetHoldMs = 10000;
constexpr uint8_t kLedPin = 5;
constexpr uint8_t kAmbientLightPin = 34;

constexpr uint8_t kPanelRows = 8;
constexpr uint8_t kPanelCols = 21;
constexpr uint8_t kDaysPerWeek = 7;
constexpr uint8_t kWeeks = 21;
constexpr uint8_t kDefaultWeeklyMinimum = 3;

constexpr uint8_t kDefaultBrightness = 30;
constexpr uint8_t kSafeMaxBrightness = 40;
constexpr uint16_t kLedVoltageMv = 5000;
constexpr uint16_t kLedCurrentLimitMa = 1800;
constexpr uint8_t kMinVisibleBrightness = 2;
constexpr uint16_t kAmbientAdcDark = 150;
constexpr uint16_t kAmbientAdcBright = 3500;
constexpr unsigned long kAmbientSampleMs = 250;
constexpr float kAmbientEmaAlpha = 0.08f;

constexpr uint8_t kI2cSdaPin = 21;
constexpr uint8_t kI2cSclPin = 22;
constexpr uint32_t kI2cClockHz = 100000;

constexpr uint16_t kRewardAutoDismissMs = 2500;
constexpr unsigned long kFriendCelebrationStableMs = 15000;
constexpr unsigned long kFriendCelebrationEmitWindowMs = 60000;
constexpr unsigned long kFriendCelebrationMinDissolveMs = 450;
constexpr unsigned long kFriendCelebrationMaxDissolveMs = 4200;
constexpr uint8_t kFriendCelebrationTransitionAutoCycle = 255;
// 255 = auto-cycle, 0-9 follow the transition preview library order.
constexpr uint8_t kFriendCelebrationTransitionSelection = kFriendCelebrationTransitionAutoCycle;
constexpr unsigned long kFriendCelebrationDwellMs = 2500;
constexpr uint16_t kMainLoopDelayMs = 10;
constexpr unsigned long kWifiReconnectTimeoutMs = 15000;
constexpr unsigned long kNtpResyncMs = 3600000;
constexpr unsigned long kRtcWriteIntervalMs = 300000;

} // namespace Config
