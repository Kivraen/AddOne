#include "button_input.h"

#include "config.h"

void ButtonInput::begin() {
  pinMode(Config::kButtonPin, INPUT_PULLUP);
  lastReading_ = digitalRead(Config::kButtonPin);
  stableLevel_ = lastReading_;
  lastChangeAtMs_ = millis();
  shortPressPending_ = false;
}

bool ButtonInput::consumeShortPress() {
  if (!shortPressPending_) {
    return false;
  }

  shortPressPending_ = false;
  return true;
}

void ButtonInput::loop() {
  const bool reading = digitalRead(Config::kButtonPin);
  const unsigned long now = millis();

  if (reading != lastReading_) {
    lastReading_ = reading;
    lastChangeAtMs_ = now;
  }

  if ((now - lastChangeAtMs_) < Config::kButtonDebounceMs || reading == stableLevel_) {
    return;
  }

  stableLevel_ = reading;
  if (stableLevel_ == LOW) {
    shortPressPending_ = true;
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
