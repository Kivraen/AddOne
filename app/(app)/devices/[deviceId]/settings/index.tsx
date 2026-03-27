import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { DeviceFirmwareUpdateCard } from "@/components/settings/device-firmware-update-card";
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
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions } from "@/hooks/use-devices";
import { CELEBRATION_TRANSITION_OPTIONS } from "@/lib/celebration-transitions";
import { withAlpha } from "@/lib/color";
import { isDevicePendingRemoval } from "@/lib/device-removal";
import { isDeviceControlReady, isDeviceRecovering, needsDeviceRecovery } from "@/lib/device-recovery";
import { deviceHistoryPath, deviceRecoveryPath, deviceResetHistoryPath, deviceSettingsSectionPath } from "@/lib/device-routes";
import { CelebrationTransitionStyle, DeviceFirmwareProofScenario } from "@/types/addone";

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

function normalizeFirmwareProofState(value: string | string[] | undefined): DeviceFirmwareProofScenario | null {
  const normalized = Array.isArray(value) ? value[0] : value;

  switch (normalized) {
    case "available":
    case "failed":
    case "in-progress":
    case "no-update":
    case "succeeded":
      return normalized;
    default:
      return null;
  }
}

export default function DeviceSettingsOverviewRoute() {
  const device = useRoutedDevice();
  const router = useRouter();
  const params = useLocalSearchParams<{ proofState?: string | string[] }>();
  const { mode } = useAuth();
  const [activePreviewTransition, setActivePreviewTransition] = useState<CelebrationTransitionStyle | null>(null);
  const {
    factoryResetAndRemove,
    isRemovingDeviceFromApp,
    isPreviewingCelebration,
    isResettingHistory,
    previewCelebration,
    removalPhase,
  } = useDeviceActions();
  const firmwareProofState = __DEV__ || mode === "demo" ? normalizeFirmwareProofState(params.proofState) : null;
  const controlReady = isDeviceControlReady(device);
  const devicePendingRemoval = isDevicePendingRemoval(device);
  const removeActionDisabled = devicePendingRemoval || isRemovingDeviceFromApp;

  function handleResetHistory() {
    router.push(deviceResetHistoryPath(device.id));
  }

  function handlePreviewCelebration(transitionStyle: CelebrationTransitionStyle) {
    setActivePreviewTransition(transitionStyle);
    void previewCelebration({
      deviceId: device.id,
      transitionStyle,
    }).catch((error: unknown) => {
      Alert.alert(
        "Preview failed",
        error instanceof Error ? error.message : "The celebration preview could not be started.",
      );
    }).finally(() => {
      setActivePreviewTransition((current) => (current === transitionStyle ? null : current));
    });
  }

  function handleFactoryResetAndRemove() {
    const title = device.isLive ? "Factory reset and remove?" : "Remove this device from the account?";
    const message = device.isLive
      ? "AddOne will ask the board to factory reset, then remove it from this account. If the board never confirms the reset, AddOne will still clear it from this account automatically."
      : "This board looks offline, broken, or lost. AddOne can still remove it from this account now, but the physical board will not be wiped remotely. If it comes back later, factory-reset it manually before reusing it.";
    const confirmLabel = device.isLive ? "Reset and remove" : "Remove from account";

    Alert.alert(
      title,
      message,
      [
        {
          style: "cancel",
          text: "Cancel",
        },
        {
          style: "destructive",
          text: confirmLabel,
          onPress: () => {
            void factoryResetAndRemove(device.id).then(
              () => {
                router.replace("/");
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
            <SettingsSectionTitle>Firmware</SettingsSectionTitle>
            <DeviceFirmwareUpdateCard device={device} proofScenario={firmwareProofState} />
          </View>

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
              {CELEBRATION_TRANSITION_OPTIONS.map((option, index) => (
                <View key={option.id}>
                  <SettingsRow
                    detail={
                      controlReady
                        ? isPreviewingCelebration && activePreviewTransition === option.id
                          ? `Starting ${option.label.toLowerCase()}…`
                          : index === 0
                            ? "Temporary test controls for celebration transitions."
                            : undefined
                        : index === 0
                          ? "Celebration previews are only available while the board is online and ready."
                          : undefined
                    }
                    onPress={controlReady && !isPreviewingCelebration ? () => handlePreviewCelebration(option.id) : undefined}
                    title={option.label}
                  />
                  {index < CELEBRATION_TRANSITION_OPTIONS.length - 1 ? <SettingsDivider /> : null}
                </View>
              ))}
              <SettingsDivider />
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
                  devicePendingRemoval || isRemovingDeviceFromApp
                    ? removalPhase === "sending_reset"
                      ? "Sending the reset request to the board…"
                      : removalPhase === "waiting_for_board"
                        ? "Waiting for the board to confirm its reset. If it never does, AddOne will still remove it from this account."
                        : "Waiting for this board to finish leaving the account."
                    : device.isLive
                      ? "Use this when the board is leaving this account. AddOne asks it to factory reset, then removes it from the app."
                      : "Use this when the board is offline, broken, or lost. AddOne removes it from the account now, but the physical board is not wiped remotely."
                }
                onPress={!removeActionDisabled ? handleFactoryResetAndRemove : undefined}
                title="Factory reset and remove"
              />
            </SettingsListSurface>
          </View>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
