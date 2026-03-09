#pragma once

#include <Arduino.h>

#include "device_identity.h"
#include "provisioning_contract.h"

class CloudClient {
public:
  void begin(const DeviceIdentity& identity);
  bool heartbeat();
  bool isConfigured() const;
  bool redeemPendingClaim(const ProvisioningContract::PendingClaim& claim);

private:
  bool ensureDeviceAuthToken_();
  bool postRpc_(const char* rpcName, const String& payload, String& responseBody);

  String deviceAuthToken_{};
  const DeviceIdentity* identity_ = nullptr;
};
