import { useRouter } from "expo-router";
import { Pressable, Switch, Text, View } from "react-native";

import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { SettingRow } from "@/components/ui/setting-row";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { withAlpha } from "@/lib/color";
import { useAddOneStore } from "@/store/addone-store";

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

export default function SettingsModal() {
  const router = useRouter();
  const device = useActiveDevice();
  const setPalette = useAddOneStore((state) => state.setPalette);
  const setWeeklyTarget = useAddOneStore((state) => state.setWeeklyTarget);
  const setWeekStart = useAddOneStore((state) => state.setWeekStart);
  const setReminderEnabled = useAddOneStore((state) => state.setReminderEnabled);
  const setAutoBrightness = useAddOneStore((state) => state.setAutoBrightness);
  const toggleReward = useAddOneStore((state) => state.toggleReward);

  return (
    <GlassSheet subtitle="Core controls stay here. History stays on the board." title="Settings" variant="full">
      <View style={{ gap: 10 }}>
        <SectionTitle>Habit</SectionTitle>
        <SettingRow label="Habit name" value={device.name} />
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
                label={String(target)}
                onPress={() => setWeeklyTarget(target)}
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ChoicePill label="Locale" onPress={() => setWeekStart("locale")} selected={device.weekStart === "locale"} />
            <ChoicePill label="Monday" onPress={() => setWeekStart("monday")} selected={device.weekStart === "monday"} />
            <ChoicePill label="Sunday" onPress={() => setWeekStart("sunday")} selected={device.weekStart === "sunday"} />
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Time</SectionTitle>
        <SettingRow label="Timezone" value={device.timezone} />
        <SettingRow label="Reset time" value={device.resetTime} />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Display</SectionTitle>
        <SettingRow
          label="Auto brightness"
          trailing={
            <Switch
              onValueChange={setAutoBrightness}
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
            {boardPalettes.map((palette) => {
              const selected = palette.id === device.paletteId;
              return (
                <ChoicePill key={palette.id} label={palette.name} onPress={() => setPalette(palette.id)} selected={selected} />
              );
            })}
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Rewards</SectionTitle>
        <SettingRow
          label="Rewards"
          trailing={
            <Switch
              onValueChange={toggleReward}
              thumbColor={device.rewardEnabled ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={device.rewardEnabled}
            />
          }
          value={device.rewardEnabled ? "Enabled" : "Off by default"}
        />
        <Pressable
          onPress={() => router.push("/rewards")}
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
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
        <SettingRow label="Wi-Fi" value={device.wifiName} />
        <SettingRow label="Firmware" value={device.firmwareVersion} />
        <SettingRow label="Recovery" value="AP mode on first boot, power-up hold, or Wi-Fi join failure" />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Account</SectionTitle>
        <SettingRow
          label="Reminders"
          trailing={
            <Switch
              onValueChange={setReminderEnabled}
              thumbColor={device.reminderEnabled ? theme.colors.textPrimary : theme.colors.textSecondary}
              trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
              value={device.reminderEnabled}
            />
          }
          value={device.reminderEnabled ? `Daily at ${device.reminderTime}` : "Push reminders off"}
        />
        <SettingRow label="Ownership" value="Single owner, view-only approvals" />
        <SettingRow label="Sign out" value="Email magic link session" />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Sharing</SectionTitle>
        <SettingRow label="Invite code" value="Code + approval" />
        <SettingRow label="Approvals" value={`${device.sharedViewers} viewer${device.sharedViewers === 1 ? "" : "s"}`} />
      </View>

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
