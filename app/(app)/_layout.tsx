import { Redirect, Stack } from "expo-router";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { Text, View } from "react-native";

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

  return <Stack screenOptions={{ headerShown: false }} />;
}
