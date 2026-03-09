#pragma once

#include <Preferences.h>

#include "provisioning_contract.h"

class ProvisioningStore {
public:
  void begin();
  void clearPendingClaim();
  bool hasPendingClaim() const;
  bool loadPendingClaim(ProvisioningContract::PendingClaim& outClaim) const;
  bool savePendingClaim(const ProvisioningContract::PendingClaim& claim);

private:
  static constexpr const char* kNamespace = "ao_claim";
  static constexpr const char* kClaimTokenKey = "claimToken";
  static constexpr const char* kHardwareProfileHintKey = "hwProfile";
  static constexpr const char* kOnboardingSessionIdKey = "sessionId";
};
