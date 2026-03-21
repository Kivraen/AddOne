#pragma once

#include <Preferences.h>

#include "provisioning_contract.h"

class ProvisioningStore {
public:
  void begin();
  void clearAllUserState();
  void clearPendingClaim();
  uint32_t incrementResetEpoch();
  uint32_t resetEpoch() const;
  bool hasPendingClaim() const;
  bool isReadyForTracking() const;
  bool loadPendingClaim(ProvisioningContract::PendingClaim& outClaim) const;
  void markReadyForTracking();
  bool savePendingClaim(const ProvisioningContract::PendingClaim& claim);

private:
  static constexpr const char* kNamespace = "ao_claim";
  static constexpr const char* kClaimTokenKey = "claimToken";
  static constexpr const char* kHardwareProfileHintKey = "hwProfile";
  static constexpr const char* kOnboardingSessionIdKey = "sessionId";
  static constexpr const char* kReadyForTrackingKey = "readyTrack";
  static constexpr const char* kResetEpochKey = "resetEpoch";
};
