import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Pressable, Switch, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsDivider,
  SettingsFieldLabel,
  SettingsNote,
  SettingsRow,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { deviceSettingsSectionPath } from "@/lib/device-routes";

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
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: active ? withAlpha(theme.colors.textPrimary, 0.16) : withAlpha(theme.colors.textPrimary, 0.06),
        backgroundColor: active ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.bgBase, 0.42),
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: theme.colors.textPrimary,
          fontFamily: active ? theme.typography.label.fontFamily : theme.typography.body.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {active ? (
          <View
            style={{
              borderRadius: theme.radius.full,
              backgroundColor: withAlpha(theme.colors.accentAmber, 0.18),
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: theme.colors.accentAmber,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              Current
            </Text>
          </View>
        ) : null}
        <SettingsSwatchStrip colors={colors} />
      </View>
    </Pressable>
  );
}

export default function DeviceSettingsAppearanceRoute() {
  const device = useRoutedDevice();
  const router = useRouter();

  return (
    <DeviceSettingsScaffold device={device} title="Appearance">
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

            <SettingsDivider />

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
              <SettingsFieldLabel>Palette</SettingsFieldLabel>
              <SettingsNote>Start with a palette, then fine-tune the four board colors below it.</SettingsNote>
            </View>

            <View style={{ gap: 8 }}>
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

            <SettingsDivider />

            <SettingsRow
              detail="Fine-tune the four board colors that matter most."
              onPress={() => router.push(deviceSettingsSectionPath(device.id, "colors"))}
              title="Customize colors"
              trailing={<SettingsSwatchStrip colors={settings.summary.appearance.colors} />}
            />
          </SettingsSurface>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
