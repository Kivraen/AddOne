import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Pressable, Switch, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsFieldLabel,
  SETTINGS_HEADER_GAP,
  SettingsNote,
  SETTINGS_PAGE_GAP,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { boardPalettes } from "@/constants/palettes";
import { theme } from "@/constants/theme";
import { getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { deviceSettingsSectionPath } from "@/lib/device-routes";

const APPEARANCE_OPTION_GAP = 12;

function PaletteOption({
  active,
  colors,
  label,
  onEditPress,
  onPress,
}: {
  active: boolean;
  colors: string[];
  label: string;
  onEditPress: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: active ? withAlpha(theme.colors.textPrimary, 0.16) : withAlpha(theme.colors.textPrimary, 0.06),
        backgroundColor: active ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.bgBase, 0.42),
        paddingHorizontal: 15,
        paddingVertical: 14,
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
        <SettingsSwatchStrip colors={colors} />
        <Pressable
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onEditPress();
          }}
        >
          {({ pressed }) => (
            <View
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.textPrimary, active ? 0.12 : 0.08),
                backgroundColor: withAlpha(theme.colors.textPrimary, pressed ? 0.12 : active ? 0.08 : 0.04),
              }}
            >
              <Ionicons color={theme.colors.textPrimary} name="pencil" size={16} />
            </View>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function DeviceSettingsAppearanceRoute() {
  const device = useRoutedDevice();
  const router = useRouter();

  return (
    <DeviceSettingsScaffold device={device} title="Appearance">
      {(settings) => {
        const handleEditPalette = (paletteId: string) => {
          settings.setPalettePreset(paletteId);
          router.push(deviceSettingsSectionPath(device.id, "colors"));
        };

        return (
          <View style={{ gap: SETTINGS_PAGE_GAP }}>
            <SettingsSurface>
              <View style={{ gap: SETTINGS_HEADER_GAP }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <SettingsFieldLabel>Auto brightness</SettingsFieldLabel>
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
                <SettingsNote>Let the board adjust brightness.</SettingsNote>
              </View>
            </SettingsSurface>

            {!settings.draft.autoBrightness ? (
              <SettingsSurface>
                <View style={{ gap: SETTINGS_HEADER_GAP }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
                  <SettingsNote>Set brightness directly when auto is off.</SettingsNote>
                </View>

                <Slider
                  disabled={settings.isSavingSettings}
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
              </SettingsSurface>
            ) : null}

            <SettingsSurface>
              <View style={{ gap: SETTINGS_HEADER_GAP }}>
                <SettingsFieldLabel>Palette</SettingsFieldLabel>
                <SettingsNote>Choose a palette, then edit it if needed.</SettingsNote>
              </View>

              <View style={{ gap: APPEARANCE_OPTION_GAP }}>
                {boardPalettes.map((palette) => {
                  const isActive = settings.draft.paletteId === palette.id;
                  const preview = getMergedPalette(palette.id, isActive ? settings.draft.customPalette : {});
                  return (
                    <PaletteOption
                      key={palette.id}
                      active={isActive}
                      colors={[preview.dayOn, preview.weekSuccess, preview.weekFail]}
                      label={palette.name}
                      onEditPress={() => handleEditPalette(palette.id)}
                      onPress={() => settings.setPalettePreset(palette.id)}
                    />
                  );
                })}
              </View>
            </SettingsSurface>
          </View>
        );
      }}
    </DeviceSettingsScaffold>
  );
}
