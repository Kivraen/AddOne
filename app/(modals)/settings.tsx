import { useRouter } from "expo-router";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { SettingRow } from "@/components/ui/setting-row";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions } from "@/hooks/use-devices";
import { useDeviceSharing, useSharingActions } from "@/hooks/use-sharing";
import { withAlpha } from "@/lib/color";

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
  destructive = false,
  disabled = false,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
        minWidth: 82,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: destructive ? withAlpha(theme.colors.statusErrorMuted, 0.28) : withAlpha(theme.colors.textPrimary, 0.12),
        backgroundColor: destructive ? withAlpha(theme.colors.statusErrorMuted, 0.12) : withAlpha(theme.colors.textPrimary, 0.08),
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 14,
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

function FieldCard({
  actionLabel = "Save",
  disabled = false,
  helperText,
  keyboardType,
  label,
  onAction,
  onChangeText,
  placeholder,
  value,
}: {
  actionLabel?: string;
  disabled?: boolean;
  helperText?: string;
  keyboardType?: "default" | "numbers-and-punctuation";
  label: string;
  onAction: () => void;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
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
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
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
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
        value={value}
      />
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        {helperText ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              flex: 1,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {helperText}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <ActionButton disabled={disabled} label={actionLabel} onPress={onAction} />
      </View>
    </GlassCard>
  );
}

function isValidResetTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export default function SettingsModal() {
  const router = useRouter();
  const { mode, signOut, userEmail } = useAuth();
  const device = useActiveDevice();
  const {
    isBusy: isDeviceBusy,
    setAutoBrightness,
    setHabitName,
    setPalette,
    setReminderEnabled,
    setResetTime,
    setTimezone,
    setWeeklyTarget,
    toggleReward,
  } = useDeviceActions();
  const { isLoading: isSharingLoading, sharing } = useDeviceSharing(device.id);
  const { approveRequest, isBusy: isSharingBusy, rejectRequest, rotateCode } = useSharingActions(device.id);
  const [habitNameInput, setHabitNameInput] = useState(device.name);
  const [timezoneInput, setTimezoneInput] = useState(device.timezone);
  const [resetTimeInput, setResetTimeInput] = useState(device.resetTime);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setHabitNameInput(device.name);
    setTimezoneInput(device.timezone);
    setResetTimeInput(device.resetTime);
    setStatusError(null);
    setStatusMessage(null);
  }, [device.id, device.name, device.resetTime, device.timezone]);

  const phoneTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const busy = isDeviceBusy || isSharingBusy;
  const liveDeviceSession = mode === "demo" || device.isLive;
  const deviceControlDisabled = busy || !liveDeviceSession;

  async function runAction(action: () => Promise<unknown> | unknown, successMessage: string) {
    try {
      setStatusError(null);
      setStatusMessage(null);
      await action();
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <GlassSheet subtitle="Core controls stay here. History stays on the board." title="Settings" variant="full">
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
            Device settings are live-only. Reconnect through cloud or join the AddOne AP to change them.
          </Text>
        </GlassCard>
      ) : null}

      <View style={{ gap: 10 }}>
        <SectionTitle>Habit</SectionTitle>
        <FieldCard
          disabled={deviceControlDisabled || !habitNameInput.trim() || habitNameInput.trim() === device.name}
          helperText="Shown on the app and device."
          label="Habit name"
          onAction={() => {
            void runAction(() => setHabitName(habitNameInput), "Habit name saved.");
          }}
          onChangeText={setHabitNameInput}
          placeholder="Habit name"
          value={habitNameInput}
        />
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Weekly target
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
              <ChoicePill
                key={`target-${target}`}
                disabled={deviceControlDisabled}
                label={String(target)}
                onPress={() => {
                  void runAction(() => setWeeklyTarget(target), "Weekly target updated.");
                }}
                selected={device.weeklyTarget === target}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Week start
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Monday is the active week-start rule in this build so the app and device stay aligned.
          </Text>
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Time</SectionTitle>
        <FieldCard
          disabled={deviceControlDisabled || !timezoneInput.trim() || timezoneInput.trim() === device.timezone}
          helperText={`Current phone zone: ${phoneTimezone}`}
          label="Timezone"
          onAction={() => {
            void runAction(() => setTimezone(timezoneInput), "Timezone saved.");
          }}
          onChangeText={setTimezoneInput}
          placeholder="America/Los_Angeles"
          value={timezoneInput}
        />
        <View style={{ alignItems: "flex-end" }}>
          <ActionButton
            disabled={deviceControlDisabled || timezoneInput === phoneTimezone}
            label="Use phone zone"
            onPress={() => {
              setTimezoneInput(phoneTimezone);
            }}
          />
        </View>
        <FieldCard
          disabled={deviceControlDisabled || !isValidResetTime(resetTimeInput) || resetTimeInput === device.resetTime}
          helperText="Use 24-hour format like 00:00 or 03:30."
          keyboardType="numbers-and-punctuation"
          label="Reset time"
          onAction={() => {
            void runAction(() => setResetTime(resetTimeInput), "Reset time saved.");
          }}
          onChangeText={setResetTimeInput}
          placeholder="00:00"
          value={resetTimeInput}
        />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Display</SectionTitle>
        <SettingRow
          label="Auto brightness"
          trailing={
            <Switch
              disabled={deviceControlDisabled}
              onValueChange={(value) => {
                void runAction(() => setAutoBrightness(value), value ? "Auto brightness enabled." : "Auto brightness disabled.");
              }}
              thumbColor={device.autoBrightness ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={device.autoBrightness}
            />
          }
        />
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Board palette
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {boardPalettes.map((palette) => (
              <ChoicePill
                key={palette.id}
                disabled={deviceControlDisabled}
                label={palette.name}
                onPress={() => {
                  void runAction(() => setPalette(palette.id), `${palette.name} palette applied.`);
                }}
                selected={palette.id === device.paletteId}
              />
            ))}
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Rewards</SectionTitle>
        <SettingRow
          label="Rewards"
          trailing={
            <Switch
              disabled={deviceControlDisabled}
              onValueChange={() => {
                void runAction(() => toggleReward(), device.rewardEnabled ? "Rewards disabled." : "Rewards enabled.");
              }}
              thumbColor={device.rewardEnabled ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={device.rewardEnabled}
            />
          }
          value={device.rewardEnabled ? "Enabled" : "Off by default"}
        />
        <Pressable
          disabled={!liveDeviceSession}
          onPress={() => {
            if (liveDeviceSession) {
              router.push("/rewards");
            }
          }}
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
            opacity: liveDeviceSession ? 1 : 0.45,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Reward editor
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Clock, paint, saved art, AI prompt
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Open
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Device</SectionTitle>
        <SettingRow label="Firmware" value={device.firmwareVersion} />
        <SettingRow label="Recovery" value="AP mode on first boot, power-up hold, or Wi-Fi join failure" />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Account</SectionTitle>
        <SettingRow label="Session" value={mode === "demo" ? "Demo preview. Supabase is not configured." : userEmail ?? "Email OTP session"} />
        <SettingRow
          label="Reminders"
          trailing={
            <Switch
              onValueChange={(value) => {
                void runAction(
                  () => setReminderEnabled(value),
                  value ? `Daily reminder enabled at ${device.reminderTime}.` : "Push reminders disabled.",
                );
              }}
              thumbColor={device.reminderEnabled ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={device.reminderEnabled}
            />
          }
          value={device.reminderEnabled ? `Daily at ${device.reminderTime}` : "Push reminders off"}
        />
        <SettingRow label="Ownership" value="Single owner, view-only approvals" />
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

      <View style={{ gap: 10 }}>
        <SectionTitle>Sharing</SectionTitle>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Invite code
          </Text>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                flex: 1,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              {isSharingLoading ? "Loading…" : sharing.code ?? "Unavailable"}
            </Text>
            <ActionButton
              disabled={busy}
              label="Rotate"
              onPress={() => {
                void runAction(() => rotateCode(), "Share code rotated.");
              }}
            />
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Share this code. Access stays pending until you approve it.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Pending approvals
          </Text>
          {sharing.pendingRequests.length === 0 ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              No pending requests right now.
            </Text>
          ) : (
            sharing.pendingRequests.map((request) => (
              <View
                key={request.id}
                style={{
                  borderRadius: theme.radius.card,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  backgroundColor: withAlpha(theme.colors.bgBase, 0.46),
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: theme.typography.label.fontSize,
                      lineHeight: theme.typography.label.lineHeight,
                    }}
                  >
                    {request.requesterDisplayName}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Requested access on {new Date(request.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <ActionButton
                    disabled={busy}
                    label="Approve"
                    onPress={() => {
                      void runAction(() => approveRequest(request.id), `${request.requesterDisplayName} can now view this board.`);
                    }}
                  />
                  <ActionButton
                    destructive
                    disabled={busy}
                    label="Reject"
                    onPress={() => {
                      void runAction(() => rejectRequest(request.id), `Rejected ${request.requesterDisplayName}.`);
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Approved viewers
          </Text>
          {sharing.viewers.length === 0 ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              No approved viewers yet.
            </Text>
          ) : (
            sharing.viewers.map((viewer) => (
              <View
                key={viewer.membershipId}
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    flex: 1,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {viewer.displayName}
                </Text>
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
                  {viewer.approvedAt ? new Date(viewer.approvedAt).toLocaleDateString() : "Approved"}
                </Text>
              </View>
            ))
          )}
        </GlassCard>
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
        Developer tools stay hidden behind a deliberate gesture.
      </Text>
    </GlassSheet>
  );
}
