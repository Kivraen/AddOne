import { BlurView } from "expo-blur";
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
    <BlurView
      intensity={60}
      style={[
        {
          overflow: "hidden",
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: theme.materials.panel.border,
          backgroundColor: theme.materials.panel.fill,
          boxShadow: theme.shadows.panel,
        },
        style,
      ]}
      tint="systemMaterial"
    >
      <LinearGradient
        colors={[theme.materials.panel.highlight, "transparent"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View style={{ backgroundColor: withAlpha(theme.colors.bgBase, 0.06) }}>{children}</View>
    </BlurView>
  );
}
