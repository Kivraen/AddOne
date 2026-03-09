#pragma once

#include <Arduino.h>

class RtcClock {
public:
  bool begin();
  bool isPresent() const { return present_; }
  bool lostPower() const { return lostPower_; }
  bool readUtc(time_t& outUtc) const;
  bool setUtc(time_t utc);

private:
  bool present_ = false;
  bool lostPower_ = false;
};
