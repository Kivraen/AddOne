#pragma once

#include <Arduino.h>

#include "cloud_client.h"
#include "device_identity.h"

enum class FirmwareState : uint8_t;
class WiFiClientSecure;

class OtaClient {
public:
  void begin(const DeviceIdentity& identity, CloudClient& cloudClient);
  const String& confirmedReleaseId() const;
  bool handleBeginUpdateCommand(const CloudClient::DeviceCommand& command, String& failureReason);
  void service(FirmwareState state,
               bool bootReadyForTracking,
               bool recoveryRequested,
               bool pendingFactoryReset,
               bool wifiConnected);

private:
  bool configureArtifactClient_(WiFiClientSecure& client) const;
  void clearAnnouncedDecision_();
  void clearSession_();
  bool downloadAndStageRelease_(const CloudClient::OtaReleaseEnvelope& release,
                                String& failureCode,
                                String& failureDetail);
  void failPendingBoot_(const String& failureCode, const String& failureDetail, bool wifiConnected);
  bool handlePendingConfirmation_(FirmwareState state,
                                  bool bootReadyForTracking,
                                  bool recoveryRequested,
                                  bool pendingFactoryReset,
                                  bool wifiConnected);
  bool handleRollbackRecovery_(bool wifiConnected);
  bool isHealthyRuntimeState_(FirmwareState state,
                              bool bootReadyForTracking,
                              bool recoveryRequested,
                              bool pendingFactoryReset) const;
  bool isRunningPendingVerify_() const;
  void loadPersistedState_();
  bool maybeCheckForRelease_(FirmwareState state,
                             bool bootReadyForTracking,
                             bool recoveryRequested,
                             bool pendingFactoryReset,
                             bool wifiConnected);
  void clearPendingProgressReport_();
  bool flushPendingProgressReport_(bool wifiConnected);
  void persistConfirmedReleaseId_(const String& releaseId);
  void persistSession_(const String& phase, const String& targetReleaseId);
  void queuePendingProgressReport_(const String& releaseId,
                                   const String& state,
                                   const String& failureCode,
                                   const String& failureDetail,
                                   bool clearSessionOnSuccess);
  bool reportDecisionState_(const CloudClient::OtaReleaseCheckResult& result);
  bool reportProgressBestEffort_(const String& releaseId,
                                 const String& state,
                                 const String& failureCode = "",
                                 const String& failureDetail = "");
  bool shouldAnnounceDecision_(const String& decision,
                               const String& releaseId,
                               const String& reason) const;
  bool startAuthorizedInstall_(const CloudClient::OtaReleaseCheckResult& result,
                               FirmwareState state,
                               bool bootReadyForTracking,
                               bool recoveryRequested,
                               bool pendingFactoryReset);

  CloudClient* cloudClient_ = nullptr;
  const DeviceIdentity* identity_ = nullptr;
  String confirmedReleaseId_{};
  String sessionPhase_{};
  String sessionTargetReleaseId_{};
  String lastAnnouncedDecision_{};
  String lastAnnouncedReason_{};
  String lastAnnouncedReleaseId_{};
  String pendingReportFailureCode_{};
  String pendingReportFailureDetail_{};
  String pendingReportReleaseId_{};
  String pendingReportState_{};
  unsigned long lastReleaseCheckAtMs_ = 0;
  unsigned long nextReleaseCheckRetryAtMs_ = 0;
  unsigned long pendingConfirmStartedAtMs_ = 0;
  bool pendingReportClearSession_ = false;
  bool pendingConfirmReported_ = false;
  bool releaseCheckPrimed_ = false;
  bool releaseCheckRequested_ = false;
};
