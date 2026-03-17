import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Pressable, Text, TextInput, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsDivider,
  SettingsFieldLabel,
  SettingsNote,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

function parseResetTime(value: string) {
  const [hoursText = "0", minutesText = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hoursText) || 0, Number(minutesText) || 0, 0, 0);
  return date;
}

function formatResetTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function weeklyTargetLabel(value: number) {
  return value === 1 ? "1 day per week" : `${value} days per week`;
}

export default function DeviceSettingsRoutineRoute() {
  const device = useRoutedDevice();
  const phoneTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <DeviceSettingsScaffold device={device} title="Routine">
      {(settings) => (
        <>
          <SettingsSurface>
            <View style={{ gap: 8 }}>
              <SettingsFieldLabel>Habit name</SettingsFieldLabel>
              <SettingsNote>This name stays attached to this device and its daily board.</SettingsNote>
              <TextInput
                autoCapitalize="words"
                editable={!settings.isSavingSettings}
                onChangeText={(value) => settings.setDraftPatch({ habitName: value })}
                placeholder="Daily habit"
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

            <SettingsDivider />

            <View style={{ gap: 10 }}>
              <View style={{ gap: 4 }}>
                <SettingsFieldLabel>Weekly target</SettingsFieldLabel>
                <SettingsNote>Choose how many days count as a successful week for this board.</SettingsNote>
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
              <SettingsNote>{weeklyTargetLabel(settings.draft.weeklyTarget)}.</SettingsNote>
            </View>
          </SettingsSurface>

          <SettingsSurface>
            <View style={{ gap: 8 }}>
              <SettingsFieldLabel>Timezone</SettingsFieldLabel>
              <SettingsNote>Use an IANA timezone so resets happen at the right local time for this device.</SettingsNote>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!settings.isSavingSettings}
                onChangeText={(value) => settings.setDraftPatch({ timezone: value })}
                placeholder="America/Los_Angeles"
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="done"
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
                value={settings.draft.timezone}
              />
              <View style={{ alignItems: "flex-start" }}>
                <Pressable
                  disabled={settings.isSavingSettings || settings.draft.timezone === phoneTimezone}
                  onPress={() => settings.setDraftPatch({ timezone: phoneTimezone })}
                  style={{
                    minHeight: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                    backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
                    opacity: settings.isSavingSettings || settings.draft.timezone === phoneTimezone ? 0.45 : 1,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: 12,
                      lineHeight: 16,
                    }}
                  >
                    Use phone timezone
                  </Text>
                </Pressable>
              </View>
              {settings.validation.timezone ? <SettingsNote tone="error">{settings.validation.timezone}</SettingsNote> : null}
            </View>

            <SettingsDivider />

            <View style={{ gap: 8 }}>
              <SettingsFieldLabel>Reset time</SettingsFieldLabel>
              <SettingsNote>The board rolls to the next day at this local device time.</SettingsNote>
              <View
                style={{
                  borderRadius: theme.radius.sheet,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                  minHeight: 56,
                  justifyContent: "center",
                  paddingHorizontal: 16,
                }}
              >
                <DateTimePicker
                  accentColor={theme.colors.accentAmber}
                  display={process.env.EXPO_OS === "ios" ? "compact" : "default"}
                  disabled={settings.isSavingSettings}
                  is24Hour
                  minuteInterval={5}
                  mode="time"
                  onChange={(_, selectedDate) => {
                    if (!selectedDate) {
                      return;
                    }

                    settings.setDraftPatch({ resetTime: formatResetTime(selectedDate) });
                  }}
                  value={parseResetTime(settings.draft.resetTime)}
                />
              </View>
              <SettingsNote>{`Currently resets at ${settings.draft.resetTime}.`}</SettingsNote>
              {settings.validation.resetTime ? <SettingsNote tone="error">{settings.validation.resetTime}</SettingsNote> : null}
            </View>
          </SettingsSurface>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
