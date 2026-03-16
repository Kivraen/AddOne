import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { DeviceSettingsScaffold, SettingsFieldLabel, SettingsNote, SettingsSurface } from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { useDeviceActions } from "@/hooks/use-devices";
import { useAppUiStore } from "@/store/app-ui-store";

function DeviceActionButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 46,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.05),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
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

export default function DeviceSettingsDeviceScreen() {
  const router = useRouter();
  const { isStartingWifiRecovery, requestWifiRecovery } = useDeviceActions();
  const clearOnboardingSession = useAppUiStore((state) => state.clearOnboardingSession);
  const requestBoardEditorOpen = useAppUiStore((state) => state.requestBoardEditorOpen);

  return (
    <DeviceSettingsScaffold title="Device">
      {(settings) => (
        <SettingsSurface>
          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Edit board</SettingsFieldLabel>
            <SettingsNote>Open the inline board editor on the main screen.</SettingsNote>
            <View style={{ alignItems: "flex-start" }}>
              <DeviceActionButton
                disabled={!settings.device.isLive || settings.isSavingSettings}
                label="Open board editor"
                onPress={() => {
                  requestBoardEditorOpen();
                  router.replace("/");
                }}
              />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.06) }} />

          <View style={{ gap: 8 }}>
            <SettingsFieldLabel>Wi‑Fi recovery</SettingsFieldLabel>
            <SettingsNote>
              {settings.device.isLive
                ? "Start AddOne recovery Wi‑Fi from the device so you can reconnect it without losing history."
                : "The device is offline. Jump straight into the AddOne recovery flow and join its Wi‑Fi manually."}
            </SettingsNote>
            <View style={{ alignItems: "flex-start" }}>
              <DeviceActionButton
                disabled={isStartingWifiRecovery || settings.isSavingSettings}
                label={settings.device.isLive ? (isStartingWifiRecovery ? "Starting recovery…" : "Enter Wi‑Fi recovery") : "Rejoin Wi‑Fi"}
                onPress={() => {
                  if (!settings.device.isLive) {
                    clearOnboardingSession();
                    router.push("/recovery");
                    return;
                  }

                  Alert.alert(
                    "Enter Wi‑Fi recovery?",
                    "The device will start its AddOne setup Wi‑Fi so you can reconnect it without losing ownership or history.",
                    [
                      { style: "cancel", text: "Cancel" },
                      {
                        text: "Enter recovery",
                        onPress: () => {
                          void (async () => {
                            clearOnboardingSession();
                            const success = await requestWifiRecovery(settings.device.id)
                              .then(() => true)
                              .catch((error) => {
                                settings.setStatusError(
                                  error instanceof Error ? error.message : "Failed to start Wi‑Fi recovery.",
                                );
                                console.warn("Failed to start Wi‑Fi recovery", error);
                                return false;
                              });

                            if (success) {
                              router.push("/recovery");
                            }
                          })();
                        },
                      },
                    ],
                  );
                }}
              />
            </View>
          </View>
        </SettingsSurface>
      )}
    </DeviceSettingsScaffold>
  );
}
