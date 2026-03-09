#pragma once

#include <Arduino.h>

#include "rtc_clock.h"

class TimeService {
public:
  void begin();
  String currentLocalDate() const;
  String currentUtcIsoTimestamp() const;
  bool hasValidTime() const;
  bool nowLocal(tm& outLocalTime) const;
  void update(bool wifiConnected);

private:
  bool loadRtcToSystem_();
  static bool saneUtc_(time_t utc);
  void syncRtcFromSystem_();
  void startNtpSync_();

  bool ntpStarted_ = false;
  bool rtcLoaded_ = false;
  unsigned long lastNtpKickAtMs_ = 0;
  unsigned long lastRtcWriteAtMs_ = 0;
  RtcClock rtc_{};
};
