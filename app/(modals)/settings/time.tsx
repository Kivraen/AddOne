import { View, TextInput, Pressable, Text } from "react-native";

import { DeviceSettingsScaffold, SettingsFieldLabel, SettingsNote, SettingsSurface } from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export default function DeviceSettingsTimeScreen() {
  const phoneTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <DeviceSettingsScaffold title="Time">
      {(settings) => (
        <SettingsSurface>
          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Timezone</SettingsFieldLabel>
            <TextInput
              autoCapitalize="none"
              editable={!settings.isSavingSettings}
              onChangeText={(value) => settings.setDraftPatch({ timezone: value })}
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

          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Reset time</SettingsFieldLabel>
            <TextInput
              autoCapitalize="none"
              editable={!settings.isSavingSettings}
              onChangeText={(value) => settings.setDraftPatch({ resetTime: value })}
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
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
              value={settings.draft.resetTime}
            />
            {settings.validation.resetTime ? <SettingsNote tone="error">{settings.validation.resetTime}</SettingsNote> : null}
          </View>
        </SettingsSurface>
      )}
    </DeviceSettingsScaffold>
  );
}
