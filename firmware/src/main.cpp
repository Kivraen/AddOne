#include <Arduino.h>

#include "config.h"
#include "firmware_app.h"

namespace {
FirmwareApp gApp;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  gApp.begin();
}

void loop() {
  gApp.loop();
  delay(Config::kMainLoopDelayMs);
}
