#pragma once

#include <Arduino.h>

class AmbientLight {
public:
  void begin();
  void loop();

  uint16_t raw() const { return raw_; }
  uint16_t filteredRaw() const { return static_cast<uint16_t>(ema_ + 0.5f); }
  float normalized01() const { return norm01_; }

private:
  void sampleNow_();
  void updateNorm_();

  unsigned long lastSampleMs_ = 0;
  uint16_t raw_ = 0;
  float ema_ = 0.0f;
  float norm01_ = 0.0f;
};
