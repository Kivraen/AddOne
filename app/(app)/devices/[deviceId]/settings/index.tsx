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
import { isDeviceControlReady, isDeviceRecovering, needsDeviceRecovery } from "@/lib/device-recovery";
import { deviceHistoryPath, deviceRecoveryPath, deviceResetHistoryPath, deviceSettingsSectionPath } from "@/lib/device-routes";

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
  const {
    factoryResetAndRemove,
    isRemovingDeviceFromApp,
    isResettingHistory,
  } = useDeviceActions();
  const controlReady = isDeviceControlReady(device);

  function handleResetHistory() {
    router.push(deviceResetHistoryPath(device.id));
  }

  function handleFactoryResetAndRemove() {
    Alert.alert(
      "Factory reset and remove?",
      "This is the transfer flow. The board wipes its local setup, leaves this app, and will need to be added again by the next owner.",
      [
        {
          style: "cancel",
          text: "Cancel",
        },
        {
          style: "destructive",
          text: "Reset and remove",
          onPress: () => {
            void factoryResetAndRemove(device.id).then(
              () => {
                Alert.alert(
                  "Device removed",
                  "The board is wiping itself and has been removed from this app.",
                );
              },
              (error: unknown) => {
                Alert.alert(
                  "Remove failed",
                  error instanceof Error ? error.message : "The board could not be removed from this app.",
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
                  needsDeviceRecovery(device)
                    ? "This board was reset or lost its state. Reconnect it before using controls."
                    : isDeviceRecovering(device)
                      ? "Recovery is still finishing. Keep the board on Wi‑Fi until it settles."
                      : device.isLive
                        ? "Use recovery Wi‑Fi when reconnection is needed"
                        : "Reconnect this board with recovery Wi‑Fi"
                }
                onPress={() => router.push(deviceRecoveryPath(device.id))}
                title="Recovery"
              />
              <SettingsDivider />
              <SettingsRow
                detail={
                  controlReady
                    ? "Edit earlier days only when a manual fix is needed"
                    : "History edits unlock again after the board is online and recovery is complete."
                }
                onPress={controlReady ? () => router.push(deviceHistoryPath(device.id)) : undefined}
                title="History"
              />
            </SettingsListSurface>
          </View>

          <View style={{ gap: OVERVIEW_SECTION_GAP }}>
            <SettingsSectionTitle>Danger zone</SettingsSectionTitle>
            <SettingsListSurface>
              <SettingsRow
                detail={
                  controlReady
                    ? isResettingHistory
                      ? "Resetting history…"
                      : "Clears the current habit era and starts a blank board without removing this device."
                    : "History reset is only available while the board is online and ready."
                }
                onPress={controlReady && !isResettingHistory ? handleResetHistory : undefined}
                title="Reset history"
              />
              <SettingsDivider />
              <SettingsRow
                detail={
                  device.isLive
                    ? isRemovingDeviceFromApp
                      ? "Removing device…"
                      : "Use this only when the board is leaving this account. It wipes the device and removes it from the app."
                    : "Factory reset and remove is only available while the board is online."
                }
                onPress={device.isLive && !isRemovingDeviceFromApp ? handleFactoryResetAndRemove : undefined}
                title="Factory reset and remove"
              />
            </SettingsListSurface>
          </View>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
