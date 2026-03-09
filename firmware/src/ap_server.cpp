#include "ap_server.h"

void ApServer::begin(const DeviceIdentity& identity, ProvisioningStore& provisioningStore) {
  identity_ = &identity;
  provisioningStore_ = &provisioningStore;
  running_ = true;

  Serial.printf("AP server placeholder ready for SSID %s\n", identity_->apSsid().c_str());
  Serial.printf("Target endpoints: %s and %s\n",
                ProvisioningContract::kInfoPath,
                ProvisioningContract::kSessionPath);
}

void ApServer::loop() {
  // Placeholder only: real AP + HTTP server implementation comes next.
}

void ApServer::stop() {
  running_ = false;
}
