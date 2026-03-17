#pragma once

#include <Arduino.h>

#include "device_settings.h"
#include "rtc_clock.h"

class TimeService {
public:
  void applySettings(const DeviceSettingsState& settings);
  void begin();
  String currentLocalDate() const;
  String currentLogicalDate() const;
  String currentUtcIsoTimestamp() const;
  bool hasAuthoritativeTime() const;
  bool hasValidTime() const;
  bool nowLogical(tm& outLocalTime) const;
  bool nowLocal(tm& outLocalTime) const;
  bool rtcLostPower() const { return rtc_.lostPower(); }
  void update(bool wifiConnected);

private:
  void applyTimezone_(const char* timezoneIana);
  bool loadRtcToSystem_();
  static const char* posixTimezoneForIana_(const char* timezoneIana);
  static bool saneUtc_(time_t utc);
  void syncRtcFromSystem_();
  void startNtpSync_();

  char activeTimezoneIana_[64] = "America/Los_Angeles";
  uint16_t dayResetMinutes_ = 0;
  bool ntpStarted_ = false;
  bool rtcLoaded_ = false;
  unsigned long lastNtpKickAtMs_ = 0;
  unsigned long lastRtcWriteAtMs_ = 0;
  RtcClock rtc_{};
};
