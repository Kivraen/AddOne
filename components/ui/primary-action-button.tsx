import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export type PrimaryActionState = "done" | "notDone" | "pendingSync" | "syncing" | "disabled";

interface PrimaryActionButtonProps extends PropsWithChildren {
  activeColor?: string;
  state: PrimaryActionState;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const stateStyle: Record<
  PrimaryActionState,
  {
    background: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap | null;
    iconColor: string;
    indicatorColor?: string;
    shadow: string;
  }
> = {
  done: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.accentAmber, 0.2),
    icon: "checkmark",
    iconColor: theme.colors.accentAmber,
    shadow: withAlpha(theme.colors.accentAmber, 0.28),
  },
  notDone: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.textPrimary, 0.12),
    icon: "checkmark",
    iconColor: withAlpha(theme.colors.textTertiary, 0.9),
    shadow: withAlpha(theme.colors.textPrimary, 0.06),
  },
  pendingSync: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.accentAmber, 0.24),
    icon: null,
    iconColor: theme.colors.textPrimary,
    indicatorColor: theme.colors.accentAmber,
    shadow: withAlpha(theme.colors.accentAmber, 0.22),
  },
  syncing: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.accentAmber, 0.24),
    icon: null,
    iconColor: theme.colors.textPrimary,
    indicatorColor: theme.colors.accentAmber,
    shadow: withAlpha(theme.colors.accentAmber, 0.22),
  },
  disabled: {
    background: withAlpha(theme.colors.bgElevated, 0.92),
    border: withAlpha(theme.colors.textPrimary, 0.08),
    icon: "checkmark",
    iconColor: withAlpha(theme.colors.textTertiary, 0.78),
    shadow: "transparent",
  },
};

export function PrimaryActionButton({ activeColor, state, onPress, size = 94, style }: PrimaryActionButtonProps) {
  const pressed = useSharedValue(0);
  const defaultConfig = stateStyle[state];
  const accent = activeColor ?? theme.colors.accentAmber;
  const config =
    state === "done"
      ? {
          ...defaultConfig,
          background: withAlpha(theme.colors.bgElevated, 0.98),
          border: withAlpha(accent, 0.26),
          iconColor: accent,
          shadow: withAlpha(accent, 0.34),
        }
      : state === "pendingSync" || state === "syncing"
        ? {
            ...defaultConfig,
            border: withAlpha(accent, 0.24),
            indicatorColor: accent,
            shadow: withAlpha(accent, 0.26),
          }
        : defaultConfig;

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
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: config.border,
          backgroundColor: config.background,
          shadowColor: config.shadow,
          shadowOpacity: config.shadow === "transparent" ? 0 : 0.7,
          shadowRadius: config.shadow === "transparent" ? 0 : 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {config.icon ? (
          <Ionicons color={config.iconColor} name={config.icon} size={34} />
        ) : (
          <ActivityIndicator color={config.indicatorColor ?? config.iconColor} size="small" />
        )}
      </Pressable>
    </Animated.View>
  );
}
