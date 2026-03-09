#include "ambient_light.h"

#include "config.h"

namespace {
float clamp01(float value) {
  if (value < 0.0f) {
    return 0.0f;
  }
  if (value > 1.0f) {
    return 1.0f;
  }
  return value;
}
} // namespace

void AmbientLight::begin() {
  pinMode(Config::kAmbientLightPin, INPUT);

#if defined(ARDUINO_ARCH_ESP32)
  analogReadResolution(12);
  analogSetPinAttenuation(Config::kAmbientLightPin, ADC_11db);
#endif

  raw_ = analogRead(Config::kAmbientLightPin);
  ema_ = static_cast<float>(raw_);
  updateNorm_();
  lastSampleMs_ = millis();
}

void AmbientLight::loop() {
  const unsigned long now = millis();
  if (now - lastSampleMs_ < Config::kAmbientSampleMs) {
    return;
  }

  lastSampleMs_ = now;
  sampleNow_();
}

void AmbientLight::sampleNow_() {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < 4; ++i) {
    sum += static_cast<uint32_t>(analogRead(Config::kAmbientLightPin));
  }

  raw_ = static_cast<uint16_t>(sum / 4u);
  const float sample = static_cast<float>(raw_);
  ema_ = ema_ + Config::kAmbientEmaAlpha * (sample - ema_);
  updateNorm_();
}

void AmbientLight::updateNorm_() {
  const float dark = static_cast<float>(Config::kAmbientAdcDark);
  const float bright = static_cast<float>(Config::kAmbientAdcBright);
  const float denominator = bright - dark;
  if (denominator <= 1.0f) {
    norm01_ = 0.0f;
    return;
  }

  norm01_ = clamp01((ema_ - dark) / denominator);
}
