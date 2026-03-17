#pragma once

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

class ButtonInput {
public:
  ~ButtonInput();
  void begin();
  bool consumeLongHold();
  bool consumeShortPress();
  void loop();
  static bool recoveryHeldAtBoot();

private:
  static void pollTaskEntry_(void* context);
  void pollTask_();

  TaskHandle_t pollTaskHandle_ = nullptr;
  portMUX_TYPE pressMux_ = portMUX_INITIALIZER_UNLOCKED;
  volatile bool pendingLongHold_ = false;
  volatile uint8_t pendingPressCount_ = 0;
  bool longHoldReported_ = false;
  bool lastRawPressed_ = false;
  bool stablePressed_ = false;
  unsigned long lastRawChangeAtMs_ = 0;
  unsigned long pressStartedAtMs_ = 0;
};
