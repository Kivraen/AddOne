import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsDivider,
  SettingsFieldLabel,
  SETTINGS_FIELD_GAP,
  SETTINGS_HEADER_GAP,
  SettingsListSurface,
  SettingsNote,
  SettingsRow,
  SettingsSectionTitle,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { useDeviceActions } from "@/hooks/use-devices";
import { withAlpha } from "@/lib/color";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsSectionPath } from "@/lib/device-routes";

const OVERVIEW_SECTION_GAP = 12;

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
        minHeight: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: isPrimary ? withAlpha(theme.colors.accentAmber, 0.18) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: isPrimary ? withAlpha(theme.colors.accentAmber, 0.1) : withAlpha(theme.colors.textPrimary, 0.04),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 14,
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
  const { isStartingFactoryReset, requestFactoryReset } = useDeviceActions();

  function handleFactoryReset() {
    Alert.alert(
      "Factory reset device?",
      "This wipes the board's local setup and Wi‑Fi so it behaves like a new unit again. Wi‑Fi recovery is lighter and keeps your current board attached.",
      [
        {
          style: "cancel",
          text: "Cancel",
        },
        {
          style: "destructive",
          text: "Factory reset",
          onPress: () => {
            void requestFactoryReset(device.id).then(
              () => {
                Alert.alert(
                  "Factory reset started",
                  "The board will restart into clean setup mode. When it comes back, you can onboard it again and choose restore or start fresh.",
                );
              },
              (error: unknown) => {
                Alert.alert(
                  "Factory reset failed",
                  error instanceof Error ? error.message : "The board could not start factory reset.",
                );
              },
            );
          },
        },
      ],
    );
  }

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
            <SettingsSurface>
              <View style={{ gap: SETTINGS_HEADER_GAP }}>
                <SettingsFieldLabel>Unapplied changes</SettingsFieldLabel>
                <SettingsNote>Apply or discard changes before you leave settings.</SettingsNote>
              </View>
              <View style={{ flexDirection: "row", gap: SETTINGS_FIELD_GAP + 2 }}>
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

          <View style={{ gap: OVERVIEW_SECTION_GAP }}>
            <SettingsSectionTitle>Configuration</SettingsSectionTitle>
            <SettingsListSurface>
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
            </SettingsListSurface>
          </View>

          <View style={{ gap: OVERVIEW_SECTION_GAP }}>
            <SettingsSectionTitle>Tools</SettingsSectionTitle>
            <SettingsListSurface>
              <SettingsRow
                detail={
                  device.isLive
                    ? "Use recovery Wi-Fi when reconnection is needed"
                    : "Reconnect this board with recovery Wi-Fi"
                }
                onPress={() => router.push(deviceRecoveryPath(device.id))}
                title="Recovery"
              />
              <SettingsDivider />
              <SettingsRow
                detail="Edit earlier days only when a manual fix is needed"
                onPress={() => router.push(deviceHistoryPath(device.id))}
                title="History"
              />
            </SettingsListSurface>
          </View>

          <View style={{ gap: OVERVIEW_SECTION_GAP }}>
            <SettingsSectionTitle>Danger zone</SettingsSectionTitle>
            <SettingsListSurface>
              <SettingsRow
                detail={
                  device.isLive
                    ? isStartingFactoryReset
                      ? "Starting reset…"
                      : "Wipes local setup and reopens onboarding. This is not the same as Wi‑Fi recovery."
                    : "Factory reset from the app is only available while the board is online."
                }
                onPress={device.isLive && !isStartingFactoryReset ? handleFactoryReset : undefined}
                title="Factory reset device"
              />
            </SettingsListSurface>
          </View>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
