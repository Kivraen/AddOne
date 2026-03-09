#include "device_identity.h"

String DeviceIdentity::hardwareUid() const {
  const uint64_t chipid = ESP.getEfuseMac();
  uint8_t mac[6];
  mac[0] = (chipid >> 0) & 0xFF;
  mac[1] = (chipid >> 8) & 0xFF;
  mac[2] = (chipid >> 16) & 0xFF;
  mac[3] = (chipid >> 24) & 0xFF;
  mac[4] = (chipid >> 32) & 0xFF;
  mac[5] = (chipid >> 40) & 0xFF;

  char id[24];
  snprintf(id, sizeof(id), "AO_%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(id);
}

String DeviceIdentity::apSsid() const {
  const String uid = hardwareUid();
  return "AddOne-" + uid.substring(uid.length() - 4);
}
