import { PropsWithChildren } from "react";
import { Pressable, StyleProp, Text, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export type PrimaryActionState = "done" | "notDone" | "pendingSync" | "syncing" | "disabled";

interface PrimaryActionButtonProps extends PropsWithChildren {
  state: PrimaryActionState;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const stateStyle: Record<PrimaryActionState, { background: string; text: string; border: string; label: string }> = {
  done: {
    background: "#F2EEE6",
    text: "#070707",
    border: withAlpha("#F2EEE6", 0.25),
    label: "Remove one",
  },
  notDone: {
    background: withAlpha("#F2EEE6", 0.08),
    text: "#F2EEE6",
    border: withAlpha("#F2EEE6", 0.16),
    label: "Add one",
  },
  pendingSync: {
    background: withAlpha("#C7904A", 0.15),
    text: "#F2EEE6",
    border: withAlpha("#C7904A", 0.24),
    label: "Applying…",
  },
  syncing: {
    background: withAlpha("#C7904A", 0.15),
    text: "#F2EEE6",
    border: withAlpha("#C7904A", 0.24),
    label: "Applying…",
  },
  disabled: {
    background: withAlpha("#F2EEE6", 0.04),
    text: "#7B766E",
    border: withAlpha("#F2EEE6", 0.08),
    label: "Unavailable",
  },
};

export function PrimaryActionButton({ state, onPress, style }: PrimaryActionButtonProps) {
  const pressed = useSharedValue(0);
  const config = stateStyle[state];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.985 : 1, { duration: theme.motion.press.duration }) }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        disabled={state === "disabled"}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        style={{
          alignItems: "center",
          width: "100%",
          borderRadius: theme.radius.sheet,
          borderWidth: 1,
          borderColor: config.border,
          backgroundColor: config.background,
          paddingHorizontal: 22,
          paddingVertical: 19,
        }}
      >
        <Text
          style={{
            color: config.text,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
            lineHeight: theme.typography.title.lineHeight,
          }}
        >
          {config.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
