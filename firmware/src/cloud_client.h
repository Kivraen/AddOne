#pragma once

#include <Arduino.h>

#include "device_settings.h"
#include "device_identity.h"
#include "habit_tracker.h"
#include "provisioning_contract.h"

class CloudClient {
public:
  enum class CommandAckStatus : uint8_t {
    Applied = 0,
    Failed = 1,
    Cancelled = 2,
  };

  struct DeviceCommand {
    String payloadJson{};
    String effectiveAt{};
    String id{};
    String kind{};
    String localDate{};
    DeviceSettingsSyncPayload settingsSync{};
    uint32_t baseRevision = 0;
    bool hasBaseRevision = false;
    bool hasHistoryDraftPayload = false;
    bool hasSetDayStatePayload = false;
    bool hasSyncSettingsPayload = false;
    bool isDone = false;
  };

  void begin(const DeviceIdentity& identity);
  bool ackCommand(const String& commandId, CommandAckStatus status, const String& lastError = "");
  void clearPersistedDeviceAuthToken();
  const String& deviceAuthToken();
  bool heartbeat();
  bool hasPersistedDeviceAuthToken() const;
  bool isConfigured() const;
  bool pullCommands(DeviceCommand* outCommands, size_t maxCommands, size_t& outCount);
  bool queueFriendCelebration(const String& sourceLocalDate,
                              const HabitTracker::WeekDate& currentWeekStart,
                              uint8_t todayRow,
                              uint8_t weeklyTarget,
                              const String& boardDaysJson,
                              const String& palettePreset,
                              const String& paletteCustomJson,
                              const String& emittedAt);
  bool reportFactoryReset(uint32_t resetEpoch);
  bool redeemPendingClaim(const ProvisioningContract::PendingClaim& claim, uint32_t resetEpoch);
  bool uploadRuntimeSnapshot(uint32_t revision,
                             const HabitTracker::WeekDate& currentWeekStart,
                             uint8_t todayRow,
                             const String& boardDaysJson,
                             const String& settingsJson,
                             const String& generatedAt);

private:
  const char* ackStatusName_(CommandAckStatus status) const;
  bool ensureDeviceAuthToken_();
  bool registerDeviceAuthToken_();
  bool postRpc_(const char* rpcName, const String& payload, String& responseBody);

  String deviceAuthToken_{};
  const DeviceIdentity* identity_ = nullptr;
};
