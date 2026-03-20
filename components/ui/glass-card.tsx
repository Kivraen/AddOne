import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface GlassCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const {
    columnGap,
    gap,
    padding,
    paddingBottom,
    paddingEnd,
    paddingHorizontal,
    paddingLeft,
    paddingRight,
    paddingStart,
    paddingTop,
    paddingVertical,
    rowGap,
    ...outerStyle
  } = flattenedStyle;

  const contentStyle: ViewStyle = {
    backgroundColor: "transparent",
    columnGap,
    flexGrow: 1,
    gap,
    padding,
    paddingBottom,
    paddingEnd,
    paddingHorizontal,
    paddingLeft,
    paddingRight,
    paddingStart,
    paddingTop,
    paddingVertical,
    rowGap,
  };

  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: theme.materials.panel.border,
          backgroundColor: theme.materials.panel.fill,
          boxShadow: theme.shadows.panel,
        },
        outerStyle,
      ]}
    >
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
