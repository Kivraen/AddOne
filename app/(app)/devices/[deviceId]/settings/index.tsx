import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsDivider,
  SettingsFieldLabel,
  SettingsNote,
  SettingsRow,
  SettingsSectionTitle,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsSectionPath } from "@/lib/device-routes";

function DraftActionButton({
  disabled = false,
  emphasis = "secondary",
  label,
  onPress,
}: {
  disabled?: boolean;
  emphasis?: "primary" | "secondary";
  label: string;
  onPress: () => void;
}) {
  const isPrimary = emphasis === "primary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: isPrimary ? withAlpha(theme.colors.accentAmber, 0.22) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: isPrimary ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.bgBase, 0.34),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          color: isPrimary ? theme.colors.accentAmber : theme.colors.textPrimary,
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

export default function DeviceSettingsOverviewRoute() {
  const device = useRoutedDevice();
  const router = useRouter();

  return (
    <DeviceSettingsScaffold
      device={device}
      headerLeft={() => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace("/");
          }}
          hitSlop={10}
          style={{
            alignItems: "center",
            justifyContent: "center",
            minHeight: 32,
            minWidth: 28,
            marginLeft: -4,
            paddingRight: 2,
          }}
        >
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
        </Pressable>
      )}
      showHeaderApply={false}
      title={device.name}
    >
      {(settings) => (
        <>
          {settings.isDirty ? (
            <SettingsSurface style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <SettingsFieldLabel>Unapplied changes</SettingsFieldLabel>
                <SettingsNote>Review, apply, or discard your device changes before leaving settings.</SettingsNote>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DraftActionButton
                    disabled={settings.isSavingSettings}
                    label="Discard"
                    onPress={() => settings.resetToBase()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DraftActionButton
                    disabled={!settings.canApply}
                    emphasis="primary"
                    label={settings.isSavingSettings ? "Applying…" : "Apply"}
                    onPress={() => {
                      void settings.apply();
                    }}
                  />
                </View>
              </View>
            </SettingsSurface>
          ) : null}

          <View style={{ gap: 8 }}>
            <SettingsSectionTitle>Configuration</SettingsSectionTitle>
            <SettingsSurface style={{ paddingVertical: 8 }}>
              <SettingsRow
                detail={settings.summary.routine}
                onPress={() => router.push(deviceSettingsSectionPath(device.id, "routine"))}
                title="Routine"
              />
              <SettingsDivider />
              <SettingsRow
                detail={<SettingsNote>{`${settings.summary.appearance.paletteLabel} · ${settings.summary.appearance.brightness}`}</SettingsNote>}
                onPress={() => router.push(deviceSettingsSectionPath(device.id, "appearance"))}
                title="Appearance"
                trailing={<SettingsSwatchStrip colors={settings.summary.appearance.colors} />}
              />
            </SettingsSurface>
          </View>

          <View style={{ gap: 8 }}>
            <SettingsSectionTitle>Tools</SettingsSectionTitle>
            <SettingsSurface style={{ paddingVertical: 8 }}>
              <SettingsRow
                detail={
                  device.isLive
                    ? "Open AddOne recovery Wi-Fi when setup or reconnection is needed"
                    : "Reconnect this offline device through AddOne recovery Wi-Fi"
                }
                onPress={() => router.push(deviceRecoveryPath(device.id))}
                title="Recovery"
              />
              <SettingsDivider />
              <SettingsRow
                detail="Correct earlier days only when this board needs a manual fix"
                onPress={() => router.push(deviceHistoryPath(device.id))}
                title="History"
              />
            </SettingsSurface>
          </View>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
