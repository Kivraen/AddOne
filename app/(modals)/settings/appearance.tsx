import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Pressable, Switch, Text, View } from "react-native";

import {
  DeviceSettingsScaffold,
  SettingsFieldLabel,
  SettingsNote,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { boardPalettes } from "@/constants/palettes";
import { getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { theme } from "@/constants/theme";

function PaletteOption({
  active,
  colors,
  label,
  onPress,
}: {
  active: boolean;
  colors: string[];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: "48%",
        gap: 8,
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: active ? withAlpha(theme.colors.textPrimary, 0.16) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: active ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.bgBase, 0.46),
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: active ? theme.typography.label.fontFamily : theme.typography.body.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          {label}
        </Text>
        <SettingsSwatchStrip colors={colors} />
      </View>
    </Pressable>
  );
}

export default function DeviceSettingsAppearanceScreen() {
  const router = useRouter();

  return (
    <DeviceSettingsScaffold title="Appearance">
      {(settings) => (
        <>
          <SettingsSurface>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <SettingsFieldLabel>Auto brightness</SettingsFieldLabel>
                <SettingsNote>Let the device scale brightness automatically.</SettingsNote>
              </View>
              <Switch
                disabled={settings.isSavingSettings}
                onValueChange={(value) => settings.setDraftPatch({ autoBrightness: value })}
                thumbColor={settings.draft.autoBrightness ? theme.colors.textPrimary : theme.colors.textSecondary}
                trackColor={{
                  false: withAlpha(theme.colors.textPrimary, 0.12),
                  true: withAlpha(theme.colors.textPrimary, 0.26),
                }}
                value={settings.draft.autoBrightness}
              />
            </View>

            <View style={{ gap: 10, opacity: settings.draft.autoBrightness ? 0.45 : 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <SettingsFieldLabel>Manual brightness</SettingsFieldLabel>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.label.fontFamily,
                    fontSize: 12,
                    lineHeight: 16,
                  }}
                >
                  {settings.draft.brightness}%
                </Text>
              </View>
              <Slider
                disabled={settings.draft.autoBrightness || settings.isSavingSettings}
                maximumTrackTintColor={withAlpha(theme.colors.textPrimary, 0.08)}
                maximumValue={100}
                minimumTrackTintColor={theme.colors.textPrimary}
                minimumValue={0}
                onSlidingComplete={(value) => settings.setDraftPatch({ brightness: Math.round(value) })}
                onValueChange={(value) => settings.setDraftPatch({ brightness: Math.round(value) })}
                step={1}
                thumbTintColor={theme.colors.textPrimary}
                value={settings.draft.brightness}
              />
              {settings.validation.brightness ? <SettingsNote tone="error">{settings.validation.brightness}</SettingsNote> : null}
            </View>
          </SettingsSurface>

          <SettingsSurface>
            <View style={{ gap: 4 }}>
              <SettingsFieldLabel>Palettes</SettingsFieldLabel>
              <SettingsNote>Choose a strong starting palette, then customize the board colors below it.</SettingsNote>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {boardPalettes.map((palette) => {
                const isActive = settings.draft.paletteId === palette.id;
                const preview = getMergedPalette(palette.id, isActive ? settings.draft.customPalette : {});
                const label =
                  isActive && Object.keys(settings.draft.customPalette).length > 0 ? `${palette.name} + Custom` : palette.name;
                return (
                  <PaletteOption
                    key={palette.id}
                    active={isActive}
                    colors={[preview.socketEdge, preview.dayOn, preview.weekSuccess, preview.weekFail]}
                    label={label}
                    onPress={() => settings.setPalettePreset(palette.id)}
                  />
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push("/settings/colors")}
              style={{
                minHeight: 56,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: theme.radius.card,
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                backgroundColor: withAlpha(theme.colors.bgBase, 0.44),
                paddingHorizontal: 14,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <SettingsFieldLabel>Customize colors</SettingsFieldLabel>
                <SettingsNote>{settings.summary.appearance.paletteLabel}</SettingsNote>
              </View>
              <SettingsSwatchStrip colors={settings.summary.appearance.colors} />
            </Pressable>
          </SettingsSurface>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
