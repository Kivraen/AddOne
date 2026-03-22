import { useEffect, useMemo, useRef, useState } from "react";

import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { DeviceApClientError } from "@/lib/device-ap-client";
import {
  buildSetupFailureState,
  buildSetupProgressRows,
  failureCodeFromApInfo,
  logSetupFlowEvent,
} from "@/lib/setup-flow";
import {
  ApProvisioningRequest,
  DeviceApNetworkScanResponse,
  DeviceApProvisioningInfo,
  DeviceApProvisioningResponse,
  DeviceApScannedNetwork,
  DeviceOnboardingSession,
  DeviceOnboardingStatus,
  SetupFlowFailureState,
  SetupFlowKind,
  SetupFlowOverlayState,
  SetupFlowProgressRow,
  SetupFlowStage,
} from "@/types/addone";

const RECONNECT_POLL_MS = 2_000;
const WIFI_RECONNECT_TIMEOUT_MS = 90_000;
const RESTORE_TIMEOUT_MS = 45_000;
const RECONNECT_AP_FAILURE_GRACE_MS = 7_000;

type SessionRefreshResult = { data?: DeviceOnboardingSession | null } | null;

interface UseSetupFlowControllerParams {
  checkAp: () => Promise<DeviceApProvisioningInfo>;
  claimToken: string | null;
  completionLabel: string;
  flow: SetupFlowKind;
  hasCompletingPhase: boolean;
  hasReachedSuccess: boolean;
  hardwareProfileHint?: string | null;
  markWaiting: (sessionId: string) => Promise<unknown>;
  refreshSession: () => Promise<SessionRefreshResult>;
  restoreLabel: string;
  scanNetworks: () => Promise<DeviceApNetworkScanResponse>;
  session: DeviceOnboardingSession | null;
  submitProvisioning: (request: ApProvisioningRequest) => Promise<DeviceApProvisioningResponse>;
}

function resettableFailureState(
  code: Parameters<typeof buildSetupFailureState>[0],
  overrides?: Partial<Pick<SetupFlowFailureState, "message" | "title">>,
) {
  return buildSetupFailureState(code, { retryable: true, ...overrides });
}

function sortNetworks(networks: DeviceApScannedNetwork[]) {
  return [...networks].sort((left, right) => {
    const leftRssi = left.rssi ?? -999;
    const rightRssi = right.rssi ?? -999;
    return rightRssi - leftRssi;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useSetupFlowController({
  checkAp,
  claimToken,
  completionLabel,
  flow,
  hasCompletingPhase,
  hasReachedSuccess,
  hardwareProfileHint = null,
  markWaiting,
  refreshSession,
  restoreLabel,
  scanNetworks,
  session,
  submitProvisioning,
}: UseSetupFlowControllerParams) {
  const {
    clearDraft,
    draft,
    preparedRequest,
    setWifiPassword,
    setWifiSsid,
    validation,
  } = useApProvisioning({
    claimToken,
    hardwareProfileHint,
    onboardingSessionId: session?.id ?? null,
  });
  const [hasValidatedAp, setHasValidatedAp] = useState(false);
  const [isCheckingAp, setIsCheckingAp] = useState(false);
  const [isScanningNetworks, setIsScanningNetworks] = useState(false);
  const [isSubmittingProvisioning, setIsSubmittingProvisioning] = useState(false);
  const [manualWifiEntry, setManualWifiEntry] = useState(false);
  const [overlay, setOverlay] = useState<SetupFlowOverlayState | null>(null);
  const [failureState, setFailureState] = useState<SetupFlowFailureState | null>(null);
  const [networks, setNetworks] = useState<DeviceApScannedNetwork[]>([]);
  const [networkScanComplete, setNetworkScanComplete] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [retryFromReconnect, setRetryFromReconnect] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [terminalFailure, setTerminalFailure] = useState<SetupFlowFailureState | null>(null);
  const [localReconnectStartedAtMs, setLocalReconnectStartedAtMs] = useState<number | null>(null);
  const [lastProvisioningSubmitAtMs, setLastProvisioningSubmitAtMs] = useState<number | null>(null);
  const [localSessionStatusOverride, setLocalSessionStatusOverride] = useState<DeviceOnboardingStatus | null>(null);
  const [hasSeenActiveProvisioningSinceSubmit, setHasSeenActiveProvisioningSinceSubmit] = useState(false);
  const previousSessionIdRef = useRef<string | null>(null);
  const previousStageRef = useRef<SetupFlowStage | null>(null);

  const isSessionActive =
    !!session &&
    !session.isExpired &&
    (session.status === "awaiting_ap" || session.status === "awaiting_cloud" || session.status === "claimed");
  const sessionMissingClaimContext = !!session && !session.isExpired && session.status !== "claimed" && !claimToken;
  const reconnectStartedAtMs =
    session?.waitingForDeviceAt && Number.isFinite(new Date(session.waitingForDeviceAt).getTime())
      ? new Date(session.waitingForDeviceAt).getTime()
      : localReconnectStartedAtMs;
  const effectiveSessionStatus = localSessionStatusOverride ?? session?.status ?? null;
  const shouldRetryCredentials = retryFromReconnect && effectiveSessionStatus === "awaiting_ap";
  const stage: SetupFlowStage = useMemo(() => {
    if (terminalFailure) {
      return "failure";
    }

    if (sessionMissingClaimContext) {
      return "failure";
    }

    if (!isSessionActive) {
      return "intro";
    }

    if (localReconnectStartedAtMs && effectiveSessionStatus !== "claimed") {
      return "reconnecting_board";
    }

    if (shouldRetryCredentials) {
      if (!hasValidatedAp) {
        return "join_device_ap";
      }

      return networkScanComplete ? "choose_home_wifi" : "scan_home_wifi";
    }

    if (effectiveSessionStatus === "awaiting_ap") {
      if (!hasValidatedAp) {
        return "join_device_ap";
      }

      return networkScanComplete ? "choose_home_wifi" : "scan_home_wifi";
    }

    if (effectiveSessionStatus === "awaiting_cloud") {
      return "reconnecting_board";
    }

    if (effectiveSessionStatus === "claimed") {
      if (hasReachedSuccess) {
        return "success";
      }

      if (hasCompletingPhase) {
        return "restoring_board";
      }
    }

    return "reconnecting_board";
  }, [
    hasCompletingPhase,
    hasReachedSuccess,
    hasValidatedAp,
    isSessionActive,
    localReconnectStartedAtMs,
    networkScanComplete,
    session?.status,
    effectiveSessionStatus,
    sessionMissingClaimContext,
    shouldRetryCredentials,
    terminalFailure,
  ]);
  const progressRows = useMemo<SetupFlowProgressRow[]>(
    () =>
      buildSetupProgressRows({
        completionLabel,
        flow,
        restoreLabel,
        stage,
      }),
    [completionLabel, flow, restoreLabel, stage],
  );

  function presentOverlay(nextFailure: SetupFlowFailureState) {
    setOverlay({
      body: nextFailure.message,
      title: nextFailure.title,
      tone: "error",
    });
  }

  function clearTransientState() {
    setFailureState(null);
    setOverlay(null);
    setRetryFromReconnect(false);
    setTerminalFailure(null);
  }

  function resetLocalAttempt(reason: string) {
    clearDraft();
    clearTransientState();
    setHasValidatedAp(false);
    setIsCheckingAp(false);
    setIsScanningNetworks(false);
    setIsSubmittingProvisioning(false);
    setLocalReconnectStartedAtMs(null);
    setLastProvisioningSubmitAtMs(null);
    setLocalSessionStatusOverride(null);
    setHasSeenActiveProvisioningSinceSubmit(false);
    setManualWifiEntry(false);
    setNetworkScanComplete(false);
    setNetworks([]);
    setPickerVisible(false);
    setShowWifiPassword(false);
    logSetupFlowEvent(flow, "local_reset", { reason });
  }

  function handleRetryableFailure(nextFailure: SetupFlowFailureState) {
    if (retryFromReconnect && failureState?.code === nextFailure.code) {
      return;
    }

    setFailureState(nextFailure);
    setLocalReconnectStartedAtMs(null);
    setLastProvisioningSubmitAtMs(null);
    setLocalSessionStatusOverride("awaiting_ap");
    setHasSeenActiveProvisioningSinceSubmit(false);
    setRetryFromReconnect(true);
    setOverlay(null);
  }

async function startWifiScan(options?: { openPickerOnSuccess?: boolean }) {
    setIsScanningNetworks(true);
    setNetworkScanComplete(false);
    setFailureState(null);
    setPickerVisible(false);
    logSetupFlowEvent(flow, "scan_start", {
      openPickerOnSuccess: options?.openPickerOnSuccess ?? true,
    });

    try {
      let nextNetworks: DeviceApScannedNetwork[] = [];

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await scanNetworks();
        nextNetworks = sortNetworks(response.networks);
        if (nextNetworks.length > 0) {
          if (attempt > 1) {
            logSetupFlowEvent(flow, "scan_success_after_retry", {
              attempt,
              networkCount: nextNetworks.length,
            });
          }
          break;
        }

        if (attempt < 3) {
          logSetupFlowEvent(flow, "scan_empty_retrying", { attempt });
          await sleep(1_200);
        }
      }

      setNetworks(nextNetworks);
      setNetworkScanComplete(true);
      if (nextNetworks.length === 0) {
        setManualWifiEntry(true);
        setFailureState(resettableFailureState("scan_empty"));
        return;
      }

      setManualWifiEntry(false);
      if (options?.openPickerOnSuccess ?? true) {
        setPickerVisible(true);
      }
      logSetupFlowEvent(flow, "scan_success", { networkCount: nextNetworks.length });
    } catch (error) {
      setNetworkScanComplete(true);
      setManualWifiEntry(true);
      setNetworks([]);
      setFailureState(
        resettableFailureState("scan_empty", {
          message: error instanceof Error ? error.message : "The board could not scan nearby networks. Type the Wi‑Fi name manually or rescan.",
        }),
      );
      logSetupFlowEvent(flow, "scan_error", {
        message: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setIsScanningNetworks(false);
    }
  }

  async function confirmJoinedDeviceAp() {
    setIsCheckingAp(true);
    setFailureState(null);
    setOverlay(null);
    setRetryFromReconnect(false);
    clearDraft();
    setNetworks([]);
    setNetworkScanComplete(false);
    setManualWifiEntry(false);
    setPickerVisible(false);
    logSetupFlowEvent(flow, "confirm_ap_start", { sessionId: session?.id ?? null });

    try {
      const info = await checkAp();
      setHasValidatedAp(true);
      setShowWifiPassword(false);
      logSetupFlowEvent(flow, "confirm_ap_success", {
        apSsid: info.device_ap_ssid,
        provisioningState: info.provisioning_state,
      });
    } catch (error) {
      const nextFailure =
        error instanceof DeviceApClientError && error.code === "ap_not_joined"
          ? buildSetupFailureState("ap_not_joined")
          : buildSetupFailureState("ap_not_joined", {
              message: error instanceof Error ? error.message : "Failed to reach the AddOne network.",
            });
      setHasValidatedAp(false);
      setFailureState(nextFailure);
      presentOverlay(nextFailure);
      logSetupFlowEvent(flow, "confirm_ap_error", { code: nextFailure.code, message: nextFailure.message });
    } finally {
      setIsCheckingAp(false);
    }
  }

  async function submitWifiCredentials() {
    if (isCheckingAp || isSubmittingProvisioning) {
      return;
    }

    if (!session || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      const nextFailure =
        !session || sessionMissingClaimContext
          ? buildSetupFailureState("session_stale")
          : buildSetupFailureState("wifi_join_failed", {
              message: firstError ?? "The Wi‑Fi details are incomplete.",
            });
      setFailureState(nextFailure);
      if (nextFailure.code === "session_stale") {
        setTerminalFailure(nextFailure);
      } else {
        presentOverlay(nextFailure);
      }
      return;
    }

    if (retryFromReconnect) {
      setIsCheckingAp(true);
      try {
        await checkAp();
        setHasValidatedAp(true);
      } catch (error) {
        const nextFailure =
          error instanceof DeviceApClientError && error.code === "ap_not_joined"
            ? buildSetupFailureState("ap_not_joined")
            : buildSetupFailureState("ap_not_joined", {
                message: error instanceof Error ? error.message : "Failed to reach the AddOne network.",
              });
        setHasValidatedAp(false);
        setFailureState(nextFailure);
        setNetworkScanComplete(false);
        setNetworks([]);
        setManualWifiEntry(false);
        setPickerVisible(false);
        setRetryFromReconnect(false);
        presentOverlay(nextFailure);
        logSetupFlowEvent(flow, "retry_submit_ap_missing", {
          code: nextFailure.code,
          message: nextFailure.message,
        });
        return;
      } finally {
        setIsCheckingAp(false);
      }
    }

    setIsSubmittingProvisioning(true);
    setFailureState(null);
    setOverlay(null);
    setRetryFromReconnect(false);
    setTerminalFailure(null);
    const optimisticReconnectStartedAt = Date.now();
    setLocalReconnectStartedAtMs(optimisticReconnectStartedAt);
    setLastProvisioningSubmitAtMs(optimisticReconnectStartedAt);
    setLocalSessionStatusOverride(null);
    setHasSeenActiveProvisioningSinceSubmit(false);
    logSetupFlowEvent(flow, "submit_wifi_start", {
      sessionId: session.id,
      ssid: draft.wifiSsid.trim(),
    });

    try {
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setLocalReconnectStartedAtMs(null);
        setLastProvisioningSubmitAtMs(null);
        const nextFailure = buildSetupFailureState("wifi_join_failed", {
          message: response.message ?? "The board did not accept those Wi‑Fi details.",
        });
        setFailureState(nextFailure);
        presentOverlay(nextFailure);
        logSetupFlowEvent(flow, "submit_wifi_rejected", { message: nextFailure.message });
        return;
      }

      setLocalReconnectStartedAtMs(optimisticReconnectStartedAt);
      logSetupFlowEvent(flow, "submit_wifi_accepted", {
        nextStep: response.next_step,
        rebootRequired: response.reboot_required,
      });
      void markWaiting(session.id).catch((error) => {
        logSetupFlowEvent(flow, "mark_waiting_race", {
          message: error instanceof Error ? error.message : "unknown",
        });
      });
    } catch (error) {
      setLocalReconnectStartedAtMs(null);
      setLastProvisioningSubmitAtMs(null);
      const nextFailure =
        error instanceof DeviceApClientError
          ? buildSetupFailureState(error.code, { message: error.message })
          : buildSetupFailureState("wifi_join_failed", {
              message: error instanceof Error ? error.message : "Failed to continue setup.",
            });
      setFailureState(nextFailure);
      presentOverlay(nextFailure);
      logSetupFlowEvent(flow, "submit_wifi_error", { code: nextFailure.code, message: nextFailure.message });
    } finally {
      setIsSubmittingProvisioning(false);
    }
  }

  function updateWifiSsid(nextValue: string) {
    setOverlay(null);
    setWifiSsid(nextValue);
    if (nextValue !== draft.wifiSsid) {
      setWifiPassword("");
    }
  }

  function updateWifiPassword(nextValue: string) {
    setOverlay(null);
    setWifiPassword(nextValue);
  }

  function selectWifiNetwork(ssid: string) {
    updateWifiSsid(ssid);
    setManualWifiEntry(false);
    setPickerVisible(false);
  }

  function enableManualWifiEntry() {
    setManualWifiEntry(true);
    setPickerVisible(false);
  }

  function openNetworkPicker() {
    if (networks.length > 0) {
      setPickerVisible(true);
      return;
    }

    if (!isScanningNetworks) {
      void startWifiScan({ openPickerOnSuccess: true });
    }
  }

  function dismissOverlay() {
    setOverlay(null);
  }

  useEffect(() => {
    if (!overlay) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setOverlay(null);
    }, 5_000);

    return () => clearTimeout(timeoutId);
  }, [overlay]);

  useEffect(() => {
    if (stage !== "scan_home_wifi" || !hasValidatedAp || isScanningNetworks || networkScanComplete) {
      return;
    }

    void startWifiScan({ openPickerOnSuccess: true });
  }, [hasValidatedAp, isScanningNetworks, networkScanComplete, stage]);

  useEffect(() => {
    const nextSessionId = session?.id ?? null;
    if (previousSessionIdRef.current === nextSessionId) {
      return;
    }

    previousSessionIdRef.current = nextSessionId;
    resetLocalAttempt("session_changed");
  }, [session?.id]);

  useEffect(() => {
    if (!sessionMissingClaimContext) {
      if (terminalFailure?.code === "session_stale") {
        setTerminalFailure(null);
      }
      return;
    }

    const nextFailure = buildSetupFailureState("session_stale");
    setTerminalFailure(nextFailure);
    setFailureState(nextFailure);
    logSetupFlowEvent(flow, "session_stale", { sessionId: session?.id ?? null });
  }, [flow, session?.id, sessionMissingClaimContext, terminalFailure?.code]);

  useEffect(() => {
    if (stage !== "reconnecting_board") {
      return;
    }

    let active = true;
    const intervalId = setInterval(() => {
      void (async () => {
        const refreshedSession = await refreshSession().catch(() => null);
        const nextStatus = refreshedSession?.data?.status ?? session?.status ?? null;
        if (!active) {
          return;
        }

        if (nextStatus === "claimed") {
          setLocalSessionStatusOverride(nextStatus);
          setLocalReconnectStartedAtMs(null);
          setRetryFromReconnect(false);
          return;
        }

        if (nextStatus === "awaiting_cloud") {
          setLocalSessionStatusOverride(nextStatus);
        }

        try {
          const info = await checkAp();
          if (!active) {
            return;
          }

          if (info.provisioning_state !== "ready") {
            setHasSeenActiveProvisioningSinceSubmit(true);
          }

          if (info.provisioning_state === "ready") {
            const withinFailureGraceWindow =
              !!lastProvisioningSubmitAtMs && Date.now() - lastProvisioningSubmitAtMs < RECONNECT_AP_FAILURE_GRACE_MS;
            if (withinFailureGraceWindow) {
              logSetupFlowEvent(flow, "reconnect_ap_failure_ignored_during_grace", {
                message: info.last_failure_reason ?? null,
              });
              return;
            }

            if (!hasSeenActiveProvisioningSinceSubmit) {
              logSetupFlowEvent(flow, "reconnect_ap_failure_ignored_before_active_attempt", {
                message: info.last_failure_reason ?? null,
              });
              return;
            }

            const failureCode = failureCodeFromApInfo(info) ?? "wifi_join_failed";
            handleRetryableFailure(
              buildSetupFailureState(failureCode, {
                message: info.last_failure_reason ?? buildSetupFailureState(failureCode).message,
              }),
            );
            logSetupFlowEvent(flow, "reconnect_failed_from_ap", {
              code: failureCode,
              message: info.last_failure_reason ?? null,
            });
          }
        } catch (error) {
          if (error instanceof DeviceApClientError && error.code === "ap_not_joined") {
            return;
          }

          logSetupFlowEvent(flow, "reconnect_ap_poll_error", {
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      })();
    }, RECONNECT_POLL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [checkAp, flow, hasSeenActiveProvisioningSinceSubmit, lastProvisioningSubmitAtMs, refreshSession, session?.status, stage]);

  useEffect(() => {
    if (stage !== "reconnecting_board" || !reconnectStartedAtMs) {
      return;
    }

    const remainingMs = WIFI_RECONNECT_TIMEOUT_MS - (Date.now() - reconnectStartedAtMs);
    if (remainingMs <= 0) {
      const nextFailure = buildSetupFailureState("cloud_claim_timeout");
      handleRetryableFailure(nextFailure);
      logSetupFlowEvent(flow, "reconnect_timeout", { startedAt: reconnectStartedAtMs });
      return;
    }

    const timeoutId = setTimeout(() => {
      const nextFailure = buildSetupFailureState("cloud_claim_timeout");
      handleRetryableFailure(nextFailure);
      logSetupFlowEvent(flow, "reconnect_timeout", { startedAt: reconnectStartedAtMs });
    }, remainingMs);

    return () => clearTimeout(timeoutId);
  }, [flow, reconnectStartedAtMs, stage]);

  useEffect(() => {
    if (stage !== "restoring_board") {
      return;
    }

    setLocalReconnectStartedAtMs(null);
    setLastProvisioningSubmitAtMs(null);
    setLocalSessionStatusOverride(session?.status ?? null);
    setHasSeenActiveProvisioningSinceSubmit(false);
    setRetryFromReconnect(false);
    if (failureState?.code === "cloud_claim_timeout") {
      setFailureState(null);
    }
    if (terminalFailure?.code === "cloud_claim_timeout") {
      setTerminalFailure(null);
    }
    setOverlay((current) => (current?.title === "Still waiting" ? null : current));

    const timeoutId = setTimeout(() => {
      const nextFailure = buildSetupFailureState("restore_failed");
      setFailureState(nextFailure);
      setTerminalFailure(nextFailure);
      presentOverlay(nextFailure);
      logSetupFlowEvent(flow, "restore_timeout", {
        sessionId: session?.id ?? null,
      });
    }, RESTORE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [flow, session?.id, stage]);

  useEffect(() => {
    if (hasReachedSuccess) {
      setLocalReconnectStartedAtMs(null);
      setLastProvisioningSubmitAtMs(null);
      setLocalSessionStatusOverride(session?.status ?? null);
      setHasSeenActiveProvisioningSinceSubmit(false);
      setRetryFromReconnect(false);
      setFailureState(null);
      setOverlay(null);
      setTerminalFailure(null);
    }
  }, [hasReachedSuccess, session?.status]);

  useEffect(() => {
    if (previousStageRef.current === stage) {
      return;
    }

    logSetupFlowEvent(flow, "stage_change", {
      from: previousStageRef.current,
      to: stage,
      hasValidatedAp,
      networkCount: networks.length,
      retryFromReconnect,
      sessionStatus: session?.status ?? null,
    });
    previousStageRef.current = stage;
  }, [flow, hasValidatedAp, networks.length, retryFromReconnect, session?.status, stage]);

  return {
    confirmJoinedDeviceAp,
    dismissOverlay,
    draft,
    enableManualWifiEntry,
    failureState,
    hasValidatedAp,
    isCheckingAp,
    isScanningNetworks,
    isSubmittingProvisioning,
    manualWifiEntry,
    networks,
    networkScanComplete,
    openNetworkPicker,
    overlay,
    pickerVisible,
    preparedRequest,
    progressRows,
    resetLocalAttempt,
    rescanNetworks: () => void startWifiScan({ openPickerOnSuccess: true }),
    selectWifiNetwork,
    setPickerVisible,
    setShowWifiPassword,
    setWifiPassword: updateWifiPassword,
    setWifiSsid: updateWifiSsid,
    showWifiPassword,
    stage,
    submitWifiCredentials,
    terminalFailure,
    validation,
  };
}
