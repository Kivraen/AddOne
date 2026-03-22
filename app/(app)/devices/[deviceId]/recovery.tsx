import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { ScreenFrame } from "@/components/layout/screen-frame";
import {
  SetupActionButton as ActionButton,
  SetupFeedbackOverlay,
  SetupInlineButton,
  SetupMetaText as MetaText,
  SetupNumberedSteps as NumberedSteps,
  SetupPasswordField as PasswordField,
  SetupProgressList,
  SetupRouteHeader,
  SetupSelectionCard as SelectionCard,
  SetupSelectionField as SelectionField,
  SetupStageLayout,
  SetupStepHeader as StepHeader,
  SetupTextField as TextField,
} from "@/components/setup/setup-flow";
import { WifiNetworkPicker } from "@/components/ui/wifi-network-picker";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSetupFlowController } from "@/hooks/use-setup-flow-controller";
import { isDeviceRecovering } from "@/lib/device-recovery";
import { deviceSettingsPath } from "@/lib/device-routes";

const RECOVERY_SUCCESS_RETURN_MS = 2400;
const RECOVERY_FIELD_GAP = 16;
const RECOVERY_META_TOP_SPACE = 22;
const RECOVERY_DEVICE_REFRESH_MS = 1500;

function makeRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const value = Math.floor(Math.random() * 16);
    const nextValue = token === "x" ? value : (value & 0x3) | 0x8;
    return nextValue.toString(16);
  });
}

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Session expires in under a minute";
  }

  return `Session expires in ${diffMinutes} minutes`;
}

export default function DeviceRecoveryRoute() {
  const router = useRouter();
  const routedDevice = useRoutedDevice();
  const { devices } = useDevices();
  const device = devices.find((candidate) => candidate.id === routedDevice.id) ?? routedDevice;
  const { refreshDevices } = useDeviceActions();
  const {
    cancelSession,
    claimToken,
    clearLocalOnboardingSession,
    createSession,
    isBusy,
    isRestoringBoard,
    markWaiting,
    refreshSession,
    restoreCandidates,
    restorePreviousBoard,
    session,
  } = useOnboarding({
    autoResumeLatestActiveSession: false,
    discardLocalSessionWhenExpiresSoonMs: 5 * 60_000,
    persistLocalSession: false,
    resumeStoredLocalSession: false,
  });
  const {
    checkAp,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const primaryRestoreCandidate =
    restoreCandidates.find((candidate) => candidate.boardId === device.boardId) ??
    restoreCandidates[0] ??
    null;
  const [hasRequestedAutoRestore, setHasRequestedAutoRestore] = useState(false);
  const hasRecoveryFlowInProgress =
    !!session &&
    !session.isExpired &&
    (session.status === "awaiting_ap" ||
      session.status === "awaiting_cloud" ||
      (session.status === "claimed" && (isDeviceRecovering(device) || hasRequestedAutoRestore || isRestoringBoard)));
  const showCompletingRecovery = hasRecoveryFlowInProgress && session?.status === "claimed" && device.recoveryState !== "ready";
  const recoveryCompleted =
    !!session &&
    !session.isExpired &&
    device.isLive &&
    device.recoveryState === "ready" &&
    (session.status === "claimed" || session.status === "awaiting_cloud" || hasRequestedAutoRestore || isRestoringBoard);
  const controller = useSetupFlowController({
    checkAp,
    claimToken,
    completionLabel: "Finishing recovery",
    flow: "recovery",
    hasCompletingPhase: showCompletingRecovery,
    hasReachedSuccess: recoveryCompleted,
    hardwareProfileHint: session?.hardwareProfileHint ?? "addone-v1",
    markWaiting,
    refreshSession,
    restoreLabel: "Restoring saved board",
    scanNetworks,
    session,
    submitProvisioning,
  });

  useEffect(() => {
    if (session || isBusy || controller.terminalFailure) {
      return;
    }

    void createSession({
      bootstrapDayResetTime: device.resetTime ? `${device.resetTime}:00` : "00:00:00",
      bootstrapTimezone: device.timezone,
      hardwareProfileHint: "addone-v1",
    });
  }, [controller.terminalFailure, createSession, device.resetTime, device.timezone, isBusy, session]);

  useEffect(() => {
    if (
      session?.status !== "claimed" ||
      !isDeviceRecovering(device) ||
      isRestoringBoard ||
      hasRequestedAutoRestore ||
      !primaryRestoreCandidate
    ) {
      return;
    }

    setHasRequestedAutoRestore(true);
    void restorePreviousBoard({
      backupId: primaryRestoreCandidate.backupId,
      deviceId: device.id,
      requestId: makeRequestId(),
    }).catch(() => {
      // The shared controller handles the visible recovery timeout/failure state.
      setHasRequestedAutoRestore(false);
    });
  }, [device.id, hasRequestedAutoRestore, isRestoringBoard, primaryRestoreCandidate, restorePreviousBoard, session?.status, device]);

  useEffect(() => {
    if (session?.status !== "claimed" || !isDeviceRecovering(device)) {
      setHasRequestedAutoRestore(false);
    }
  }, [device, session?.status]);

  useEffect(() => {
    if (!recoveryCompleted) {
      return;
    }

    const timeoutId = setTimeout(() => {
      clearLocalOnboardingSession();
      router.replace("/");
    }, RECOVERY_SUCCESS_RETURN_MS);

    return () => clearTimeout(timeoutId);
  }, [clearLocalOnboardingSession, recoveryCompleted, router]);

  useEffect(() => {
    if (controller.stage !== "reconnecting_board" && controller.stage !== "restoring_board") {
      return;
    }

    void refreshDevices({ probeDeviceId: device.id }).catch((error) => {
      console.warn("[recovery] refreshDevices failed", error);
    });
    const intervalId = setInterval(() => {
      void refreshDevices({ probeDeviceId: device.id }).catch((error) => {
        console.warn("[recovery] refreshDevices failed", error);
      });
    }, RECOVERY_DEVICE_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [controller.stage, device.id, refreshDevices]);

  function closeRecoveryScreen() {
    clearLocalOnboardingSession();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(deviceSettingsPath(device.id));
  }

  async function startRecoverySession(reason: string) {
    controller.resetLocalAttempt(reason);
    await createSession({
      bootstrapDayResetTime: device.resetTime ? `${device.resetTime}:00` : "00:00:00",
      bootstrapTimezone: device.timezone,
      hardwareProfileHint: "addone-v1",
    });
  }

  async function handleCancelRecovery() {
    controller.resetLocalAttempt("cancel_recovery");

    if (!session) {
      closeRecoveryScreen();
      return;
    }

    try {
      await cancelSession({
        reason: "Recovery cancelled from the app.",
        sessionId: session.id,
      });
    } catch {
      clearLocalOnboardingSession();
    }

    closeRecoveryScreen();
  }

  return (
    <>
      <ScreenFrame
        contentMaxWidth={theme.layout.narrowContentWidth}
        header={<SetupRouteHeader label="Recovery" onClose={closeRecoveryScreen} title="AddOne" />}
        scroll
      >
        <SetupFeedbackOverlay
          body={controller.overlay?.body}
          dismissible
          onClose={controller.dismissOverlay}
          title={controller.overlay?.title ?? "Status"}
          tone={controller.overlay?.tone ?? "neutral"}
          visible={!!controller.overlay}
        />

        <WifiNetworkPicker
          isScanning={controller.isScanningNetworks}
          networks={controller.networks}
          onClose={() => controller.setPickerVisible(false)}
          onSelect={(network) => controller.selectWifiNetwork(network.ssid)}
          selectedSsid={controller.draft.wifiSsid}
          visible={controller.pickerVisible}
        />

        <View style={{ gap: 6 }}>
          {controller.stage === "failure" ? (
            <SetupStageLayout
              footer={
                <ActionButton
                  disabled={isBusy}
                  label={isBusy ? "Restarting…" : "Restart recovery"}
                  onPress={() => void startRecoverySession("restart_recovery")}
                />
              }
            >
              <StepHeader
                step={1}
                subtitle={controller.terminalFailure?.message ?? "Start a fresh recovery session on this phone."}
                title={controller.terminalFailure?.title ?? "Restart recovery"}
              />
            </SetupStageLayout>
          ) : null}

          {controller.stage === "intro" || controller.stage === "join_device_ap" ? (
            <SetupStageLayout
              footer={
                <ActionButton
                  disabled={!session || isBusy || controller.isCheckingAp || controller.isScanningNetworks}
                  label={!session || isBusy ? "Preparing…" : controller.isCheckingAp || controller.isScanningNetworks ? "Checking…" : "I joined AddOne Wi‑Fi"}
                  onPress={() => void controller.confirmJoinedDeviceAp()}
                />
              }
            >
              <StepHeader
                step={1}
                subtitle="Join the temporary AddOne network on this phone, then come back here."
                title="Join AddOne Wi‑Fi"
              />
              <NumberedSteps
                steps={[
                  "Open Settings > Wi‑Fi.",
                  "Join the network that starts with AddOne_XXXX.",
                  "Come back here when the phone is connected.",
                ]}
              />
            </SetupStageLayout>
          ) : null}

          {controller.stage === "scan_home_wifi" ? (
            <SetupStageLayout>
              <StepHeader
                step={2}
                subtitle="Looking for the network your board should use."
                title="Scanning nearby Wi‑Fi"
              />
              <View style={{ alignItems: "center", flex: 1, justifyContent: "center", paddingVertical: 18 }}>
                <ActivityIndicator color={theme.colors.textPrimary} />
              </View>
            </SetupStageLayout>
          ) : null}

          {controller.stage === "choose_home_wifi" ? (
            <SetupStageLayout
              footer={
                <ActionButton
                  disabled={controller.isCheckingAp || controller.isSubmittingProvisioning || !controller.preparedRequest}
                  label={controller.isCheckingAp || controller.isSubmittingProvisioning ? "Connecting…" : "Connect"}
                  onPress={() => void controller.submitWifiCredentials()}
                />
              }
            >
              <StepHeader step={2} title="Home Wi‑Fi" />
              <View style={{ gap: RECOVERY_FIELD_GAP }}>
                {controller.manualWifiEntry || controller.networks.length === 0 ? (
                  <TextField
                    disabled={controller.isSubmittingProvisioning}
                    onChangeText={controller.setWifiSsid}
                    placeholder="Wi‑Fi name"
                    value={controller.draft.wifiSsid}
                  />
                ) : (
                  <SelectionField
                    disabled={controller.isSubmittingProvisioning}
                    onPress={controller.openNetworkPicker}
                    placeholder="Choose Wi‑Fi"
                    value={controller.draft.wifiSsid.trim()}
                  />
                )}

                <PasswordField
                  disabled={controller.isSubmittingProvisioning || !controller.draft.wifiSsid.trim()}
                  onChangeText={controller.setWifiPassword}
                  onToggleReveal={() => controller.setShowWifiPassword(!controller.showWifiPassword)}
                  placeholder="Password"
                  revealed={controller.showWifiPassword}
                  value={controller.draft.wifiPassword}
                />

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <SetupInlineButton
                    disabled={controller.isSubmittingProvisioning || controller.isScanningNetworks}
                    label={controller.isScanningNetworks ? "Scanning…" : "Rescan"}
                    onPress={() => void controller.rescanNetworks()}
                  />
                  {controller.manualWifiEntry && controller.networks.length > 0 ? (
                    <SetupInlineButton
                      disabled={controller.isSubmittingProvisioning}
                      label="Choose from list"
                      onPress={() => {
                        controller.setPickerVisible(true);
                      }}
                    />
                  ) : !controller.manualWifiEntry ? (
                    <SetupInlineButton
                      disabled={controller.isSubmittingProvisioning}
                      label="Type manually"
                      onPress={controller.enableManualWifiEntry}
                    />
                  ) : null}
                  {!controller.manualWifiEntry && controller.networks.length > 6 ? (
                    <SetupInlineButton
                      disabled={controller.isSubmittingProvisioning}
                      label="All networks"
                      onPress={controller.openNetworkPicker}
                    />
                  ) : null}
                </View>

                {controller.failureState?.retryable ? (
                  <Text
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {controller.failureState.message}
                  </Text>
                ) : null}
              </View>
            </SetupStageLayout>
          ) : null}

          {controller.stage === "reconnecting_board" ? (
            <SetupStageLayout>
              <StepHeader
                step={3}
                subtitle="Hold here while the board reconnects."
                title="Connecting your board"
              />
              <View style={{ gap: 18 }}>
                {controller.draft.wifiSsid.trim() ? <SelectionCard label="Home network" value={controller.draft.wifiSsid.trim()} /> : null}
                <SetupProgressList steps={controller.progressRows} />
              </View>
            </SetupStageLayout>
          ) : null}

          {controller.stage === "restoring_board" ? (
            <SetupStageLayout>
              <StepHeader
                step={3}
                subtitle="Hold here while recovery finishes."
                title="Restoring your board"
              />
              <View style={{ gap: 18 }}>
                {controller.draft.wifiSsid.trim() ? <SelectionCard label="Home network" value={controller.draft.wifiSsid.trim()} /> : null}
                <SetupProgressList steps={controller.progressRows} />
              </View>
            </SetupStageLayout>
          ) : null}

          {controller.stage === "success" ? (
            <SetupStageLayout>
              <StepHeader
                step={3}
                subtitle="Hold here while the board reconnects."
                title="Connecting your board"
              />
              <SetupProgressList steps={controller.progressRows} />
            </SetupStageLayout>
          ) : null}

          {session ? (
            <View style={{ paddingTop: RECOVERY_META_TOP_SPACE }}>
              <MetaText>{formatExpirationLabel(session.expiresAt)}</MetaText>
            </View>
          ) : null}
        </View>
      </ScreenFrame>

      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
    </>
  );
}
