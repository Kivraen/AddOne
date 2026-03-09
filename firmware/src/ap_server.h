#pragma once

#include <Arduino.h>

#include "device_identity.h"
#include "provisioning_contract.h"
#include "provisioning_store.h"

class ApServer {
public:
  void begin(const DeviceIdentity& identity, ProvisioningStore& provisioningStore);
  bool isRunning() const { return running_; }
  void loop();
  void stop();

private:
  const DeviceIdentity* identity_ = nullptr;
  ProvisioningStore* provisioningStore_ = nullptr;
  bool running_ = false;
};
