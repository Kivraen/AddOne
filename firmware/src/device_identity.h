#pragma once

#include <Arduino.h>

class DeviceIdentity {
public:
  String apSsid() const;
  String hardwareUid() const;
};
