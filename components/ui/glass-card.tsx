import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface GlassCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[withAlpha(theme.colors.textPrimary, 0.045), "transparent"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {children}
    </View>
  );
}
