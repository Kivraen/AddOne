import { useRouter } from "expo-router";
import { View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import {
  DeviceSettingsScaffold,
  SettingsDivider,
  SettingsNote,
  SettingsRow,
  SettingsSectionTitle,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";
import { IconButton } from "@/components/ui/icon-button";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsSectionPath } from "@/lib/device-routes";

export default function DeviceSettingsOverviewRoute() {
  const device = useRoutedDevice();
  const router = useRouter();

  return (
    <DeviceSettingsScaffold
      device={device}
      headerLeft={() => (
        <IconButton
          icon="arrow-back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace("/");
          }}
        />
      )}
      largeTitle
      title={device.name}
    >
      {(settings) => (
        <>
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
