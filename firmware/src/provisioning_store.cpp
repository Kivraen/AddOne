#include "provisioning_store.h"

#include <Arduino.h>

void ProvisioningStore::begin() {}

void ProvisioningStore::clearPendingClaim() {
  Preferences prefs;
  prefs.begin(kNamespace, false);
  prefs.remove(kClaimTokenKey);
  prefs.remove(kHardwareProfileHintKey);
  prefs.remove(kOnboardingSessionIdKey);
  prefs.end();
}

bool ProvisioningStore::hasPendingClaim() const {
  Preferences prefs;
  prefs.begin(kNamespace, true);
  const bool hasClaim = prefs.isKey(kClaimTokenKey) && prefs.isKey(kOnboardingSessionIdKey);
  prefs.end();
  return hasClaim;
}

bool ProvisioningStore::isReadyForTracking() const {
  Preferences prefs;
  prefs.begin(kNamespace, true);
  const bool ready = prefs.getBool(kReadyForTrackingKey, false);
  prefs.end();
  return ready;
}

bool ProvisioningStore::loadPendingClaim(ProvisioningContract::PendingClaim& outClaim) const {
  Preferences prefs;
  prefs.begin(kNamespace, true);
  const String claimToken = prefs.getString(kClaimTokenKey, "");
  const String hardwareProfileHint = prefs.getString(kHardwareProfileHintKey, "");
  const String onboardingSessionId = prefs.getString(kOnboardingSessionIdKey, "");
  prefs.end();

  if (claimToken.isEmpty() || onboardingSessionId.isEmpty()) {
    return false;
  }

  strncpy(outClaim.claimToken, claimToken.c_str(), sizeof(outClaim.claimToken) - 1);
  outClaim.claimToken[sizeof(outClaim.claimToken) - 1] = '\0';
  strncpy(outClaim.hardwareProfileHint, hardwareProfileHint.c_str(), sizeof(outClaim.hardwareProfileHint) - 1);
  outClaim.hardwareProfileHint[sizeof(outClaim.hardwareProfileHint) - 1] = '\0';
  strncpy(outClaim.onboardingSessionId, onboardingSessionId.c_str(), sizeof(outClaim.onboardingSessionId) - 1);
  outClaim.onboardingSessionId[sizeof(outClaim.onboardingSessionId) - 1] = '\0';
  return true;
}

bool ProvisioningStore::savePendingClaim(const ProvisioningContract::PendingClaim& claim) {
  if (claim.claimToken[0] == '\0' || claim.onboardingSessionId[0] == '\0') {
    return false;
  }

  Preferences prefs;
  prefs.begin(kNamespace, false);
  const bool okClaim = prefs.putString(kClaimTokenKey, claim.claimToken) > 0;
  prefs.putString(kHardwareProfileHintKey, claim.hardwareProfileHint);
  const bool okProfile = true;
  const bool okSession = prefs.putString(kOnboardingSessionIdKey, claim.onboardingSessionId) > 0;
  prefs.end();

  return okClaim && okProfile && okSession;
}

void ProvisioningStore::markReadyForTracking() {
  Preferences prefs;
  prefs.begin(kNamespace, false);
  prefs.putBool(kReadyForTrackingKey, true);
  prefs.end();
}
