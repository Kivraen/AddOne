import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";

import { DeviceRouteProvider } from "@/components/devices/device-route-context";
import { ScreenView } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { useRouteDevice } from "@/hooks/use-route-device";

export default function DeviceScopeLayout() {
  const { device, isLoading, notFound } = useRouteDevice();

  if (isLoading) {
    return (
      <ScreenView contentMaxWidth={theme.layout.narrowContentWidth}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              textAlign: "center",
            }}
          >
            Loading device…
          </Text>
        </View>
      </ScreenView>
    );
  }

  if (notFound || !device) {
    return <Redirect href="/" />;
  }

  return (
    <DeviceRouteProvider device={device}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.bgBase },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
        }}
      >
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </DeviceRouteProvider>
  );
}
