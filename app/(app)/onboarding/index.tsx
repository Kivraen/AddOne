import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, InteractionManager, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ScreenFrame } from "@/components/layout/screen-frame";
import {
  SetupActionButton as ActionButton,
  SetupBodyText as BodyText,
  SetupFeedbackOverlay,
  SetupInlineButton,
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
import { OnboardingHandoffAnimation } from "@/components/setup/onboarding-handoff-animation";
import { PalettePreviewBoard } from "@/components/settings/palette-color-editor";
import { SettingsSwatchStrip } from "@/components/settings/device-settings-scaffold";
import { ChoicePill } from "@/components/ui/choice-pill";
import { WifiNetworkPicker } from "@/components/ui/wifi-network-picker";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSetupFlowController } from "@/hooks/use-setup-flow-controller";
import { withAlpha } from "@/lib/color";
import { isDeviceRecovering } from "@/lib/device-recovery";
import {
  areCustomPalettesEqual,
  buildResolvedPaletteCustom,
  createSettingsDraftFromDevice,
  getDraftPalette,
  sanitizeCustomPalette,
} from "@/lib/device-settings";
import { readCurrentPhoneTimezone, resolvePhoneTimezoneForDevice } from "@/lib/device-timezone";
import {
  DEFAULT_HABIT_NAME,
  DEFAULT_WEEKLY_TARGET,
  HABIT_NAME_MAX_LENGTH,
  MINIMUM_GOAL_MAX_LENGTH,
  MINIMUM_GOAL_PLACEHOLDER,
  normalizeMinimumGoalForSave,
} from "@/lib/habit-details";
import { captureOnboardingRestoreSource } from "@/lib/onboarding-restore";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, BoardPalette, RestoreChoice, SetupFlowStage } from "@/types/addone";

const CLAIMED_SESSION_DEVICE_GRACE_MS = 15000;
const ONBOARDING_FIELD_GAP = 16;
const ONBOARDING_DEVICE_REFRESH_MS = 1500;
const ONBOARDING_TOTAL_STEPS = 4;
const ONBOARDING_HANDOFF_EXIT_DELAY_MS = 180;
const ONBOARDING_JOIN_DEVICE_AP_STEPS =
  process.env.EXPO_OS === "android"
    ? [
        "Open Settings > Wi‑Fi.",
        "Join the network that starts with AddOne_XXXX, then tap Stay connected if Android asks.",
        "Come back here when the phone is connected.",
      ]
    : [
        "Open Settings > Wi‑Fi.",
        "Join the network that starts with AddOne_XXXX.",
        "Come back here when the phone is connected.",
      ];

type ClaimedFlowStep = "habit" | "board" | "welcome";
type OnboardingStage = Exclude<SetupFlowStage, "success"> | "restore" | "habit" | "board" | "welcome" | "finishing_board";

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

function normalizeOnboardingText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function resolveOnboardingHabitNameInput(value?: string | null) {
  const normalized = normalizeOnboardingText(value);
  if (!normalized || normalized.toLowerCase() === "addone" || normalized === DEFAULT_HABIT_NAME) {
    return "";
  }

  return normalized;
}

function resolveOnboardingMinimumGoalInput(value?: string | null) {
  const normalized = normalizeMinimumGoalForSave(value);
  if (!normalized || normalized === MINIMUM_GOAL_PLACEHOLDER) {
    return "";
  }

  return normalized;
}

function OnboardingPaletteOption({
  active,
  colors,
  label,
  onPress,
}: {
  active: boolean;
  colors: string[];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: active ? withAlpha(theme.colors.textPrimary, 0.16) : withAlpha(theme.colors.textPrimary, 0.06),
        backgroundColor: active ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.bgBase, 0.42),
        paddingHorizontal: 15,
        paddingVertical: 14,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: theme.colors.textPrimary,
          fontFamily: active ? theme.typography.label.fontFamily : theme.typography.body.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <SettingsSwatchStrip colors={colors} />
      </View>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ auto?: string | string[] }>();
  const autoStartRequested = useMemo(() => {
    const auto = params.auto;
    const resolvedValue = Array.isArray(auto) ? auto[0] : auto;
    return resolvedValue === "1";
  }, [params.auto]);
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
    cancelSession,
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
  } = useOnboarding({
    autoResumeLatestActiveSession: !autoStartRequested,
    resumeStoredLocalSession: !autoStartRequested,
  });
  const {
    checkAp,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const phoneTimezone = useMemo(() => readCurrentPhoneTimezone(), []);
  const phoneTimezoneResolution = useMemo(() => resolvePhoneTimezoneForDevice(phoneTimezone), [phoneTimezone]);

  const [setupError, setSetupError] = useState<string | null>(null);
  const [claimedFlowStep, setClaimedFlowStep] = useState<ClaimedFlowStep>("habit");
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);
  const [habitNameInput, setHabitNameInput] = useState("");
  const [minimumGoalInput, setMinimumGoalInput] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(DEFAULT_WEEKLY_TARGET);
  const [timezoneInput, setTimezoneInput] = useState(phoneTimezoneResolution.resolvedValue);
  const [paletteId, setPaletteId] = useState("classic");
  const [customPalette, setCustomPalette] = useState<Partial<BoardPalette>>(sanitizeCustomPalette());
  const [restoreChoice, setRestoreChoice] = useState<RestoreChoice | null>(null);
  const [autoStartPending, setAutoStartPending] = useState(false);
  const [hasEditedSetupDraft, setHasEditedSetupDraft] = useState(false);
  const [hasAttemptedHabitContinue, setHasAttemptedHabitContinue] = useState(false);
  const [suppressInitialSceneAnimation, setSuppressInitialSceneAnimation] = useState(true);
  const [isBoardHandoffSettled, setIsBoardHandoffSettled] = useState(false);
  const [transientFeedback, setTransientFeedback] = useState<{
    body: string;
    title: string;
    tone: "error" | "neutral" | "success";
  } | null>(null);
  const normalizedHabitName = normalizeOnboardingText(habitNameInput);
  const normalizedMinimumGoal = normalizeMinimumGoalForSave(minimumGoalInput);
  const savedMinimumGoal = normalizedMinimumGoal;
  const isHabitStepReady = normalizedHabitName.length > 0 && normalizedMinimumGoal.length > 0;
  const habitNameInvalid = hasAttemptedHabitContinue && normalizedHabitName.length === 0;
  const minimumGoalInvalid = hasAttemptedHabitContinue && normalizedMinimumGoal.length === 0;
  const localRestoreSource =
    session?.deviceId && activeOnboardingRestoreSource?.sourceDeviceId === session.deviceId
      ? activeOnboardingRestoreSource
      : null;

  function applyRestoreSourceInputs() {
    if (!localRestoreSource) {
      return;
    }

    setHabitNameInput(resolveOnboardingHabitNameInput(localRestoreSource.settings.name));
    setMinimumGoalInput(resolveOnboardingMinimumGoalInput(localRestoreSource.settings.dailyMinimum));
    setWeeklyTarget(localRestoreSource.settings.weeklyTarget || DEFAULT_WEEKLY_TARGET);
    setTimezoneInput(localRestoreSource.settings.timezone || phoneTimezoneResolution.resolvedValue);
    setPaletteId(localRestoreSource.settings.paletteId);
    setCustomPalette(sanitizeCustomPalette(localRestoreSource.settings.customPalette));
  }

  function resetOnboardingDraftInputs() {
    setHabitNameInput("");
    setMinimumGoalInput("");
    setWeeklyTarget(DEFAULT_WEEKLY_TARGET);
    setTimezoneInput(phoneTimezoneResolution.resolvedValue);
    setPaletteId("classic");
    setCustomPalette(sanitizeCustomPalette());
  }

  useEffect(() => {
    setSuppressInitialSceneAnimation(false);
  }, []);

  useEffect(() => {
    if (autoStartRequested) {
      setAutoStartPending(true);
    }
  }, [autoStartRequested]);

  useEffect(() => {
    if (!activeDevice || session?.status !== "claimed" || hasEditedSetupDraft) {
      return;
    }

    if (!session.deviceId || activeDevice.id !== session.deviceId) {
      return;
    }

    if (restoreChoice !== "restore") {
      return;
    }

    setHabitNameInput(resolveOnboardingHabitNameInput(activeDevice.name));
    setMinimumGoalInput(resolveOnboardingMinimumGoalInput(activeDeviceMinimumGoal));
    setWeeklyTarget((currentTarget) => {
      if (activeDevice.weeklyTarget === 5 && currentTarget === DEFAULT_WEEKLY_TARGET) {
        return DEFAULT_WEEKLY_TARGET;
      }

      return activeDevice.weeklyTarget || DEFAULT_WEEKLY_TARGET;
    });
    setTimezoneInput(activeDevice.timezone || phoneTimezoneResolution.resolvedValue);
    setPaletteId(activeDevice.paletteId);
    setCustomPalette(sanitizeCustomPalette(activeDevice.customPalette));
  }, [activeDevice, activeDeviceMinimumGoal, hasEditedSetupDraft, phoneTimezoneResolution.resolvedValue, restoreChoice, session?.deviceId, session?.status]);

  useEffect(() => {
    resetOnboardingDraftInputs();
    setRestoreChoice(null);
    setClaimedFlowStep("habit");
    setIsFinishingSetup(false);
    setHasEditedSetupDraft(false);
    setHasAttemptedHabitContinue(false);
    setIsBoardHandoffSettled(false);
  }, [session?.id]);

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

    let cancelled = false;
    const interaction = InteractionManager.runAfterInteractions(() => {
      if (cancelled) {
        return;
      }

      setAutoStartPending(false);
      void handleStartSession();
    });

    return () => {
      cancelled = true;
      interaction.cancel();
    };
  }, [autoStartPending, isBusy, isOnboardingLoading, session]);

  const claimedDeviceReady = session?.status === "claimed" && !!activeDevice && activeDevice.id === session.deviceId;
  const primaryRestoreCandidate = restoreCandidates[0] ?? null;
  const needsRestoreChoice =
    claimedDeviceReady &&
    !!activeDevice &&
    isDeviceRecovering(activeDevice) &&
    restoreChoice === null &&
    (restoreCandidates.length > 0 || !!localRestoreSource);
  const restoreBoardLabel =
    primaryRestoreCandidate?.boardName?.trim() ||
    localRestoreSource?.settings.name?.trim() ||
    primaryRestoreCandidate?.sourceDeviceName?.trim() ||
    localRestoreSource?.sourceDeviceName?.trim() ||
    "Latest saved board";
  const isRestoreDecisionBusy = isRestoringBoard || isRefreshingRuntimeSnapshot || isSavingHistoryDraft || isSavingSettings;
  const onboardingPaletteDraft = useMemo(() => {
    if (!activeDevice) {
      return null;
    }

    return {
      ...createSettingsDraftFromDevice(activeDevice, savedMinimumGoal),
      customPalette: sanitizeCustomPalette(customPalette),
      habitName: normalizedHabitName,
      minimumGoal: savedMinimumGoal,
      paletteId,
      timezone: timezoneInput,
      weeklyTarget,
    };
  }, [activeDevice, customPalette, normalizedHabitName, paletteId, savedMinimumGoal, timezoneInput, weeklyTarget]);
  const resolvedPaletteCustom = useMemo(
    () => buildResolvedPaletteCustom(paletteId, onboardingPaletteDraft?.customPalette ?? customPalette),
    [customPalette, onboardingPaletteDraft?.customPalette, paletteId],
  );
  const onboardingPreviewDevice = useMemo<AddOneDevice | null>(() => {
    if (!activeDevice) {
      return null;
    }

    return {
      ...activeDevice,
      customPalette: resolvedPaletteCustom,
      name: normalizedHabitName,
      paletteId,
      timezone: timezoneInput,
      weeklyTarget,
    };
  }, [activeDevice, normalizedHabitName, paletteId, resolvedPaletteCustom, timezoneInput, weeklyTarget]);
  const previewPalette = useMemo(
    () => (onboardingPaletteDraft ? getDraftPalette(onboardingPaletteDraft) : null),
    [onboardingPaletteDraft],
  );
  const onboardingPatch =
    claimedDeviceReady && activeDevice
      ? {
          ...(normalizedHabitName !== activeDevice.name ? { name: normalizedHabitName } : {}),
          ...(
            paletteId !== activeDevice.paletteId || !areCustomPalettesEqual(activeDevice.customPalette, resolvedPaletteCustom)
              ? {
                  palette_custom: resolvedPaletteCustom,
                  palette_preset: paletteId,
                }
              : {}
          ),
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
        : isFinishingSetup
          ? "finishing_board"
          : claimedFlowStep
      : controller.stage;
  const showImmediateJoinApStage = activeStage === "intro" && autoStartRequested && !setupError;
  const showHomeWifiStage = activeStage === "scan_home_wifi" || activeStage === "choose_home_wifi";
  const selectedWifiSsid = controller.draft.wifiSsid.trim();
  const homeWifiStageState =
    activeStage === "scan_home_wifi"
      ? "loading"
      : controller.manualWifiEntry || controller.networks.length === 0
        ? "manual"
        : "picker";
  const onboardingHeaderStepLabel =
    activeStage === "intro" || activeStage === "failure" || activeStage === "join_device_ap" || showImmediateJoinApStage
      ? `Step 1 of ${ONBOARDING_TOTAL_STEPS}`
      : showHomeWifiStage || activeStage === "reconnecting_board" || activeStage === "restoring_board"
        ? `Step 2 of ${ONBOARDING_TOTAL_STEPS}`
        : activeStage === "habit"
          ? `Step 3 of ${ONBOARDING_TOTAL_STEPS}`
          : activeStage === "board"
            ? `Step 4 of ${ONBOARDING_TOTAL_STEPS}`
            : undefined;

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
      await createSession({
        bootstrapDayResetTime: "00:00:00",
        bootstrapTimezone: phoneTimezoneResolution.resolvedValue,
        hardwareProfileHint: "addone-v1",
      });
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to start setup.");
    }
  }

  function handleSelectPalettePreset(nextPaletteId: string) {
    setHasEditedSetupDraft(true);
    setPaletteId(nextPaletteId);
    setCustomPalette(buildResolvedPaletteCustom(nextPaletteId));
  }

  function dismissBoardOnboardingVisual(deviceId?: string | null) {
    if (!deviceId) {
      return;
    }

    void refreshRuntimeSnapshot(deviceId, {
      errorMessage: "The board did not leave onboarding mode in time.",
      timeoutMs: 6500,
    }).catch((error) => {
      console.warn("[onboarding] dismissBoardOnboardingVisual failed", error);
    });
  }

  function completeOnboardingRouteHome() {
    clearLocalOnboardingSession();
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }

  async function handleFinishSetup() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      setIsFinishingSetup(true);
      if (onboardingPatch && Object.keys(onboardingPatch).length > 0) {
        await applySettingsDraft(onboardingPatch, activeDevice.id);
      }
      await saveActiveHabitMetadata({
        dailyMinimum: savedMinimumGoal,
        deviceId: activeDevice.id,
        habitName: normalizedHabitName,
        weeklyTarget,
      });
      setIsBoardHandoffSettled(false);
      setIsFinishingSetup(false);
      setClaimedFlowStep("welcome");
      void refreshRuntimeSnapshot(activeDevice.id, {
        errorMessage: "The board did not leave onboarding mode in time.",
        timeoutMs: 6500,
      })
        .catch((error) => {
          console.warn("[onboarding] finish refreshRuntimeSnapshot failed", error);
        })
        .finally(() => {
          setIsBoardHandoffSettled(true);
        });
    } catch (error) {
      setIsFinishingSetup(false);
      setSetupError(error instanceof Error ? error.message : "Failed to finish setup.");
    }
  }

  useEffect(() => {
    if (activeStage !== "welcome" || !isBoardHandoffSettled) {
      return;
    }

    const timeoutId = setTimeout(() => {
      completeOnboardingRouteHome();
    }, ONBOARDING_HANDOFF_EXIT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [activeStage, isBoardHandoffSettled]);

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
      setHasEditedSetupDraft(false);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "We couldn't restore the previous board.");
    }
  }

  function handleStartFresh() {
    setRestoreChoice("fresh");
    setSetupError(null);
    setClaimedFlowStep("habit");
    setHasEditedSetupDraft(false);
    setHasAttemptedHabitContinue(false);
  }

  function handleContinueFromHabitStep() {
    if (!isHabitStepReady) {
      setHasAttemptedHabitContinue(true);
      return;
    }

    setHasAttemptedHabitContinue(false);
    setSetupError(null);
    setTransientFeedback(null);
    setClaimedFlowStep("board");
  }

  async function handleCloseOnboarding() {
    setAutoStartPending(false);
    setSetupError(null);

    if (session?.status === "claimed" && activeDevice?.id === session.deviceId) {
      dismissBoardOnboardingVisual(activeDevice.id);
    }

    const shouldClearTerminalSession =
      activeStage === "welcome" ||
      !session ||
      session.isExpired ||
      session.status === "cancelled" ||
      session.status === "expired" ||
      session.status === "failed";

    if (session?.status === "awaiting_ap") {
      controller.resetLocalAttempt("dismiss_onboarding_before_provisioning");

      try {
        await cancelSession({
          reason: "Setup dismissed before device provisioning started.",
          sessionId: session.id,
        });
      } catch {
        clearLocalOnboardingSession();
      }
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }

    if (shouldClearTerminalSession) {
      InteractionManager.runAfterInteractions(() => {
        clearLocalOnboardingSession();
      });
    }
  }

  const onboardingBottomAction =
    activeStage === "intro" && !showImmediateJoinApStage
      ? setupError || !autoStartRequested
        ? <ActionButton disabled={isBusy} label={isBusy ? "Starting…" : "Start setup"} onPress={() => void handleStartSession()} />
        : null
      : activeStage === "failure"
        ? <ActionButton disabled={isBusy} label={isBusy ? "Restarting…" : "Restart setup"} onPress={() => void handleStartSession()} />
        : activeStage === "join_device_ap" || showImmediateJoinApStage
          ? <ActionButton disabled label="Waiting for AddOne Wi‑Fi…" onPress={() => void controller.confirmJoinedDeviceAp()} />
        : showHomeWifiStage
            ? (
                <ActionButton
                  disabled={
                    activeStage === "scan_home_wifi" ||
                    controller.isCheckingAp ||
                    controller.isSubmittingProvisioning ||
                    !controller.preparedRequest
                  }
                  label={
                    activeStage === "scan_home_wifi"
                      ? "Scanning…"
                      : controller.isCheckingAp || controller.isSubmittingProvisioning
                        ? "Connecting…"
                        : "Connect"
                  }
                  onPress={() => void controller.submitWifiCredentials()}
                />
              )
            : activeStage === "restore" && (primaryRestoreCandidate || localRestoreSource)
              ? (
                  <View style={{ gap: 12 }}>
                    <ActionButton
                      disabled={isRestoreDecisionBusy}
                      label={isRestoreDecisionBusy ? "Restoring…" : "Restore previous board"}
                      onPress={() => void handleRestorePreviousBoard()}
                    />
                    <ActionButton disabled={isRestoreDecisionBusy} label="Start fresh instead" onPress={handleStartFresh} secondary />
                  </View>
                )
              : activeStage === "habit"
                ? (
                    <ActionButton
                      disabled={isSavingSettings}
                      label="Continue"
                      onPress={handleContinueFromHabitStep}
                    />
                  )
                : activeStage === "board"
                  ? (
                      <ActionButton
                        disabled={isSavingSettings || isRestoringBoard || needsRestoreChoice || isFinishingSetup}
                        label={isSavingSettings ? "Opening…" : "Open my board"}
                        onPress={() => void handleFinishSetup()}
                      />
                    )
                  : null;
  const showHandoffOverlay = activeStage === "finishing_board" || activeStage === "welcome";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
      <StatusBar style="light" />
      <ScreenFrame
        bottomOverlay={onboardingBottomAction ? <SetupBottomActionBar>{onboardingBottomAction}</SetupBottomActionBar> : undefined}
        contentContainerStyle={{ flexGrow: 1 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        header={<SetupRouteHeader onClose={() => void handleCloseOnboarding()} stepLabel={onboardingHeaderStepLabel} />}
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
        {activeStage === "intro" && !showImmediateJoinApStage ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="intro">
            <SetupStageLayout>
              <StepHeader
                hideTitle
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
          </SetupStageScene>
        ) : null}

        {activeStage === "failure" ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="failure">
            <SetupStageLayout>
              <StepHeader
                hideTitle
                step={1}
                subtitle={controller.terminalFailure?.message ?? "Start a fresh setup session on this phone."}
                title={controller.terminalFailure?.title ?? "Restart setup"}
              />
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "join_device_ap" || showImmediateJoinApStage ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="join_device_ap">
            <SetupStageLayout>
              <StepHeader
                hideTitle
                step={1}
                subtitle="Join the temporary AddOne network on this phone. This screen continues automatically once the phone is connected."
                title="Join AddOne Wi‑Fi"
                totalSteps={ONBOARDING_TOTAL_STEPS}
              />
              <View style={{ gap: 18 }}>
                {ONBOARDING_JOIN_DEVICE_AP_STEPS.map((step, index) => (
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
          </SetupStageScene>
        ) : null}

        {showHomeWifiStage ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="home_wifi">
            <SetupStageLayout>
              <StepHeader
                hideTitle
                step={2}
                subtitle="Choose the Wi‑Fi network your board should use."
                title="Choose Wi‑Fi"
                totalSteps={ONBOARDING_TOTAL_STEPS}
              />

              <SetupStageSwap gap={ONBOARDING_FIELD_GAP} swapKey={`home_wifi_${homeWifiStageState}`}>
                {activeStage === "scan_home_wifi" ? (
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
                  </>
                )}
              </SetupStageSwap>
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "reconnecting_board" ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="reconnecting_board">
            <SetupStageLayout>
              <StepHeader
                hideTitle
                step={2}
                subtitle="Hold here while the board reconnects."
                title="Connecting your board"
                totalSteps={ONBOARDING_TOTAL_STEPS}
              />
              <View style={{ gap: 18 }}>
                {selectedWifiSsid ? <SelectionCard label="Home network" value={selectedWifiSsid} /> : null}
                <SetupProgressList steps={controller.progressRows} />
              </View>
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "restoring_board" ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="restoring_board">
            <SetupStageLayout>
              <StepHeader
                hideTitle
                step={2}
                subtitle="Hold here while setup finishes."
                title="Loading your board"
                totalSteps={ONBOARDING_TOTAL_STEPS}
              />
              <View style={{ gap: 18 }}>
                {selectedWifiSsid ? <SelectionCard label="Home network" value={selectedWifiSsid} /> : null}
                <SetupProgressList steps={controller.progressRows} />
              </View>
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "restore" && (primaryRestoreCandidate || localRestoreSource) ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="restore">
            <SetupStageLayout>
              <StepHeader eyebrow="Board" hideTitle subtitle="We found a saved board for this account." title="Restore your last board?" />
              <SelectionCard
                detail={
                  primaryRestoreCandidate?.backedUpAt
                    ? "Restore it to keep your earlier board and history."
                    : localRestoreSource
                      ? "Restore the board that was on this phone before the reset."
                      : "A saved board is ready to restore."
                }
                label="Saved board"
                value={restoreBoardLabel}
              />
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "habit" ? (
          <SetupStageScene
            disableEnter={suppressInitialSceneAnimation}
            sceneKey={`habit_${session?.id ?? "none"}_${restoreChoice ?? "fresh"}`}
          >
            <SetupStageLayout>
              <StepHeader hideTitle step={3} title="Set up your habit" totalSteps={ONBOARDING_TOTAL_STEPS} />

              <View style={{ gap: 28 }}>
                <View style={{ gap: 14 }}>
                  <TextField
                    autoCapitalize="words"
                    disabled={isSavingSettings}
                    invalid={habitNameInvalid}
                    maxLength={HABIT_NAME_MAX_LENGTH}
                    onChangeText={(value) => {
                      setHasEditedSetupDraft(true);
                      setHabitNameInput(value);
                      if (hasAttemptedHabitContinue && normalizeOnboardingText(value).length > 0) {
                        setHasAttemptedHabitContinue(normalizedMinimumGoal.length === 0);
                      }
                    }}
                    placeholder="Habit Name"
                    value={habitNameInput}
                  />

                  <View style={{ gap: 12 }}>
                    <TextField
                      autoCapitalize="sentences"
                      disabled={isSavingSettings}
                      invalid={minimumGoalInvalid}
                      maxLength={MINIMUM_GOAL_MAX_LENGTH}
                      onChangeText={(value) => {
                        setHasEditedSetupDraft(true);
                        setMinimumGoalInput(value);
                        if (hasAttemptedHabitContinue && normalizeMinimumGoalForSave(value).length > 0) {
                          setHasAttemptedHabitContinue(normalizedHabitName.length === 0);
                        }
                      }}
                      placeholder="15 minutes exercise a day"
                      trailingAccessory={
                        <Pressable
                          disabled={isSavingSettings}
                          onPress={() =>
                            setTransientFeedback({
                              body: "Smaller goals are easier to repeat. Pick the minimum action that still counts, because consistency grows faster when the bar is simple enough to clear every day.",
                              title: "Make it easy to win",
                              tone: "neutral",
                            })
                          }
                          style={({ pressed }) => ({
                            alignItems: "center",
                            justifyContent: "center",
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            borderWidth: 1,
                            borderColor: withAlpha(theme.colors.textPrimary, 0.1),
                            backgroundColor: withAlpha(theme.colors.textPrimary, pressed ? 0.12 : 0.06),
                          })}
                        >
                          <Ionicons color={theme.colors.textPrimary} name="information-circle-outline" size={17} />
                        </Pressable>
                      }
                      value={minimumGoalInput}
                    />
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: 15,
                        lineHeight: 22,
                        textAlign: "center",
                      }}
                    >
                      Create a goal that is so small it can't fail.
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: withAlpha(theme.colors.textPrimary, 0.06),
                  }}
                />

                <View style={{ alignItems: "center", gap: 14, paddingTop: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                      textAlign: "center",
                    }}
                  >
                    How many days count as a good week?
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                      <ChoicePill
                        key={`weekly-target-${target}`}
                        disabled={isSavingSettings}
                        label={String(target)}
                        onPress={() => {
                          setHasEditedSetupDraft(true);
                          setWeeklyTarget(target);
                        }}
                        selected={weeklyTarget === target}
                      />
                    ))}
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontFamily: theme.typography.micro.fontFamily,
                      fontSize: 12,
                      lineHeight: 18,
                      letterSpacing: 0.2,
                      textAlign: "center",
                    }}
                  >
                    You can change this later in Settings.
                  </Text>
                </View>
              </View>
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        {activeStage === "board" ? (
          <SetupStageScene disableEnter={suppressInitialSceneAnimation} sceneKey="board">
            <SetupStageLayout>
              <StepHeader hideTitle step={4} title="Finish the board" totalSteps={ONBOARDING_TOTAL_STEPS} />

              {onboardingPaletteDraft && onboardingPreviewDevice && previewPalette ? (
                <View style={{ gap: ONBOARDING_FIELD_GAP + 2 }}>
                  <PalettePreviewBoard device={onboardingPreviewDevice} palette={previewPalette} title="" />

                  <View style={{ gap: 12 }}>
                    {boardPalettes.map((palette) => {
                      const isActive = paletteId === palette.id;
                      const optionPalette = getDraftPalette({
                        ...onboardingPaletteDraft,
                        customPalette: isActive ? resolvedPaletteCustom : buildResolvedPaletteCustom(palette.id),
                        paletteId: palette.id,
                      });

                      return (
                        <OnboardingPaletteOption
                          key={palette.id}
                          active={isActive}
                          colors={[optionPalette.dayOn, optionPalette.weekSuccess, optionPalette.weekFail]}
                          label={palette.name}
                          onPress={() => handleSelectPalettePreset(palette.id)}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </SetupStageLayout>
          </SetupStageScene>
        ) : null}

        </View>
      </ScreenFrame>

      {showHandoffOverlay ? (
        <Animated.View
          entering={FadeIn.duration(240)}
          exiting={FadeOut.duration(180)}
          pointerEvents="auto"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000000",
          }}
        >
          <OnboardingHandoffAnimation />
        </Animated.View>
      ) : null}
    </View>
  );
}
