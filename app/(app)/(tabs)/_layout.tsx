import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useRef } from "react";
import { DynamicColorIOS } from "react-native";

import { theme } from "@/constants/theme";
import { useDevices } from "@/hooks/use-devices";
import { getDeviceAccentColor } from "@/lib/device-accent";

export default function TabsLayout() {
  const { activeDevice } = useDevices();
  const lastKnownAccentColor = useRef<string | null>(null);
  const resolvedAccentColor = activeDevice ? getDeviceAccentColor(activeDevice) : null;

  useEffect(() => {
    if (!resolvedAccentColor) {
      return;
    }

    lastKnownAccentColor.current = resolvedAccentColor;
  }, [resolvedAccentColor]);

  const accentColor = resolvedAccentColor ?? lastKnownAccentColor.current ?? theme.colors.textPrimary;
  const tintColor =
    process.env.EXPO_OS === "ios"
      ? DynamicColorIOS({
          dark: accentColor,
          light: accentColor,
        })
      : accentColor;

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={tintColor}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="grid_view" sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends" role="contacts">
        <NativeTabs.Trigger.Icon md="groups" sf={{ default: "person.2", selected: "person.2.fill" }} />
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon md="person" sf={{ default: "person", selected: "person.fill" }} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
