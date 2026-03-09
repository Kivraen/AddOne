#pragma once

#include <Arduino.h>

#include "device_settings.h"

class RewardEngine {
public:
  void clear();
  unsigned long elapsedMs() const;
  bool isActive() const { return active_; }
  RewardType type() const { return type_; }
  void start(const DeviceSettingsState& settings);
  bool shouldDismiss() const;
  bool shouldTrigger(const DeviceSettingsState& settings, bool nowDone, int8_t weekSuccessBefore, int8_t weekSuccessAfter) const;

private:
  bool active_ = false;
  unsigned long startedAtMs_ = 0;
  RewardType type_ = RewardType::Paint;
};
