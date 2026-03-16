import { useRouter } from "expo-router";
import { View } from "react-native";

import {
  DeviceSettingsScaffold,
  SettingsNote,
  SettingsRow,
  SettingsSurface,
  SettingsSwatchStrip,
} from "@/components/settings/device-settings-scaffold";

function Divider() {
  return <View style={{ height: 1, backgroundColor: "rgba(244,245,247,0.06)" }} />;
}

export default function DeviceSettingsRootScreen() {
  const router = useRouter();

  return (
    <DeviceSettingsScaffold title="Device settings">
      {(settings) => (
        <>
          {!settings.device.isLive ? (
            <SettingsSurface>
              <SettingsNote>Device is offline. You can review settings here and use Wi‑Fi recovery, but Apply stays locked until the device is live again.</SettingsNote>
            </SettingsSurface>
          ) : null}

          <SettingsSurface style={{ paddingVertical: 8 }}>
            <SettingsRow detail={settings.summary.habit} onPress={() => router.push("/settings/habit")} title="Habit" />
            <Divider />
            <SettingsRow detail={settings.summary.time} onPress={() => router.push("/settings/time")} title="Time" />
            <Divider />
            <SettingsRow
              detail={
                <View style={{ gap: 4 }}>
                  <SettingsNote>{`${settings.summary.appearance.paletteLabel} · ${settings.summary.appearance.brightness}`}</SettingsNote>
                </View>
              }
              onPress={() => router.push("/settings/appearance")}
              title="Appearance"
              trailing={<SettingsSwatchStrip colors={settings.summary.appearance.colors} />}
            />
            <Divider />
            <SettingsRow
              detail="Edit board access and Wi‑Fi recovery"
              onPress={() => router.push("/settings/device")}
              title="Device"
            />
          </SettingsSurface>
        </>
      )}
    </DeviceSettingsScaffold>
  );
}
