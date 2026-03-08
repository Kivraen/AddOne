import { PropsWithChildren } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export type PrimaryActionState = "done" | "notDone" | "pendingSync" | "disabled";

interface PrimaryActionButtonProps extends PropsWithChildren {
  state: PrimaryActionState;
  onPress?: () => void;
}

const stateStyle: Record<PrimaryActionState, { background: string; text: string; border: string; label: string }> = {
  done: {
    background: "#F2EEE6",
    text: "#070707",
    border: withAlpha("#F2EEE6", 0.25),
    label: "Marked for today",
  },
  notDone: {
    background: withAlpha("#F2EEE6", 0.06),
    text: "#F2EEE6",
    border: withAlpha("#F2EEE6", 0.12),
    label: "Add today",
  },
  pendingSync: {
    background: withAlpha("#C7904A", 0.15),
    text: "#F2EEE6",
    border: withAlpha("#C7904A", 0.24),
    label: "Queued for sync",
  },
  disabled: {
    background: withAlpha("#F2EEE6", 0.04),
    text: "#7B766E",
    border: withAlpha("#F2EEE6", 0.08),
    label: "Unavailable",
  },
};

export function PrimaryActionButton({ state, onPress }: PrimaryActionButtonProps) {
  const pressed = useSharedValue(0);
  const config = stateStyle[state];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.985 : 1, { duration: theme.motion.press.duration }) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
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
          borderRadius: theme.radius.sheet,
          borderWidth: 1,
          borderColor: config.border,
          backgroundColor: config.background,
          paddingHorizontal: 20,
          paddingVertical: 18,
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
