import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { ScreenView } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { useDevices } from "@/hooks/use-devices";
import { deviceHistoryPath } from "@/lib/device-routes";

export default function LegacyHistoryRedirectRoute() {
  const { activeDeviceId, isLoading } = useDevices();

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
            Loading history…
          </Text>
        </View>
      </ScreenView>
    );
  }

  return <Redirect href={activeDeviceId ? deviceHistoryPath(activeDeviceId) : "/"} />;
}
