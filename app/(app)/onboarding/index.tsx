import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import {
  SetupActionButton as ActionButton,
  SetupBodyText as BodyText,
  SetupFeedbackOverlay,
  SetupFieldLabel as FieldLabel,
  SetupFieldNote as FieldNote,
  SetupInlineButton,
  SetupPasswordField as PasswordField,
  SetupProgressList,
  SetupRouteHeader,
  SetupSelectionCard as SelectionCard,
  SetupSelectionField as SelectionField,
  SetupStageLayout,
  SetupStepHeader as StepHeader,
  SetupTextField as TextField,
} from "@/components/setup/setup-flow";
import { DeviceTimezonePicker } from "@/components/settings/device-timezone-picker";
import { ChoicePill } from "@/components/ui/choice-pill";
import { WifiNetworkPicker } from "@/components/ui/wifi-network-picker";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSetupFlowController } from "@/hooks/use-setup-flow-controller";
import { readCurrentPhoneTimezone, resolvePhoneTimezoneForDevice } from "@/lib/device-timezone";
import {
  DEFAULT_HABIT_NAME,
  HABIT_NAME_MAX_LENGTH,
  MINIMUM_GOAL_MAX_LENGTH,
  MINIMUM_GOAL_PLACEHOLDER,
  normalizeHabitNameForSave,
  normalizeMinimumGoalForSave,
  resolveHabitNameDraft,
} from "@/lib/habit-details";
import { captureOnboardingRestoreSource } from "@/lib/onboarding-restore";
import { useAppUiStore } from "@/store/app-ui-store";
import { RestoreChoice, SetupFlowStage } from "@/types/addone";

const CLAIMED_SESSION_DEVICE_GRACE_MS = 15000;
const ONBOARDING_FIELD_GAP = 16;
const SETUP_FEEDBACK_OVERLAY_MS = 5000;
const ONBOARDING_DEVICE_REFRESH_MS = 1500;

type ClaimedFlowStep = "habit" | "board";
type OnboardingStage = Exclude<SetupFlowStage, "success"> | "restore" | "habit" | "board";

function randomHexSegment(length: number) {
  let output = "";

  while (output.length < length) {
    output += Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  }

  return output.slice(0, length);
}

function makeRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return [
    randomHexSegment(8),
    randomHexSegment(4),
    `4${randomHexSegment(3)}`,
    `${(Math.floor(Math.random() * 4) + 8).toString(16)}${randomHexSegment(3)}`,
    randomHexSegment(12),
  ].join("-");
}

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Session expires in under a minute";
  }

  return `Session expires in ${diffMinutes} minutes`;
}

function FieldCounter({ current, max }: { current: number; max: number }) {
  return (
    <Text
      style={{
        color: theme.colors.textTertiary,
        fontFamily: theme.typography.micro.fontFamily,
        fontSize: theme.typography.micro.fontSize,
        lineHeight: theme.typography.micro.lineHeight,
        fontVariant: ["tabular-nums"],
      }}
    >
      {current}/{max}
    </Text>
  );
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ auto?: string | string[] }>();
  const router = useRouter();
  const { activeDevice, isLoading: areDevicesLoading } = useDevices();
  const activeOnboardingRestoreSource = useAppUiStore((state) => state.activeOnboardingRestoreSource);
  const setActiveOnboardingRestoreSource = useAppUiStore((state) => state.setActiveOnboardingRestoreSource);
  const {
    applySettingsDraft,
    isRefreshingRuntimeSnapshot,
    isSavingHistoryDraft,
    isSavingSettings,
    refreshDevices,
    refreshRuntimeSnapshot,
    saveActiveHabitMetadata,
    restoreBoardFromSnapshot,
  } = useDeviceActions();
  const activeDeviceMinimumGoal = activeDevice?.dailyMinimum ?? "";
  const {
    claimToken,
    clearLocalOnboardingSession,
    createSession,
    hasClaimToken,
    isBusy,
    isLoading: isOnboardingLoading,
    isRestoringBoard,
    markWaiting,
    refreshSession,
    restoreCandidates,
    restorePreviousBoard,
    session,
  } = useOnboarding();
  const {
    checkAp,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const phoneTimezone = useMemo(() => readCurrentPhoneTimezone(), []);
  const phoneTimezoneResolution = useMemo(() => resolvePhoneTimezoneForDevice(phoneTimezone), [phoneTimezone]);

  const [setupError, setSetupError] = useState<string | null>(null);
  const [claimedFlowStep, setClaimedFlowStep] = useState<ClaimedFlowStep>("habit");
  const [habitNameInput, setHabitNameInput] = useState(resolveHabitNameDraft(activeDevice?.name));
  const [minimumGoalInput, setMinimumGoalInput] = useState(activeDeviceMinimumGoal);
  const [weeklyTarget, setWeeklyTarget] = useState(activeDevice?.weeklyTarget ?? 5);
  const [timezoneInput, setTimezoneInput] = useState(phoneTimezoneResolution.resolvedValue);
  const [paletteId, setPaletteId] = useState(activeDevice?.paletteId ?? "classic");
  const [restoreChoice, setRestoreChoice] = useState<RestoreChoice | null>(null);
  const [autoStartPending, setAutoStartPending] = useState(false);
  const [transientFeedback, setTransientFeedback] = useState<{
    body: string;
    title: string;
    tone: "error" | "neutral" | "success";
  } | null>(null);
  const normalizedHabitName = normalizeHabitNameForSave(habitNameInput);
  const normalizedMinimumGoal = normalizeMinimumGoalForSave(minimumGoalInput);
  const autoStartRequested = useMemo(() => {
    const auto = params.auto;
    const resolvedValue = Array.isArray(auto) ? auto[0] : auto;
    return resolvedValue === "1";
  }, [params.auto]);
  const localRestoreSource =
    session?.deviceId && activeOnboardingRestoreSource?.sourceDeviceId === session.deviceId
      ? activeOnboardingRestoreSource
      : null;

  function applyRestoreSourceInputs() {
    if (!localRestoreSource) {
      return;
    }

    setHabitNameInput(resolveHabitNameDraft(localRestoreSource.settings.name));
    setMinimumGoalInput(localRestoreSource.settings.dailyMinimum);
    setWeeklyTarget(localRestoreSource.settings.weeklyTarget);
    setTimezoneInput(localRestoreSource.settings.timezone || phoneTimezoneResolution.resolvedValue);
    setPaletteId(localRestoreSource.settings.paletteId);
  }

  useEffect(() => {
    if (autoStartRequested) {
      setAutoStartPending(true);
    }
  }, [autoStartRequested]);

  useEffect(() => {
    if (!activeDevice || session?.status !== "claimed") {
      return;
    }

    setHabitNameInput(resolveHabitNameDraft(activeDevice.name));
    setMinimumGoalInput(activeDeviceMinimumGoal);
    setWeeklyTarget(activeDevice.weeklyTarget);
    setTimezoneInput(activeDevice.timezone || phoneTimezoneResolution.resolvedValue);
    setPaletteId(activeDevice.paletteId);
  }, [activeDevice, activeDeviceMinimumGoal, phoneTimezoneResolution.resolvedValue, session?.status]);

  useEffect(() => {
    setRestoreChoice(null);
    setClaimedFlowStep("habit");
  }, [session?.id]);

  useEffect(() => {
    if (!transientFeedback) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setTransientFeedback(null);
    }, SETUP_FEEDBACK_OVERLAY_MS);

    return () => clearTimeout(timeoutId);
  }, [transientFeedback]);

  useEffect(() => {
    if (session?.status !== "claimed" || areDevicesLoading) {
      return;
    }

    if (session.deviceId && activeDevice?.id === session.deviceId) {
      return;
    }

    const claimedAtMs = session.claimedAt ? new Date(session.claimedAt).getTime() : 0;
    if (claimedAtMs && Date.now() - claimedAtMs < CLAIMED_SESSION_DEVICE_GRACE_MS) {
      return;
    }

    setAutoStartPending(autoStartRequested);
    if (!session.deviceId || !activeDevice || activeDevice.id !== session.deviceId) {
      clearLocalOnboardingSession();
    }
  }, [activeDevice, areDevicesLoading, autoStartRequested, clearLocalOnboardingSession, session?.claimedAt, session?.deviceId, session?.status]);

  useEffect(() => {
    if (!autoStartPending || session || isBusy || isOnboardingLoading) {
      return;
    }

    setAutoStartPending(false);
    void handleStartSession();
  }, [autoStartPending, isBusy, isOnboardingLoading, session]);

  const claimedDeviceReady = session?.status === "claimed" && !!activeDevice && activeDevice.id === session.deviceId;
  const primaryRestoreCandidate = restoreCandidates[0] ?? null;
  const needsRestoreChoice = claimedDeviceReady && restoreChoice === null && (restoreCandidates.length > 0 || !!localRestoreSource);
  const isRestoreDecisionBusy = isRestoringBoard || isRefreshingRuntimeSnapshot || isSavingHistoryDraft || isSavingSettings;
  const onboardingPatch =
    claimedDeviceReady && activeDevice
      ? {
          ...(normalizedHabitName !== activeDevice.name ? { name: normalizedHabitName } : {}),
          ...(paletteId !== activeDevice.paletteId ? { palette_preset: paletteId } : {}),
          ...(timezoneInput.trim() !== activeDevice.timezone ? { timezone: timezoneInput.trim() } : {}),
          ...(weeklyTarget !== activeDevice.weeklyTarget ? { weekly_target: weeklyTarget } : {}),
        }
      : null;
  const controller = useSetupFlowController({
    checkAp,
    claimToken,
    completionLabel: "Finishing setup",
    flow: "onboarding",
    hasCompletingPhase: session?.status === "claimed" && !claimedDeviceReady,
    hasReachedSuccess: claimedDeviceReady,
    hardwareProfileHint: session?.hardwareProfileHint ?? "addone-v1",
    markWaiting,
    refreshSession,
    restoreLabel: "Loading your board",
    scanNetworks,
    session,
    submitProvisioning,
  });
  const activeStage: OnboardingStage =
    controller.stage === "success"
      ? needsRestoreChoice
        ? "restore"
        : claimedFlowStep
      : controller.stage;

  useEffect(() => {
    if (controller.stage !== "reconnecting_board" && controller.stage !== "restoring_board") {
      return;
    }

    const probeDeviceId = session?.deviceId ?? activeDevice?.id ?? null;
    void refreshDevices({ probeDeviceId }).catch((error) => {
      console.warn("[onboarding] refreshDevices failed", error);
    });
    const intervalId = setInterval(() => {
      void refreshDevices({ probeDeviceId }).catch((error) => {
        console.warn("[onboarding] refreshDevices failed", error);
      });
    }, ONBOARDING_DEVICE_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [activeDevice?.id, controller.stage, refreshDevices, session?.deviceId]);

  async function handleStartSession() {
    try {
      setSetupError(null);
      setActiveOnboardingRestoreSource(activeDevice ? captureOnboardingRestoreSource(activeDevice) : null);
      controller.resetLocalAttempt("start_onboarding");
      await createSession({
        bootstrapDayResetTime: "00:00:00",
        bootstrapTimezone: phoneTimezoneResolution.resolvedValue,
        hardwareProfileHint: "addone-v1",
      });
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to start setup.");
    }
  }

  async function handleFinishSetup() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      if (onboardingPatch && Object.keys(onboardingPatch).length > 0) {
        await applySettingsDraft(onboardingPatch, activeDevice.id);
      }
      await saveActiveHabitMetadata({
        dailyMinimum: normalizedMinimumGoal,
        deviceId: activeDevice.id,
        habitName: normalizedHabitName,
        weeklyTarget,
      });
      if (restoreChoice === "fresh") {
        await refreshRuntimeSnapshot(activeDevice.id);
      }
      clearLocalOnboardingSession();
      router.replace("/");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to finish setup.");
    }
  }

  async function handleRestorePreviousBoard() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      if (primaryRestoreCandidate) {
        await restorePreviousBoard({
          backupId: primaryRestoreCandidate.backupId,
          deviceId: activeDevice.id,
          requestId: makeRequestId(),
        });
      } else if (localRestoreSource) {
        await restoreBoardFromSnapshot(localRestoreSource, activeDevice.id);
        applyRestoreSourceInputs();
      } else {
        return;
      }
      setRestoreChoice("restore");
      setClaimedFlowStep("habit");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "We couldn't restore the previous board.");
    }
  }

  function handleStartFresh() {
    setRestoreChoice("fresh");
    setSetupError(null);
    setClaimedFlowStep("habit");
  }

  return (
    <ScreenFrame
      contentMaxWidth={theme.layout.narrowContentWidth}
      header={<SetupRouteHeader label="Setup" onClose={() => router.back()} title="AddOne" />}
      scroll
    >
      <SetupFeedbackOverlay
        body={controller.overlay?.body ?? transientFeedback?.body}
        dismissible
        onClose={() => {
          controller.dismissOverlay();
          setTransientFeedback(null);
        }}
        title={controller.overlay?.title ?? transientFeedback?.title ?? "Status"}
        tone={controller.overlay?.tone ?? transientFeedback?.tone ?? "neutral"}
        visible={!!controller.overlay || !!transientFeedback}
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
        {activeStage === "intro" ? (
          <SetupStageLayout
            footer={
              setupError || !autoStartRequested ? (
                <ActionButton disabled={isBusy} label={isBusy ? "Starting…" : "Start setup"} onPress={() => void handleStartSession()} />
              ) : undefined
            }
          >
            <StepHeader
              step={1}
              subtitle={
                setupError
                  ? "The onboarding session couldn’t start. Try again from this phone."
                  : autoStartRequested
                    ? "Starting a fresh setup session now."
                    : "Start a fresh setup session on this phone."
              }
              title={setupError ? "Couldn’t start setup" : "Preparing setup"}
            />
            {setupError ? null : (
              <View style={{ alignItems: "center", gap: 10, paddingVertical: 4 }}>
                <ActivityIndicator color={theme.colors.textPrimary} />
                <BodyText>Preparing the AddOne setup…</BodyText>
              </View>
            )}
          </SetupStageLayout>
        ) : null}

        {activeStage === "failure" ? (
          <SetupStageLayout
            footer={
              <ActionButton disabled={isBusy} label={isBusy ? "Restarting…" : "Restart setup"} onPress={() => void handleStartSession()} />
            }
          >
            <StepHeader
              step={1}
              subtitle={controller.terminalFailure?.message ?? "Start a fresh setup session on this phone."}
              title={controller.terminalFailure?.title ?? "Restart setup"}
            />
          </SetupStageLayout>
        ) : null}

        {activeStage === "join_device_ap" ? (
          <SetupStageLayout
            footer={
              <ActionButton
                disabled={controller.isCheckingAp || controller.isScanningNetworks}
                label={controller.isCheckingAp || controller.isScanningNetworks ? "Checking…" : "I joined AddOne Wi‑Fi"}
                onPress={() => void controller.confirmJoinedDeviceAp()}
              />
            }
          >
            <StepHeader
              step={2}
              subtitle="Join the temporary AddOne network on this phone, then come back here."
              title="Join AddOne Wi‑Fi"
            />
            <View style={{ gap: 18 }}>
              {[
                "Open Settings > Wi‑Fi.",
                "Join the network that starts with AddOne_XXXX.",
                "Come back here when the phone is connected.",
              ].map((step, index) => (
                <View key={`${index + 1}-${step}`} style={{ alignItems: "flex-start", flexDirection: "row", gap: 14 }}>
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: theme.radius.full,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: 12,
                        lineHeight: 14,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      flex: 1,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: 16,
                      lineHeight: 24,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </SetupStageLayout>
        ) : null}

        {activeStage === "scan_home_wifi" ? (
          <SetupStageLayout>
            <StepHeader
              step={3}
              subtitle="Looking for the network your board should use."
              title="Scanning nearby Wi‑Fi"
            />
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", paddingVertical: 18 }}>
              <ActivityIndicator color={theme.colors.textPrimary} />
            </View>
          </SetupStageLayout>
        ) : null}

        {activeStage === "choose_home_wifi" ? (
          <SetupStageLayout
              footer={
                <ActionButton
                  disabled={controller.isCheckingAp || controller.isSubmittingProvisioning || !controller.preparedRequest}
                  label={controller.isCheckingAp || controller.isSubmittingProvisioning ? "Connecting…" : "Connect"}
                  onPress={() => void controller.submitWifiCredentials()}
                />
              }
          >
            <StepHeader step={3} title="Home Wi‑Fi" />
            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
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
                    onPress={() => controller.setPickerVisible(true)}
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

        {activeStage === "reconnecting_board" ? (
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

        {activeStage === "restoring_board" ? (
          <SetupStageLayout>
            <StepHeader
              step={3}
              subtitle="Hold here while setup finishes."
              title="Loading your board"
            />
            <View style={{ gap: 18 }}>
              <SetupProgressList steps={controller.progressRows} />
            </View>
          </SetupStageLayout>
        ) : null}

        {activeStage === "restore" && (primaryRestoreCandidate || localRestoreSource) ? (
          <SetupStageLayout
            footer={
              <View style={{ gap: 12 }}>
                <ActionButton
                  disabled={isRestoreDecisionBusy}
                  label={isRestoreDecisionBusy ? "Restoring…" : "Restore previous board"}
                  onPress={() => void handleRestorePreviousBoard()}
                />
                <ActionButton disabled={isRestoreDecisionBusy} label="Start fresh instead" onPress={handleStartFresh} secondary />
              </View>
            }
          >
            <StepHeader eyebrow="Board" subtitle="We found a saved board for this account." title="Restore your last board?" />
            <SelectionCard
              detail={
                primaryRestoreCandidate?.backedUpAt
                  ? "Restore it to keep your earlier board and history."
                  : localRestoreSource
                    ? "Restore the board that was on this phone before the reset."
                    : "A saved board is ready to restore."
              }
              label="Saved board"
              value={primaryRestoreCandidate?.sourceDeviceName ?? localRestoreSource?.sourceDeviceName ?? "Latest saved board"}
            />
          </SetupStageLayout>
        ) : null}

        {activeStage === "habit" ? (
          <SetupStageLayout
            footer={
              <ActionButton
                disabled={isSavingSettings}
                label="Continue"
                onPress={() => {
                  setSetupError(null);
                  setClaimedFlowStep("board");
                }}
              />
            }
          >
            <StepHeader
              eyebrow="Habit"
              subtitle={
                restoreChoice === "restore"
                  ? "We'll restore the saved board while you finish the basics."
                  : "Set the basics you want to see every day."
              }
              title="Name the habit"
            />
            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <FieldLabel>Habit name</FieldLabel>
                <FieldCounter current={habitNameInput.length} max={HABIT_NAME_MAX_LENGTH} />
              </View>
              <TextField
                autoCapitalize="words"
                disabled={isSavingSettings}
                maxLength={HABIT_NAME_MAX_LENGTH}
                onChangeText={setHabitNameInput}
                placeholder={DEFAULT_HABIT_NAME}
                value={habitNameInput}
              />
              <FieldNote>Leave the default if you want to decide later.</FieldNote>
            </View>

            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <FieldLabel>Daily minimum</FieldLabel>
                <FieldCounter current={minimumGoalInput.length} max={MINIMUM_GOAL_MAX_LENGTH} />
              </View>
              <TextField
                autoCapitalize="sentences"
                disabled={isSavingSettings}
                maxLength={MINIMUM_GOAL_MAX_LENGTH}
                onChangeText={setMinimumGoalInput}
                placeholder={MINIMUM_GOAL_PLACEHOLDER}
                value={minimumGoalInput}
              />
              <FieldNote>Write the smallest version that still counts.</FieldNote>
            </View>

            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
              <FieldLabel>Weekly target</FieldLabel>
              <FieldNote>How many days should count as a good week?</FieldNote>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                  <ChoicePill
                    key={`weekly-target-${target}`}
                    disabled={isSavingSettings}
                    label={String(target)}
                    onPress={() => setWeeklyTarget(target)}
                    selected={weeklyTarget === target}
                  />
                ))}
              </View>
            </View>
          </SetupStageLayout>
        ) : null}

        {activeStage === "board" ? (
          <SetupStageLayout
            footer={
              <View style={{ gap: 12 }}>
                <ActionButton disabled={isSavingSettings} label="Back" onPress={() => setClaimedFlowStep("habit")} secondary />
                <ActionButton
                  disabled={isSavingSettings || isRestoringBoard || needsRestoreChoice}
                  label={isSavingSettings ? "Opening…" : "Open my board"}
                  onPress={() => void handleFinishSetup()}
                />
              </View>
            }
          >
            <StepHeader
              eyebrow="Board"
              subtitle="Choose timezone and palette. You can change both later."
              title="Finish the board"
            />
            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
              <DeviceTimezonePicker
                description="Controls the board's local day and reset timing."
                disabled={isSavingSettings}
                onChange={setTimezoneInput}
                phoneTimezone={phoneTimezone}
                value={timezoneInput}
              />
            </View>

            <View style={{ gap: ONBOARDING_FIELD_GAP }}>
              <FieldLabel>Palette</FieldLabel>
              <FieldNote>Pick the one that feels easiest to read from a distance.</FieldNote>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  { id: "classic", label: "Classic" },
                  { id: "amber", label: "Amber" },
                  { id: "ice", label: "Ice" },
                  { id: "rose", label: "Geek" },
                ].map((palette) => (
                  <ChoicePill
                    key={palette.id}
                    disabled={isSavingSettings}
                    label={palette.label}
                    onPress={() => setPaletteId(palette.id)}
                    selected={paletteId === palette.id}
                  />
                ))}
              </View>
            </View>
          </SetupStageLayout>
        ) : null}

        {session ? <FieldNote>{formatExpirationLabel(session.expiresAt)}</FieldNote> : null}
      </View>
    </ScreenFrame>
  );
}
