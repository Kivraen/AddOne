import { View, TextInput } from "react-native";

import { DeviceSettingsScaffold, SettingsFieldLabel, SettingsNote, SettingsSurface } from "@/components/settings/device-settings-scaffold";
import { ChoicePill } from "@/components/ui/choice-pill";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export default function DeviceSettingsHabitScreen() {
  return (
    <DeviceSettingsScaffold title="Habit">
      {(settings) => (
        <SettingsSurface>
          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Habit name</SettingsFieldLabel>
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

          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Weekly target</SettingsFieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                <ChoicePill
                  key={`target-${target}`}
                  disabled={settings.isSavingSettings}
                  label={String(target)}
                  onPress={() => settings.setDraftPatch({ weeklyTarget: target })}
                  selected={settings.draft.weeklyTarget === target}
                />
              ))}
            </View>
          </View>
        </SettingsSurface>
      )}
    </DeviceSettingsScaffold>
  );
}
