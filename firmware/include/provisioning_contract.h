#pragma once

#include <Arduino.h>

namespace ProvisioningContract {

constexpr uint8_t kSchemaVersion = 1;
constexpr const char* kInfoPath = "/api/v1/provisioning/info";
constexpr const char* kSessionPath = "/api/v1/provisioning/session";

struct PendingClaim {
  char claimToken[128] = {0};
  char hardwareProfileHint[32] = {0};
  char onboardingSessionId[40] = {0};
};

enum class ProvisioningState : uint8_t {
  Ready = 0,
  Busy = 1,
  Provisioned = 2,
};

} // namespace ProvisioningContract
