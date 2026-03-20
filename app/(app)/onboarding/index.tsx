import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { DeviceTimezonePicker } from "@/components/settings/device-timezone-picker";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { WifiNetworkPicker } from "@/components/ui/wifi-network-picker";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { withAlpha } from "@/lib/color";
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
import { useDeviceHabitMetadataStore } from "@/store/device-habit-metadata-store";

const ONBOARDING_PAGE_GAP = 18;
const ONBOARDING_CARD_GAP = 18;
const ONBOARDING_FIELD_GAP = 12;

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Session expires in under a minute";
  }

  return `Session expires in ${diffMinutes} minutes`;
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.2),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.08) : theme.colors.textPrimary,
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 18,
      }}
    >
      <Text
        style={{
          color: secondary ? theme.colors.textPrimary : theme.colors.bgBase,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
      }}
    >
      {children}
    </Text>
  );
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

function BodyText({ children, tone = "secondary" }: { children: string; tone?: "muted" | "secondary" }) {
  return (
    <Text
      style={{
        color: tone === "muted" ? theme.colors.textTertiary : theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function FieldNote({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: 13,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

function StepHeader({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: theme.colors.textTertiary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        Step {step} of 4
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: theme.typography.title.fontSize,
          lineHeight: theme.typography.title.lineHeight,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function TextField({
  autoCapitalize = "none",
  disabled = false,
  maxLength,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  disabled?: boolean;
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <TextInput
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      editable={!disabled}
      maxLength={maxLength}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
      secureTextEntry={secureTextEntry}
      style={{
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
      value={value}
    />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { activeDevice } = useDevices();
  const { applySettingsDraft, isSavingSettings } = useDeviceActions();
  const activeDeviceMinimumGoal = useDeviceHabitMetadataStore((state) =>
    activeDevice?.id ? state.minimumGoalByDeviceId[activeDevice.id] ?? "" : "",
  );
  const setPersistedMinimumGoal = useDeviceHabitMetadataStore((state) => state.setMinimumGoal);
  const {
    claimToken,
    createSession,
    hasClaimToken,
    isBusy,
    isPolling,
    markWaiting,
    refreshSession,
    session,
  } = useOnboarding();
  const {
    clearDraft,
    draft,
    preparedRequest,
    setWifiPassword,
    setWifiSsid,
    validation,
  } = useApProvisioning({
    claimToken,
    hardwareProfileHint: session?.hardwareProfileHint ?? null,
    onboardingSessionId: session?.id ?? null,
  });
  const {
    apInfo,
    apInfoError,
    checkAp,
    isCheckingAp,
    isScanningNetworks,
    isSubmittingProvisioning,
    networks,
    networksError,
    provisioningError,
    provisioningResponse,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const phoneTimezone = useMemo(() => readCurrentPhoneTimezone(), []);
  const phoneTimezoneResolution = useMemo(() => resolvePhoneTimezoneForDevice(phoneTimezone), [phoneTimezone]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [habitNameInput, setHabitNameInput] = useState(resolveHabitNameDraft(activeDevice?.name));
  const [minimumGoalInput, setMinimumGoalInput] = useState(activeDeviceMinimumGoal);
  const [weeklyTarget, setWeeklyTarget] = useState(activeDevice?.weeklyTarget ?? 5);
  const [timezoneInput, setTimezoneInput] = useState(phoneTimezoneResolution.resolvedValue);
  const [paletteId, setPaletteId] = useState(activeDevice?.paletteId ?? "classic");
  const normalizedHabitName = normalizeHabitNameForSave(habitNameInput);
  const normalizedMinimumGoal = normalizeMinimumGoalForSave(minimumGoalInput);

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

  const sessionReadyForAp = session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken;
  const claimedDeviceReady = session?.status === "claimed" && !!activeDevice && activeDevice.id === session.deviceId;
  const sortedNetworks = useMemo(
    () =>
      [...networks].sort((left, right) => {
        const leftRssi = left.rssi ?? -999;
        const rightRssi = right.rssi ?? -999;
        return rightRssi - leftRssi;
      }),
    [networks],
  );
  const onboardingPatch =
    claimedDeviceReady && activeDevice
      ? {
          ...(normalizedHabitName !== activeDevice.name ? { name: normalizedHabitName } : {}),
          ...(paletteId !== activeDevice.paletteId ? { palette_preset: paletteId } : {}),
          ...(timezoneInput.trim() !== activeDevice.timezone ? { timezone: timezoneInput.trim() } : {}),
          ...(weeklyTarget !== activeDevice.weeklyTarget ? { weekly_target: weeklyTarget } : {}),
        }
      : null;

  async function handleStartSession() {
    setSetupError(null);
    setSetupMessage(null);
    clearDraft();
    await createSession({
      bootstrapDayResetTime: "00:00:00",
      bootstrapTimezone: phoneTimezoneResolution.resolvedValue,
      hardwareProfileHint: "addone-v1",
    });
  }

  async function handleCheckDeviceAp() {
    try {
      setSetupError(null);
      setSetupMessage(null);
      const info = await checkAp();
      const response = await scanNetworks();
      if (response.networks.length > 0) {
        setPickerVisible(true);
      }
      setSetupMessage(`Connected to ${info.device_ap_ssid}. Choose Wi‑Fi and continue.`);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      setSetupError(firstError ?? "The Wi‑Fi details are incomplete.");
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setSetupError(response.message ?? "The device rejected the Wi‑Fi payload.");
        return;
      }

      await markWaiting(session.id);
      setSetupMessage("Connecting to Wi‑Fi…");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to continue setup.");
    }
  }

  async function handleFinishSetup() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      if (onboardingPatch && Object.keys(onboardingPatch).length > 0) {
        await applySettingsDraft(onboardingPatch, activeDevice.id);
      }
      setPersistedMinimumGoal(activeDevice.id, normalizedMinimumGoal);
      router.replace("/");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to finish setup.");
    }
  }

  let step = 1;
  if (sessionReadyForAp) {
    step = 2;
  } else if (session?.status === "awaiting_cloud") {
    step = 3;
  } else if (session?.status === "claimed") {
    step = 4;
  }

  return (
    <ScreenFrame
      header={
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 20 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              Setup
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              AddOne
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <WifiNetworkPicker
        isScanning={isScanningNetworks}
        networks={sortedNetworks}
        onClose={() => setPickerVisible(false)}
        onSelect={(network) => {
          setWifiSsid(network.ssid);
          setSetupError(null);
          setSetupMessage(null);
          setPickerVisible(false);
        }}
        selectedSsid={draft.wifiSsid}
        visible={pickerVisible}
      />

      <View style={{ gap: ONBOARDING_PAGE_GAP }}>
        <GlassCard style={{ gap: ONBOARDING_CARD_GAP, paddingHorizontal: 18, paddingVertical: 18 }}>
          <StepHeader
            step={step}
            title={
              step === 1
                ? "Start setup"
                : step === 2
                  ? "Join AddOne Wi‑Fi"
                  : step === 3
                    ? "Connect the device"
                    : "Finish setup"
            }
          />

          {step === 1 ? (
            <>
              <BodyText>Start setup, join AddOne Wi‑Fi, then connect the board to your network.</BodyText>
              <ActionButton disabled={isBusy} label={isBusy ? "Starting…" : "Start setup"} onPress={() => void handleStartSession()} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <BodyText>In Wi‑Fi settings, join `AddOne-XXXX`, then return here and choose your network.</BodyText>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <ActionButton
                  disabled={isCheckingAp || isScanningNetworks}
                  label={isCheckingAp || isScanningNetworks ? "Checking…" : "Check AddOne Wi‑Fi"}
                  onPress={() => void handleCheckDeviceAp()}
                  secondary
                />
                <ActionButton
                  disabled={isSubmittingProvisioning || !preparedRequest}
                  label={isSubmittingProvisioning ? "Sending…" : "Continue"}
                  onPress={() => void handleProvisionDeviceAp()}
                />
              </View>

              <View style={{ gap: ONBOARDING_FIELD_GAP }}>
                <FieldLabel>Wi‑Fi network</FieldLabel>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      disabled={isSubmittingProvisioning}
                      onChangeText={(value) => {
                        setWifiSsid(value);
                        setSetupError(null);
                        setSetupMessage(null);
                      }}
                      placeholder="Choose or type the network"
                      value={draft.wifiSsid}
                    />
                  </View>
                  <ActionButton
                    disabled={isSubmittingProvisioning || isCheckingAp || isScanningNetworks}
                    label={isScanningNetworks ? "Scanning…" : "Choose"}
                    onPress={() => {
                      if (sortedNetworks.length > 0) {
                        setPickerVisible(true);
                        return;
                      }

                      void handleCheckDeviceAp();
                    }}
                    secondary
                  />
                </View>
                {validation.errors.wifiSsid ? (
                  <Text
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {validation.errors.wifiSsid}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: ONBOARDING_FIELD_GAP }}>
                <FieldLabel>Password</FieldLabel>
                <TextField
                  disabled={isSubmittingProvisioning}
                  onChangeText={(value) => {
                    setWifiPassword(value);
                    setSetupError(null);
                    setSetupMessage(null);
                  }}
                  placeholder="Enter the Wi‑Fi password"
                  secureTextEntry
                  value={draft.wifiPassword}
                />
                {validation.errors.wifiPassword ? (
                  <Text
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {validation.errors.wifiPassword}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <BodyText>The board is joining Wi‑Fi and publishing its first live snapshot.</BodyText>
              <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                <ActivityIndicator color={theme.colors.textPrimary} />
                <BodyText>Waiting for the device…</BodyText>
              </View>
              <ActionButton
                disabled={isPolling}
                label={isPolling ? "Refreshing…" : "Refresh"}
                onPress={() => void refreshSession()}
                secondary
              />
            </>
          ) : null}

          {step === 4 ? (
            <>
              {!claimedDeviceReady || !activeDevice ? (
                <BodyText>Waiting for the first live device snapshot…</BodyText>
              ) : (
                <>
                  <BodyText>Set what matters now. Reset stays at midnight and brightness stays on auto.</BodyText>

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

                  <View style={{ gap: ONBOARDING_FIELD_GAP }}>
                    <DeviceTimezonePicker
                      description="Sets the board's local day and reset timing."
                      disabled={isSavingSettings}
                      onChange={setTimezoneInput}
                      phoneTimezone={phoneTimezone}
                      value={timezoneInput}
                    />
                  </View>

                  <View style={{ gap: ONBOARDING_FIELD_GAP }}>
                    <FieldLabel>Palette</FieldLabel>
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

                  <ActionButton
                    disabled={isSavingSettings}
                    label={isSavingSettings ? "Finishing…" : "Open my board"}
                    onPress={() => void handleFinishSetup()}
                  />
                </>
              )}
            </>
          ) : null}

          {session ? (
            <BodyText tone="muted">{formatExpirationLabel(session.expiresAt)}</BodyText>
          ) : null}

          {setupMessage ? <BodyText>{setupMessage}</BodyText> : null}

          {apInfo ? <BodyText tone="muted">{`Device AP: ${apInfo.device_ap_ssid}`}</BodyText> : null}

          {setupError || apInfoError || networksError || provisioningError || provisioningResponse?.message ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {setupError ?? apInfoError ?? networksError ?? provisioningError ?? provisioningResponse?.message}
            </Text>
          ) : null}
        </GlassCard>
      </View>
    </ScreenFrame>
  );
}
