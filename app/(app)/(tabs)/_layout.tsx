import { Ionicons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useRef } from "react";
import { DynamicColorIOS } from "react-native";

import { theme } from "@/constants/theme";
import { useDevices } from "@/hooks/use-devices";
import { withAlpha } from "@/lib/color";
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
    <NativeTabs
      backgroundColor={process.env.EXPO_OS === "android" ? theme.colors.bgCanvas : undefined}
      indicatorColor={process.env.EXPO_OS === "android" ? theme.colors.bgStrong : undefined}
      iconColor={{
        default: theme.colors.textTertiary,
        selected: accentColor,
      }}
      minimizeBehavior="onScrollDown"
      rippleColor={process.env.EXPO_OS === "android" ? withAlpha(theme.colors.textPrimary, 0.08) : undefined}
      tintColor={tintColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="home" />} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="people" />} />
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="person" />} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
