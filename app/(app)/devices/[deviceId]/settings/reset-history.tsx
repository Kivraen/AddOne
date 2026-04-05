import { Picker } from "@react-native-picker/picker";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { ScreenScrollView } from "@/components/layout/screen-frame";
import {
  SETTINGS_FIELD_GAP,
  SETTINGS_HEADER_GAP,
  SETTINGS_PAGE_GAP,
  SETTINGS_SURFACE_GAP,
  SettingsFieldLabel,
  SettingsNote,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { useDeviceActions } from "@/hooks/use-devices";
import {
  HABIT_NAME_MAX_LENGTH,
  MINIMUM_GOAL_MAX_LENGTH,
  MINIMUM_GOAL_PLACEHOLDER,
  normalizeHabitNameForSave,
  normalizeMinimumGoalForSave,
} from "@/lib/habit-details";
import { withAlpha } from "@/lib/color";

function weeklyTargetLabel(value: number) {
  return value === 1 ? "1 day per week" : `${value} days per week`;
}

function CharacterCount({ current, max }: { current: number; max: number }) {
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

function PrimaryButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.accentAmber, pressed ? 0.22 : 0.16),
        backgroundColor: withAlpha(theme.colors.accentAmber, pressed ? 0.16 : 0.12),
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed && !disabled ? 0.988 : 1 }],
      })}
    >
      <Text
        style={{
          color: theme.colors.accentAmber,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 18,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ResetHistoryRoute() {
  const device = useRoutedDevice();
  const router = useRouter();
  const { isResettingHistory, resetHistory } = useDeviceActions();
  const [habitNameInput, setHabitNameInput] = useState("");
  const [minimumGoalInput, setMinimumGoalInput] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(device.weeklyTarget);

  const normalizedHabitName = normalizeHabitNameForSave(habitNameInput);
  const normalizedMinimumGoal = normalizeMinimumGoalForSave(minimumGoalInput);
  const validation = useMemo(
    () => ({
      habitName: habitNameInput.trim() ? null : "Enter a habit name for the new habit.",
      minimumGoal: normalizedMinimumGoal ? null : "Enter the daily minimum for the new habit.",
    }),
    [habitNameInput, normalizedMinimumGoal],
  );
  const canSubmit = !isResettingHistory && !validation.habitName && !validation.minimumGoal;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    try {
      await resetHistory({
        dailyMinimum: normalizedMinimumGoal,
        deviceId: device.id,
        habitName: normalizedHabitName,
        weeklyTarget,
      });

      Alert.alert("New habit started", "The board is ready for the new habit.", [
        {
          text: "OK",
          onPress: () => {
            router.replace("/");
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Couldn't reset history",
        error instanceof Error ? error.message : "The board could not start a new habit.",
      );
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Start new habit",
        }}
      />
      <ScreenScrollView
        contentContainerStyle={{ paddingTop: 0 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        safeAreaEdges={["left", "right", "bottom"]}
      >
        <View style={{ gap: SETTINGS_PAGE_GAP }}>
          <View style={{ gap: SETTINGS_FIELD_GAP }}>
            <SettingsNote>Start a new habit on this board. The current board clears, totals restart, and older habit data stays archived in the backend.</SettingsNote>
          </View>

          <SettingsSurface>
            <View style={{ gap: SETTINGS_SURFACE_GAP }}>
              <View style={{ gap: SETTINGS_FIELD_GAP }}>
                <View style={{ gap: SETTINGS_HEADER_GAP }}>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <SettingsFieldLabel>Habit name</SettingsFieldLabel>
                    <CharacterCount current={habitNameInput.length} max={HABIT_NAME_MAX_LENGTH} />
                  </View>
                  <SettingsNote>Name the new habit before the board clears.</SettingsNote>
                </View>
                <TextInput
                  autoCapitalize="words"
                  editable={!isResettingHistory}
                  maxLength={HABIT_NAME_MAX_LENGTH}
                  onChangeText={setHabitNameInput}
                  placeholder="Habit Name"
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
                  value={habitNameInput}
                />
                {validation.habitName ? <SettingsNote tone="error">{validation.habitName}</SettingsNote> : null}
              </View>

              <View style={{ gap: SETTINGS_FIELD_GAP }}>
                <View style={{ gap: SETTINGS_HEADER_GAP }}>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <SettingsFieldLabel>Daily minimum</SettingsFieldLabel>
                    <CharacterCount current={minimumGoalInput.length} max={MINIMUM_GOAL_MAX_LENGTH} />
                  </View>
                  <SettingsNote>Write the smallest version that still counts.</SettingsNote>
                </View>
                <TextInput
                  autoCapitalize="sentences"
                  editable={!isResettingHistory}
                  maxLength={MINIMUM_GOAL_MAX_LENGTH}
                  onChangeText={setMinimumGoalInput}
                  placeholder={MINIMUM_GOAL_PLACEHOLDER}
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
                  value={minimumGoalInput}
                />
                {validation.minimumGoal ? <SettingsNote tone="error">{validation.minimumGoal}</SettingsNote> : null}
              </View>
            </View>
          </SettingsSurface>

          <SettingsSurface>
            <View style={{ gap: SETTINGS_FIELD_GAP }}>
              <View style={{ gap: SETTINGS_HEADER_GAP }}>
                <SettingsFieldLabel>Weekly target</SettingsFieldLabel>
                <SettingsNote>Days that make a successful week for the new habit.</SettingsNote>
              </View>
              <View
                style={{
                  overflow: "hidden",
                  borderRadius: theme.radius.sheet,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                }}
              >
                <Picker
                  dropdownIconColor={theme.colors.textSecondary}
                  enabled={!isResettingHistory}
                  itemStyle={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 18,
                  }}
                  onValueChange={(value) => setWeeklyTarget(Number(value))}
                  selectedValue={weeklyTarget}
                  style={{ color: theme.colors.textPrimary }}
                >
                  {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                    <Picker.Item key={`reset-history-target-${target}`} label={weeklyTargetLabel(target)} value={target} />
                  ))}
                </Picker>
              </View>
            </View>
          </SettingsSurface>

          <PrimaryButton
            disabled={!canSubmit}
            label={isResettingHistory ? "Starting…" : "Start new habit"}
            onPress={() => {
              void handleSubmit();
            }}
          />
        </View>
      </ScreenScrollView>
    </>
  );
}
