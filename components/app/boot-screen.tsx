import { ActivityIndicator, Text, View } from "react-native";

import { theme } from "@/constants/theme";

export function BootScreen({ message = "Opening AddOne…" }: { message?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bgBase,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        gap: 14,
      }}
    >
      <ActivityIndicator color={theme.colors.textPrimary} />
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: 15,
          lineHeight: 22,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}
