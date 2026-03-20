import { Picker } from "@react-native-picker/picker";
import { Text, TextInput, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { DeviceTimezonePicker } from "@/components/settings/device-timezone-picker";
import {
  DEFAULT_HABIT_NAME,
  HABIT_NAME_MAX_LENGTH,
  MINIMUM_GOAL_MAX_LENGTH,
  MINIMUM_GOAL_PLACEHOLDER,
} from "@/lib/habit-details";
import {
  DeviceSettingsScaffold,
  SettingsFieldLabel,
  SETTINGS_FIELD_GAP,
  SETTINGS_HEADER_GAP,
  SettingsNote,
  SETTINGS_PAGE_GAP,
  SETTINGS_SURFACE_GAP,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { readCurrentPhoneTimezone } from "@/lib/device-timezone";

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

export default function DeviceSettingsRoutineRoute() {
  const device = useRoutedDevice();
  const phoneTimezone = readCurrentPhoneTimezone();

  return (
    <DeviceSettingsScaffold device={device} title="Routine">
      {(settings) => (
        <View style={{ gap: SETTINGS_PAGE_GAP }}>
          <SettingsSurface>
            <View style={{ gap: SETTINGS_SURFACE_GAP }}>
              <View style={{ gap: SETTINGS_FIELD_GAP }}>
                <View style={{ gap: SETTINGS_HEADER_GAP }}>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <SettingsFieldLabel>Habit name</SettingsFieldLabel>
                    <CharacterCount current={settings.draft.habitName.length} max={HABIT_NAME_MAX_LENGTH} />
                  </View>
                  <SettingsNote>This name stays with this board. Leave &quot;Habit Name&quot; if you want to decide later.</SettingsNote>
                </View>
                <TextInput
                  autoCapitalize="words"
                  editable={!settings.isSavingSettings}
                  maxLength={HABIT_NAME_MAX_LENGTH}
                  onChangeText={(value) => settings.setDraftPatch({ habitName: value })}
                  placeholder={DEFAULT_HABIT_NAME}
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
                  value={settings.draft.habitName}
                />
                {settings.validation.habitName ? <SettingsNote tone="error">{settings.validation.habitName}</SettingsNote> : null}
              </View>

              <View style={{ gap: SETTINGS_FIELD_GAP }}>
                <View style={{ gap: SETTINGS_HEADER_GAP }}>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <SettingsFieldLabel>Daily minimum</SettingsFieldLabel>
                    <CharacterCount current={settings.draft.minimumGoal.length} max={MINIMUM_GOAL_MAX_LENGTH} />
                  </View>
                  <SettingsNote>Write the smallest version that still counts.</SettingsNote>
                </View>
                <TextInput
                  autoCapitalize="sentences"
                  editable={!settings.isSavingSettings}
                  maxLength={MINIMUM_GOAL_MAX_LENGTH}
                  onChangeText={(value) => settings.setDraftPatch({ minimumGoal: value })}
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
                  value={settings.draft.minimumGoal}
                />
                {settings.validation.minimumGoal ? <SettingsNote tone="error">{settings.validation.minimumGoal}</SettingsNote> : null}
              </View>
            </View>
          </SettingsSurface>

          <SettingsSurface>
            <View style={{ gap: SETTINGS_FIELD_GAP }}>
              <View style={{ gap: SETTINGS_HEADER_GAP }}>
                <SettingsFieldLabel>Weekly target</SettingsFieldLabel>
                <SettingsNote>Days that make a successful week.</SettingsNote>
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
                  enabled={!settings.isSavingSettings}
                  itemStyle={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 18,
                  }}
                  onValueChange={(value) => settings.setDraftPatch({ weeklyTarget: Number(value) })}
                  selectedValue={settings.draft.weeklyTarget}
                  style={{ color: theme.colors.textPrimary }}
                >
                  {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                    <Picker.Item key={`weekly-target-${target}`} label={weeklyTargetLabel(target)} value={target} />
                  ))}
                </Picker>
              </View>
            </View>
          </SettingsSurface>

          <SettingsSurface>
            <DeviceTimezonePicker
              description="Sets the board's local day and reset timing."
              disabled={settings.isSavingSettings}
              errorText={settings.validation.timezone ?? null}
              onChange={(nextTimezone) => settings.setDraftPatch({ timezone: nextTimezone })}
              phoneTimezone={phoneTimezone}
              value={settings.draft.timezone}
            />
          </SettingsSurface>
        </View>
      )}
    </DeviceSettingsScaffold>
  );
}
