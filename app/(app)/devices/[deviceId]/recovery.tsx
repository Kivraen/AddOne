import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { ScreenFrame } from "@/components/layout/screen-frame";
import {
  SetupActionButton as ActionButton,
  SetupFeedbackOverlay,
  SetupInlineButton,
  SetupNumberedSteps as NumberedSteps,
  SetupPasswordField as PasswordField,
  SetupProgressList,
  SetupRouteHeader,
  SetupSelectionCard as SelectionCard,
  SetupSelectionField as SelectionField,
  SetupBottomActionBar,
  SetupStageLayout,
  SetupStageScene,
  SetupStageSwap,
  SetupStepHeader as StepHeader,
  SetupTextField as TextField,
  SetupWifiScanState,
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
const RECOVERY_DEVICE_REFRESH_MS = 1500;

function makeRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const value = Math.floor(Math.random() * 16);
    const nextValue = token === "x" ? value : (value & 0x3) | 0x8;
    return nextValue.toString(16);
  });
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
  const [suppressInitialSceneAnimation, setSuppressInitialSceneAnimation] = useState(true);
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
  const showRecoveryHomeWifiStage = controller.stage === "scan_home_wifi" || controller.stage === "choose_home_wifi";
  const selectedWifiSsid = controller.draft.wifiSsid.trim();
  const recoveryHomeWifiStageState =
    controller.stage === "scan_home_wifi"
      ? "loading"
      : controller.manualWifiEntry || controller.networks.length === 0
        ? "manual"
        : "picker";
  const recoveryHeaderStepLabel =
    controller.stage === "failure" || controller.stage === "intro" || controller.stage === "join_device_ap"
      ? "Step 1 of 3"
      : showRecoveryHomeWifiStage
        ? "Step 2 of 3"
        : controller.stage === "reconnecting_board" || controller.stage === "restoring_board" || controller.stage === "success"
          ? "Step 3 of 3"
          : undefined;

  useEffect(() => {
    setSuppressInitialSceneAnimation(false);
  }, []);

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

  const recoveryBottomAction =
    controller.stage === "failure"
      ? (
          <ActionButton
            disabled={isBusy}
            label={isBusy ? "Restarting…" : "Restart recovery"}
            onPress={() => void startRecoverySession("restart_recovery")}
          />
        )
      : controller.stage === "intro"
        ? <ActionButton disabled label="Preparing…" onPress={() => undefined} />
        : controller.stage === "join_device_ap"
          ? (
              <ActionButton
                disabled
                label={controller.isCheckingAp ? "Checking AddOne Wi‑Fi…" : "Waiting for AddOne Wi‑Fi…"}
                onPress={() => void controller.confirmJoinedDeviceAp()}
              />
            )
          : showRecoveryHomeWifiStage
            ? (
                <ActionButton
                  disabled={
                    controller.stage === "scan_home_wifi" ||
                    controller.isCheckingAp ||
                    controller.isSubmittingProvisioning ||
                    !controller.preparedRequest
                  }
                  label={
                    controller.stage === "scan_home_wifi"
                      ? "Scanning…"
                      : controller.isCheckingAp || controller.isSubmittingProvisioning
                        ? "Connecting…"
                        : "Connect"
                  }
                  onPress={() => void controller.submitWifiCredentials()}
                />
              )
            : null;

  return (
    <>
      <ScreenFrame
        bottomOverlay={recoveryBottomAction ? <SetupBottomActionBar>{recoveryBottomAction}</SetupBottomActionBar> : undefined}
        contentContainerStyle={{ flexGrow: 1 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        header={<SetupRouteHeader onClose={closeRecoveryScreen} stepLabel={recoveryHeaderStepLabel} />}
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
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_failure">
              <SetupStageLayout>
                <StepHeader
                  step={1}
                  subtitle={controller.terminalFailure?.message ?? "Start a fresh recovery session on this phone."}
                  title={controller.terminalFailure?.title ?? "Restart recovery"}
                />
              </SetupStageLayout>
            </SetupStageScene>
          ) : null}

          {controller.stage === "intro" ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_intro">
              <SetupStageLayout>
                <StepHeader
                  step={1}
                  subtitle="Start a recovery session on this phone."
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
            </SetupStageScene>
          ) : null}

          {controller.stage === "join_device_ap" ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_join_device_ap">
              <SetupStageLayout>
                <StepHeader
                  step={1}
                  subtitle="Join the temporary AddOne network on this phone. This screen continues automatically once the phone is connected."
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
            </SetupStageScene>
          ) : null}

          {showRecoveryHomeWifiStage ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_home_wifi">
              <SetupStageLayout>
                <StepHeader step={2} subtitle="Choose the Wi‑Fi network your board should use." title="Choose Wi‑Fi" />
                <SetupStageSwap gap={RECOVERY_FIELD_GAP} swapKey={`recovery_home_wifi_${recoveryHomeWifiStageState}`}>
                  {controller.stage === "scan_home_wifi" ? (
                    <SetupWifiScanState />
                  ) : (
                    <>
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

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
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
                    </>
                  )}
                </SetupStageSwap>
              </SetupStageLayout>
            </SetupStageScene>
          ) : null}

          {controller.stage === "reconnecting_board" ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_reconnecting_board">
              <SetupStageLayout>
                <StepHeader
                  step={3}
                  subtitle="Hold here while the board reconnects."
                  title="Connecting your board"
                />
                <View style={{ gap: 18 }}>
                  {selectedWifiSsid ? <SelectionCard label="Home network" value={selectedWifiSsid} /> : null}
                  <SetupProgressList steps={controller.progressRows} />
                </View>
              </SetupStageLayout>
            </SetupStageScene>
          ) : null}

          {controller.stage === "restoring_board" ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_restoring_board">
              <SetupStageLayout>
                <StepHeader
                  step={3}
                  subtitle="Hold here while recovery finishes."
                  title="Restoring your board"
                />
                <View style={{ gap: 18 }}>
                  {selectedWifiSsid ? <SelectionCard label="Home network" value={selectedWifiSsid} /> : null}
                  <SetupProgressList steps={controller.progressRows} />
                </View>
              </SetupStageLayout>
            </SetupStageScene>
          ) : null}

          {controller.stage === "success" ? (
            <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="recovery_success">
              <SetupStageLayout>
                <StepHeader
                  step={3}
                  subtitle="Hold here while the board reconnects."
                  title="Connecting your board"
                />
                <View style={{ gap: 18 }}>
                  {selectedWifiSsid ? <SelectionCard label="Home network" value={selectedWifiSsid} /> : null}
                  <SetupProgressList steps={controller.progressRows} />
                </View>
              </SetupStageLayout>
            </SetupStageScene>
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
