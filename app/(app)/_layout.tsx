import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { Text } from "react-native";

export default function AppLayout() {
  const { mode, status } = useAuth();

  if (mode === "cloud" && status === "loading") {
    return (
      <ScreenFrame>
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
            Restoring your AddOne session…
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (mode === "cloud" && status !== "signedIn") {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
          animationTypeForReplace: "push",
          contentStyle: { backgroundColor: theme.colors.bgBase },
        }}
      >
        <Stack.Screen name="history" options={{ animation: "fade", contentStyle: { backgroundColor: theme.colors.bgBase } }} />
      </Stack>
    </View>
  );
}
