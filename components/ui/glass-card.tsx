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
          borderColor: withAlpha(theme.colors.textPrimary, 0.06),
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.94),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[withAlpha(theme.colors.textPrimary, 0.05), "transparent", withAlpha(theme.colors.bgBase, 0.18)]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <LinearGradient
        colors={[withAlpha(theme.colors.accentAmber, 0.035), "transparent"]}
        end={{ x: 0.85, y: 0 }}
        start={{ x: 0.15, y: 0 }}
        style={{ height: 1, left: 0, position: "absolute", right: 0, top: 0 }}
      />
      {children}
    </View>
  );
}
