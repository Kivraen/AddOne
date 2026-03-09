#pragma once

#include <Arduino.h>

#include "device_identity.h"
#include "provisioning_contract.h"

class CloudClient {
public:
  enum class CommandAckStatus : uint8_t {
    Applied = 0,
    Failed = 1,
    Cancelled = 2,
  };

  struct DayStateRecord {
    String deviceEventId{};
    String effectiveAt{};
    String localDate{};
    bool isDone = false;
  };

  struct DeviceCommand {
    String effectiveAt{};
    String id{};
    String kind{};
    String localDate{};
    bool hasSetDayStatePayload = false;
    bool isDone = false;
  };

  void begin(const DeviceIdentity& identity);
  bool ackCommand(const String& commandId, CommandAckStatus status, const String& lastError = "");
  bool heartbeat();
  bool isConfigured() const;
  bool pullCommands(DeviceCommand* outCommands, size_t maxCommands, size_t& outCount);
  bool recordDayState(const DayStateRecord& record);
  bool redeemPendingClaim(const ProvisioningContract::PendingClaim& claim);

private:
  const char* ackStatusName_(CommandAckStatus status) const;
  bool ensureDeviceAuthToken_();
  bool postRpc_(const char* rpcName, const String& payload, String& responseBody);

  String deviceAuthToken_{};
  const DeviceIdentity* identity_ = nullptr;
};
