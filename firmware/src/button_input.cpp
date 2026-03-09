#include "button_input.h"

#include "config.h"

void ButtonInput::begin() {
  pinMode(Config::kButtonPin, INPUT_PULLUP);
  pendingPressCount_ = 0;
  const bool pressed = digitalRead(Config::kButtonPin) == LOW;
  lastRawPressed_ = pressed;
  stablePressed_ = pressed;
  lastRawChangeAtMs_ = millis();
  pressStartedAtMs_ = pressed ? millis() : 0;
}

bool ButtonInput::consumeShortPress() {
  const bool hasPending = pendingPressCount_ > 0;
  if (hasPending) {
    pendingPressCount_--;
  }
  return hasPending;
}

void ButtonInput::loop() {
  const unsigned long nowMs = millis();
  const bool rawPressed = digitalRead(Config::kButtonPin) == LOW;

  if (rawPressed != lastRawPressed_) {
    lastRawPressed_ = rawPressed;
    lastRawChangeAtMs_ = nowMs;
  }

  if (rawPressed == stablePressed_) {
    return;
  }

  if (nowMs - lastRawChangeAtMs_ < Config::kButtonDebounceMs) {
    return;
  }

  stablePressed_ = rawPressed;
  if (stablePressed_) {
    pressStartedAtMs_ = nowMs;
    return;
  }

  if (pressStartedAtMs_ == 0) {
    return;
  }

  const unsigned long pressDurationMs = nowMs - pressStartedAtMs_;
  pressStartedAtMs_ = 0;
  if (pressDurationMs >= Config::kButtonDebounceMs && pendingPressCount_ < 255) {
    pendingPressCount_++;
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
