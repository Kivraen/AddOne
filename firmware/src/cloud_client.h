#pragma once

#include <Arduino.h>

#include "device_identity.h"
#include "provisioning_contract.h"

class CloudClient {
public:
  void begin(const DeviceIdentity& identity);
  bool heartbeat();
  bool redeemPendingClaim(const ProvisioningContract::PendingClaim& claim);

private:
  const DeviceIdentity* identity_ = nullptr;
};
