#pragma once

#include <Arduino.h>

class ButtonInput {
public:
  void begin();
  bool consumeShortPress();
  void loop();
  static bool recoveryHeldAtBoot();

private:
  bool lastReading_ = HIGH;
  bool stableLevel_ = HIGH;
  bool shortPressPending_ = false;
  unsigned long lastChangeAtMs_ = 0;
};
