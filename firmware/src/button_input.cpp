#include "button_input.h"

#include "config.h"

ButtonInput::~ButtonInput() {
  if (pollTaskHandle_) {
    vTaskDelete(pollTaskHandle_);
    pollTaskHandle_ = nullptr;
  }
}

void ButtonInput::begin() {
  pinMode(Config::kButtonPin, INPUT_PULLUP);
  taskENTER_CRITICAL(&pressMux_);
  pendingPressCount_ = 0;
  taskEXIT_CRITICAL(&pressMux_);
  const bool pressed = digitalRead(Config::kButtonPin) == LOW;
  lastRawPressed_ = pressed;
  stablePressed_ = pressed;
  lastRawChangeAtMs_ = millis();
  pressStartedAtMs_ = pressed ? millis() : 0;

  if (!pollTaskHandle_) {
    xTaskCreatePinnedToCore(pollTaskEntry_, "addone_btn", 3072, this, 2, &pollTaskHandle_, 1);
  }
}

bool ButtonInput::consumeShortPress() {
  taskENTER_CRITICAL(&pressMux_);
  const bool hasPending = pendingPressCount_ > 0;
  if (hasPending) {
    pendingPressCount_--;
  }
  taskEXIT_CRITICAL(&pressMux_);
  return hasPending;
}

void ButtonInput::loop() {
  // Input capture runs in a dedicated task so network work in the main loop cannot block button presses.
}

void ButtonInput::pollTaskEntry_(void* context) {
  if (!context) {
    vTaskDelete(nullptr);
    return;
  }

  static_cast<ButtonInput*>(context)->pollTask_();
}

void ButtonInput::pollTask_() {
  for (;;) {
    const unsigned long nowMs = millis();
    const bool rawPressed = digitalRead(Config::kButtonPin) == LOW;

    if (rawPressed != lastRawPressed_) {
      lastRawPressed_ = rawPressed;
      lastRawChangeAtMs_ = nowMs;
    }

    if (rawPressed != stablePressed_ && nowMs - lastRawChangeAtMs_ >= Config::kButtonDebounceMs) {
      stablePressed_ = rawPressed;
      if (stablePressed_) {
        pressStartedAtMs_ = nowMs;
      } else if (pressStartedAtMs_ != 0) {
        const unsigned long pressDurationMs = nowMs - pressStartedAtMs_;
        pressStartedAtMs_ = 0;
        if (pressDurationMs >= Config::kButtonDebounceMs) {
          taskENTER_CRITICAL(&pressMux_);
          if (pendingPressCount_ < 255) {
            pendingPressCount_++;
          }
          taskEXIT_CRITICAL(&pressMux_);
        }
      }
    }

    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

bool ButtonInput::recoveryHeldAtBoot() {
  pinMode(Config::kButtonPin, INPUT_PULLUP);
  const unsigned long startedAt = millis();
  while (millis() - startedAt < Config::kRecoveryHoldMs) {
    if (digitalRead(Config::kButtonPin) == HIGH) {
      return false;
    }
    delay(10);
  }
  return true;
}
