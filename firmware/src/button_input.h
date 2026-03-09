#pragma once

#include <Arduino.h>

class ButtonInput {
public:
  void begin();
  bool consumeShortPress();
  void loop();
  static bool recoveryHeldAtBoot();

private:
  uint8_t pendingPressCount_ = 0;
  bool lastRawPressed_ = false;
  bool stablePressed_ = false;
  unsigned long lastRawChangeAtMs_ = 0;
  unsigned long pressStartedAtMs_ = 0;
};
