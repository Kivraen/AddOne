#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

#include "device_settings.h"
#include "device_identity.h"
#include "habit_tracker.h"
#include "provisioning_contract.h"

class WiFiClientSecure;

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

  struct OtaReleaseArtifact {
    String kind{};
    String sha256{};
    String url{};
    uint32_t sizeBytes = 0;
  };

  struct OtaReleaseCompatibility {
    String minimumConfirmedFirmwareVersion{};
    String minimumPartitionLayout{};
  };

  struct OtaReleaseRollback {
    String previousStableReleaseId{};
    bool allowDowngradeToPreviousStable = false;
  };

  struct OtaReleaseBootConfirmation {
    uint32_t confirmWindowSeconds = 0;
    bool requireCloudCheckIn = false;
    bool requireNormalRuntimeState = false;
  };

  struct OtaReleaseEnvelope {
    OtaReleaseArtifact artifact{};
    OtaReleaseCompatibility compatibility{};
    OtaReleaseRollback rollback{};
    OtaReleaseBootConfirmation bootConfirmation{};
    String channel{};
    String firmwareVersion{};
    String hardwareProfile{};
    String installPolicy{};
    String partitionLayout{};
    String releaseId{};
    String rolloutMode{};
    String status{};
    uint32_t schemaVersion = 0;
    bool valid = false;
  };

  struct OtaReleaseCheckResult {
    OtaReleaseEnvelope release{};
    String decision{};
    String reason{};
    String targetReleaseId{};
    String requestId{};
    String commandId{};
    String requestedAt{};
    bool hasRelease = false;
    bool installAuthorized = false;
  };

  struct OtaStatusSnapshot {
    String currentState{};
    String targetReleaseId{};
    String confirmedReleaseId{};
    String lastFailureCode{};
    String lastFailureDetail{};
    String otaStartedAt{};
    String otaCompletedAt{};
    bool valid = false;
  };

  void begin(const DeviceIdentity& identity);
  bool ackCommand(const String& commandId, CommandAckStatus status, const String& lastError = "");
  void clearPersistedDeviceAuthToken();
  void clearPersistedMqttTransportCredentials();
  const String& deviceAuthToken();
  bool ensureMqttTransportCredentials();
  bool heartbeat();
  bool hasPersistedDeviceAuthToken() const;
  bool isConfigured() const;
  const String& mqttTransportPassword() const;
  const String& mqttTransportUsername() const;
  bool checkFirmwareRelease(OtaReleaseCheckResult& outResult, const String& currentConfirmedReleaseId);
  bool pullCommands(DeviceCommand* outCommands, size_t maxCommands, size_t& outCount);
  bool queueFriendCelebration(const String& sourceLocalDate,
                              const HabitTracker::WeekDate& currentWeekStart,
                              uint8_t todayRow,
                              uint8_t weeklyTarget,
                              const String& boardDaysJson,
                              const String& weekTargetsJson,
                              const String& palettePreset,
                              const String& paletteCustomJson,
                              const String& emittedAt);
  bool reportFactoryReset(uint32_t resetEpoch);
  bool reportOtaProgress(const String& releaseId,
                         const String& state,
                         const String& failureCode,
                         const String& failureDetail,
                         OtaStatusSnapshot* outStatus = nullptr);
  bool redeemPendingClaim(const ProvisioningContract::PendingClaim& claim, uint32_t resetEpoch);
  bool uploadRuntimeSnapshot(uint32_t revision,
                             const HabitTracker::WeekDate& currentWeekStart,
                             uint8_t todayRow,
                             const String& boardDaysJson,
                             const String& weekTargetsJson,
                             const String& settingsJson,
                             const String& generatedAt);

private:
  const char* ackStatusName_(CommandAckStatus status) const;
  bool configureSecureHttpClient_(WiFiClientSecure& client) const;
  bool ensureDeviceAuthToken_();
  bool extractRpcObject_(const String& responseBody, DynamicJsonDocument& document, JsonObjectConst& outObject) const;
  bool loadPersistedMqttTransportCredentials_();
  bool parseOtaReleaseEnvelope_(JsonVariantConst source, OtaReleaseEnvelope& outRelease) const;
  bool parseOtaStatusSnapshot_(JsonObjectConst source, OtaStatusSnapshot& outStatus) const;
  bool postRpc_(const char* rpcName, const String& payload, String& responseBody);

  String deviceAuthToken_{};
  String mqttBrokerPassword_{};
  String mqttBrokerUsername_{};
  const DeviceIdentity* identity_ = nullptr;
  bool authTokenProvisioningSuspended_ = false;
};
