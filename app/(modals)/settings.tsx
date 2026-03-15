import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { PageHeader } from "@/components/app/page-header";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { withAlpha } from "@/lib/color";
import { useAppUiStore } from "@/store/app-ui-store";
import { DeviceSettingsPatch } from "@/types/addone";

function SectionTitle({ children }: { children: string }) {
  return (
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
      {children}
    </Text>
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
        minHeight: 48,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.22),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.accentAmber, 0.16),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 18,
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
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

function isValidResetTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function parseBrightness(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(100, Math.max(0, parsed));
}

function buildSettingsPatch(params: {
  autoBrightness: boolean;
  brightnessInput: string;
  device: ReturnType<typeof useActiveDevice>;
  habitName: string;
  paletteId: string;
  resetTimeInput: string;
  timezoneInput: string;
  weeklyTarget: number;
}): DeviceSettingsPatch | null {
  const patch: DeviceSettingsPatch = {};
  const normalizedBrightness = parseBrightness(params.brightnessInput);
  const normalizedTimezone = params.timezoneInput.trim();
  const normalizedHabitName = params.habitName.trim();

  if (normalizedHabitName && normalizedHabitName !== params.device.name) {
    patch.name = normalizedHabitName;
  }

  if (params.weeklyTarget !== params.device.weeklyTarget) {
    patch.weekly_target = params.weeklyTarget;
  }

  if (normalizedTimezone && normalizedTimezone !== params.device.timezone) {
    patch.timezone = normalizedTimezone;
  }

  if (params.resetTimeInput !== params.device.resetTime) {
    patch.day_reset_time = `${params.resetTimeInput}:00`;
  }

  if (params.paletteId !== params.device.paletteId) {
    patch.palette_preset = params.paletteId;
  }

  if (params.autoBrightness !== params.device.autoBrightness) {
    patch.ambient_auto = params.autoBrightness;
  }

  if (normalizedBrightness !== null && normalizedBrightness !== params.device.brightness) {
    patch.brightness = normalizedBrightness;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function TextField({
  disabled = false,
  onChangeText,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      autoCapitalize="none"
      editable={!disabled}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
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

export default function SettingsModal() {
  const router = useRouter();
  const device = useActiveDevice();
  const { applySettingsDraft, isSavingSettings, isStartingWifiRecovery, requestWifiRecovery } = useDeviceActions();
  const clearOnboardingSession = useAppUiStore((state) => state.clearOnboardingSession);
  const requestBoardEditorOpen = useAppUiStore((state) => state.requestBoardEditorOpen);
  const [habitName, setHabitName] = useState(device.name);
  const [weeklyTarget, setWeeklyTarget] = useState(device.weeklyTarget);
  const [timezoneInput, setTimezoneInput] = useState(device.timezone);
  const [resetTimeInput, setResetTimeInput] = useState(device.resetTime);
  const [autoBrightness, setAutoBrightness] = useState(device.autoBrightness);
  const [brightnessInput, setBrightnessInput] = useState(String(device.brightness));
  const [paletteId, setPaletteId] = useState(device.paletteId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setHabitName(device.name);
    setWeeklyTarget(device.weeklyTarget);
    setTimezoneInput(device.timezone);
    setResetTimeInput(device.resetTime);
    setAutoBrightness(device.autoBrightness);
    setBrightnessInput(String(device.brightness));
    setPaletteId(device.paletteId);
    setStatusError(null);
    setStatusMessage(null);
  }, [
    device.autoBrightness,
    device.brightness,
    device.id,
    device.name,
    device.paletteId,
    device.resetTime,
    device.timezone,
    device.weeklyTarget,
  ]);

  const phoneTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const liveDeviceSession = device.isLive;
  const normalizedBrightness = parseBrightness(brightnessInput);
  const draftPatch = useMemo(
    () =>
      buildSettingsPatch({
        autoBrightness,
        brightnessInput,
        device,
        habitName,
        paletteId,
        resetTimeInput,
        timezoneInput,
        weeklyTarget,
      }),
    [autoBrightness, brightnessInput, device, habitName, paletteId, resetTimeInput, timezoneInput, weeklyTarget],
  );
  const canApply =
    liveDeviceSession &&
    !isSavingSettings &&
    !!draftPatch &&
    habitName.trim().length > 0 &&
    isValidResetTime(resetTimeInput) &&
    normalizedBrightness !== null &&
    timezoneInput.trim().length > 0;

  async function handleApply() {
    if (!draftPatch) {
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      await applySettingsDraft(draftPatch, device.id);
      setStatusMessage("Applied on the device.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to apply settings.");
    }
  }

  function handleResetDraft() {
    setHabitName(device.name);
    setWeeklyTarget(device.weeklyTarget);
    setTimezoneInput(device.timezone);
    setResetTimeInput(device.resetTime);
    setAutoBrightness(device.autoBrightness);
    setBrightnessInput(String(device.brightness));
    setPaletteId(device.paletteId);
    setStatusError(null);
    setStatusMessage("Draft reset to the latest device settings.");
  }

  function confirmWifiRecovery() {
    Alert.alert(
      "Enter Wi‑Fi recovery?",
      "The device will start its AddOne setup Wi‑Fi so you can reconnect it without losing ownership or history.",
      [
        { style: "cancel", text: "Cancel" },
        {
          text: "Enter recovery",
          onPress: () => {
            void (async () => {
              try {
                setStatusError(null);
                setStatusMessage(null);
                clearOnboardingSession();
                await requestWifiRecovery(device.id);
                router.push("/recovery");
              } catch (error) {
                setStatusError(error instanceof Error ? error.message : "Failed to start Wi‑Fi recovery.");
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <ScreenFrame
      header={<PageHeader title="Device settings" />}
      scroll
    >
      <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <ActionButton disabled={isSavingSettings || !draftPatch} label="Reset" onPress={handleResetDraft} secondary />
        <View style={{ flex: 1 }} />
        <ActionButton
          disabled={!canApply}
          label={isSavingSettings ? "Applying…" : "Apply"}
          onPress={() => {
            void handleApply();
          }}
        />
      </View>

      {statusMessage ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {statusMessage}
        </Text>
      ) : null}

      {statusError ? (
        <Text
          style={{
            color: theme.colors.statusErrorMuted,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {statusError}
        </Text>
      ) : null}

      {!liveDeviceSession ? (
        <GlassCard style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Device is offline
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Edit settings only while the device is live. Use Wi‑Fi recovery if the router or password changed.
          </Text>
          <View style={{ alignItems: "flex-start" }}>
            <ActionButton
              label="Rejoin Wi‑Fi"
              onPress={() => {
                clearOnboardingSession();
                router.push("/recovery");
              }}
            />
          </View>
        </GlassCard>
      ) : null}

      <View style={{ gap: 8 }}>
        <SectionTitle>Habit</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ gap: 8 }}>
            <FieldLabel>Habit name</FieldLabel>
            <TextField
              disabled={!liveDeviceSession || isSavingSettings}
              onChangeText={(value) => {
                setHabitName(value);
                setStatusError(null);
                setStatusMessage(null);
              }}
              placeholder="Daily habit"
              value={habitName}
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Weekly target</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                <ChoicePill
                  key={`target-${target}`}
                  disabled={!liveDeviceSession || isSavingSettings}
                  label={String(target)}
                  onPress={() => {
                    setWeeklyTarget(target);
                    setStatusError(null);
                    setStatusMessage(null);
                  }}
                  selected={weeklyTarget === target}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Time</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ gap: 8 }}>
            <FieldLabel>Timezone</FieldLabel>
            <TextField
              disabled={!liveDeviceSession || isSavingSettings}
              onChangeText={(value) => {
                setTimezoneInput(value);
                setStatusError(null);
                setStatusMessage(null);
              }}
              placeholder="America/Los_Angeles"
              value={timezoneInput}
            />
            <View style={{ alignItems: "flex-start" }}>
              <ActionButton
                disabled={!liveDeviceSession || isSavingSettings || timezoneInput === phoneTimezone}
                label="Use phone timezone"
                onPress={() => {
                  setTimezoneInput(phoneTimezone);
                  setStatusError(null);
                  setStatusMessage(null);
                }}
                secondary
              />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Reset time</FieldLabel>
            <TextField
              disabled={!liveDeviceSession || isSavingSettings}
              onChangeText={(value) => {
                setResetTimeInput(value);
                setStatusError(null);
                setStatusMessage(null);
              }}
              placeholder="00:00"
              value={resetTimeInput}
            />
            {!isValidResetTime(resetTimeInput) ? (
              <Text
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Use 24-hour format like 00:00.
              </Text>
            ) : null}
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Display</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <FieldLabel>Auto brightness</FieldLabel>
            </View>
            <Switch
              disabled={!liveDeviceSession || isSavingSettings}
              onValueChange={(value) => {
                setAutoBrightness(value);
                setStatusError(null);
                setStatusMessage(null);
              }}
              thumbColor={autoBrightness ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={autoBrightness}
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Manual brightness</FieldLabel>
            <TextField
              disabled={!liveDeviceSession || isSavingSettings || autoBrightness}
              onChangeText={(value) => {
                setBrightnessInput(value);
                setStatusError(null);
                setStatusMessage(null);
              }}
              placeholder="0-100"
              value={brightnessInput}
            />
            {!autoBrightness && normalizedBrightness === null ? (
              <Text
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Choose a level from 0 to 100.
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Palette</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {boardPalettes.map((palette) => (
                <ChoicePill
                  key={palette.id}
                  disabled={!liveDeviceSession || isSavingSettings}
                  label={palette.name}
                  onPress={() => {
                    setPaletteId(palette.id);
                    setStatusError(null);
                    setStatusMessage(null);
                  }}
                  selected={palette.id === paletteId}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Device</SectionTitle>
        <GlassCard style={{ gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ gap: 6 }}>
            <FieldLabel>Edit board</FieldLabel>
            <View style={{ alignItems: "flex-start", marginTop: 2 }}>
              <ActionButton
                disabled={!liveDeviceSession || isSavingSettings}
                label="Open board editor"
                onPress={() => {
                  requestBoardEditorOpen();
                  router.back();
                }}
                secondary
              />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.08) }} />

          <Pressable
            onPress={() => router.push("/account")}
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <FieldLabel>Account</FieldLabel>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Session details and sign out
              </Text>
            </View>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              ›
            </Text>
          </Pressable>

          <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.08) }} />

          <View style={{ gap: 6 }}>
            <FieldLabel>Wi‑Fi recovery</FieldLabel>
            <View style={{ alignItems: "flex-start", marginTop: 6 }}>
              <ActionButton
                disabled={!liveDeviceSession || isStartingWifiRecovery || isSavingSettings}
                label={isStartingWifiRecovery ? "Starting recovery…" : "Enter Wi‑Fi recovery"}
                onPress={confirmWifiRecovery}
              />
            </View>
          </View>
        </GlassCard>
      </View>
      </View>
    </ScreenFrame>
  );
}
