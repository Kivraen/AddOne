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
  time_t currentUtc() const;
  bool hasAuthoritativeTime() const;
  bool hasValidTime() const;
  bool isRtcPresent() const { return rtc_.isPresent(); }
  bool nowLogical(tm& outLocalTime) const;
  bool nowLocal(tm& outLocalTime) const;
  bool readRtcUtc(time_t& outUtc) const;
  bool rtcLostPower() const { return rtc_.lostPower(); }
  bool setRtcUtc(time_t utc);
  void update(bool wifiConnected);

private:
  void applyTimezone_(const char* timezoneValue);
  bool loadRtcToSystem_();
  static bool parseFixedOffsetTimezone_(const char* timezoneValue, int16_t& outOffsetMinutes);
  static bool posixTimezoneForValue_(const char* timezoneValue, char* outValue, size_t outValueSize);
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
