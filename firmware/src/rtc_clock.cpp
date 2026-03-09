#include "rtc_clock.h"

#include <RTClib.h>
#include <Wire.h>

#include "config.h"

namespace {
RTC_DS3231 gRtc;

bool isSaneUtc(time_t utc) {
  const time_t kMin = 1577836800;
  const time_t kMax = 2145916800;
  return utc >= kMin && utc <= kMax;
}
} // namespace

bool RtcClock::begin() {
  Wire.begin(Config::kI2cSdaPin, Config::kI2cSclPin);
  Wire.setClock(Config::kI2cClockHz);

  present_ = gRtc.begin();
  if (!present_) {
    lostPower_ = false;
    return false;
  }

  lostPower_ = gRtc.lostPower();
  return true;
}

bool RtcClock::readUtc(time_t& outUtc) const {
  if (!present_) {
    return false;
  }

  const time_t utc = static_cast<time_t>(gRtc.now().unixtime());
  if (!isSaneUtc(utc)) {
    return false;
  }

  outUtc = utc;
  return true;
}

bool RtcClock::setUtc(time_t utc) {
  if (!present_) {
    return false;
  }

  gRtc.adjust(DateTime(static_cast<uint32_t>(utc)));
  lostPower_ = false;
  return true;
}
