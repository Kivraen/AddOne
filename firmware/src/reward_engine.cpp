#include "reward_engine.h"

#include "config.h"

void RewardEngine::clear() {
  active_ = false;
  startedAtMs_ = 0;
  type_ = RewardType::Paint;
}

unsigned long RewardEngine::elapsedMs() const {
  if (!active_) {
    return 0;
  }

  return millis() - startedAtMs_;
}

void RewardEngine::start(const DeviceSettingsState& settings) {
  active_ = true;
  startedAtMs_ = millis();
  type_ = settings.rewardType;
}

bool RewardEngine::shouldDismiss() const {
  return active_ && elapsedMs() >= Config::kRewardAutoDismissMs;
}

bool RewardEngine::shouldTrigger(const DeviceSettingsState& settings,
                                 bool nowDone,
                                 int8_t weekSuccessBefore,
                                 int8_t weekSuccessAfter) const {
  if (!settings.rewardEnabled) {
    return false;
  }

  switch (settings.rewardTrigger) {
    case RewardTrigger::Daily:
      return nowDone;
    case RewardTrigger::Weekly:
      return weekSuccessBefore != 1 && weekSuccessAfter == 1;
    default:
      return false;
  }
}
