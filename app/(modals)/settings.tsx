import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { SettingRow } from "@/components/ui/setting-row";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions } from "@/hooks/use-devices";
import { withAlpha } from "@/lib/color";
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
        minHeight: 46,
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
  paletteId: string;
  resetTimeInput: string;
  timezoneInput: string;
  weeklyTarget: number;
}): DeviceSettingsPatch | null {
  const patch: DeviceSettingsPatch = {};
  const normalizedBrightness = parseBrightness(params.brightnessInput);
  const normalizedTimezone = params.timezoneInput.trim();

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

export default function SettingsModal() {
  const router = useRouter();
  const { mode, signOut, userEmail } = useAuth();
  const device = useActiveDevice();
  const { applySettingsDraft, isSavingSettings } = useDeviceActions();
  const [weeklyTarget, setWeeklyTarget] = useState(device.weeklyTarget);
  const [timezoneInput, setTimezoneInput] = useState(device.timezone);
  const [resetTimeInput, setResetTimeInput] = useState(device.resetTime);
  const [autoBrightness, setAutoBrightness] = useState(device.autoBrightness);
  const [brightnessInput, setBrightnessInput] = useState(String(device.brightness));
  const [paletteId, setPaletteId] = useState(device.paletteId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
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
    device.paletteId,
    device.resetTime,
    device.timezone,
    device.weeklyTarget,
  ]);

  const phoneTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const liveDeviceSession = mode === "demo" || device.isLive;
  const normalizedBrightness = parseBrightness(brightnessInput);
  const draftPatch = useMemo(
    () =>
      buildSettingsPatch({
        autoBrightness,
        brightnessInput,
        device,
        paletteId,
        resetTimeInput,
        timezoneInput,
        weeklyTarget,
      }),
    [autoBrightness, brightnessInput, device, paletteId, resetTimeInput, timezoneInput, weeklyTarget],
  );
  const canApply =
    liveDeviceSession &&
    !isSavingSettings &&
    !!draftPatch &&
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
      setStatusMessage("Settings applied on the device.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to apply settings.");
    }
  }

  function handleResetDraft() {
    setWeeklyTarget(device.weeklyTarget);
    setTimezoneInput(device.timezone);
    setResetTimeInput(device.resetTime);
    setAutoBrightness(device.autoBrightness);
    setBrightnessInput(String(device.brightness));
    setPaletteId(device.paletteId);
    setStatusError(null);
    setStatusMessage("Draft reset to the latest device-confirmed settings.");
  }

  return (
    <GlassSheet subtitle="Core settings stay local in this draft until you tap Apply." title="Settings" variant="full">
      {!liveDeviceSession ? (
        <GlassCard style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
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
            Core settings are live-only. Rejoin Wi-Fi before changing them.
          </Text>
          <View style={{ alignItems: "flex-start", marginTop: 8 }}>
            <ActionButton
              label="Open Wi-Fi recovery"
              onPress={() => {
                router.push("/recovery");
              }}
            />
          </View>
        </GlassCard>
      ) : null}

      <View style={{ gap: 10 }}>
        <SectionTitle>Habit</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
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
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Time</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <FieldLabel>Timezone</FieldLabel>
          <TextInput
            autoCapitalize="none"
            editable={liveDeviceSession && !isSavingSettings}
            onChangeText={(value) => {
              setTimezoneInput(value);
              setStatusError(null);
              setStatusMessage(null);
            }}
            placeholder="America/Los_Angeles"
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
              opacity: liveDeviceSession ? 1 : 0.6,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
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
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <FieldLabel>Reset time</FieldLabel>
          <TextInput
            editable={liveDeviceSession && !isSavingSettings}
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              setResetTimeInput(value);
              setStatusError(null);
              setStatusMessage(null);
            }}
            placeholder="00:00"
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
              opacity: liveDeviceSession ? 1 : 0.6,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
            value={resetTimeInput}
          />
          <Text
            style={{
              color: isValidResetTime(resetTimeInput) ? theme.colors.textSecondary : theme.colors.statusErrorMuted,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Use 24-hour format like 00:00 or 03:30.
          </Text>
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Display</SectionTitle>
        <SettingRow
          label="Auto brightness"
          trailing={
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
          }
        />

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <FieldLabel>Manual brightness</FieldLabel>
          <TextInput
            editable={liveDeviceSession && !isSavingSettings && !autoBrightness}
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              setBrightnessInput(value);
              setStatusError(null);
              setStatusMessage(null);
            }}
            placeholder="0-100"
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
              opacity: liveDeviceSession && !autoBrightness ? 1 : 0.6,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
            value={brightnessInput}
          />
          <Text
            style={{
              color: normalizedBrightness !== null ? theme.colors.textSecondary : theme.colors.statusErrorMuted,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {autoBrightness ? "Auto-adjust is enabled. Manual brightness is saved but inactive." : "Choose a level from 0 to 100."}
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <FieldLabel>Board palette</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Device</SectionTitle>
        <SettingRow label="Firmware" value={device.firmwareVersion} />
        <SettingRow label="Recovery" value="Use Rejoin Wi-Fi if the router or password changes." />
        <View style={{ alignItems: "flex-start" }}>
          <ActionButton
            label="Open Wi-Fi recovery"
            onPress={() => {
              router.push("/recovery");
            }}
          />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Account</SectionTitle>
        <SettingRow label="Session" value={mode === "demo" ? "Demo preview" : userEmail ?? "Email OTP session"} />
        {mode === "cloud" ? (
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/sign-in");
            }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.card,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.statusErrorMuted, 0.24),
              backgroundColor: withAlpha(theme.colors.statusErrorMuted, 0.12),
              minHeight: 52,
              paddingHorizontal: 16,
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
              Sign out
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <ActionButton
          disabled={isSavingSettings || !draftPatch}
          label="Reset draft"
          onPress={handleResetDraft}
          secondary
        />
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
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
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
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          {statusError}
        </Text>
      ) : null}
    </GlassSheet>
  );
}
