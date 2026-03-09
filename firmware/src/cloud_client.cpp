#include "cloud_client.h"

void CloudClient::begin(const DeviceIdentity& identity) {
  identity_ = &identity;
}

bool CloudClient::heartbeat() {
  if (!identity_) {
    return false;
  }

  Serial.printf("Cloud heartbeat placeholder for %s\n", identity_->hardwareUid().c_str());
  return false;
}

bool CloudClient::redeemPendingClaim(const ProvisioningContract::PendingClaim& claim) {
  if (!identity_) {
    return false;
  }

  Serial.printf("Cloud redeem placeholder for %s using session %s\n",
                identity_->hardwareUid().c_str(),
                claim.onboardingSessionId);
  return false;
}
