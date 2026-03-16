import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren, useEffect } from "react";
import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconOutlineColor?: string;
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
    iconColor: withAlpha(theme.colors.bgBase, 0.8),
    iconOutlineColor: withAlpha(theme.colors.textPrimary, 0.12),
    shadow: withAlpha(theme.colors.textPrimary, 0.06),
  },
  pendingSync: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.accentAmber, 0.24),
    icon: "checkmark",
    iconColor: theme.colors.accentAmber,
    shadow: withAlpha(theme.colors.accentAmber, 0.22),
  },
  syncing: {
    background: withAlpha(theme.colors.bgElevated, 0.98),
    border: withAlpha(theme.colors.accentAmber, 0.24),
    icon: "checkmark",
    iconColor: theme.colors.accentAmber,
    shadow: withAlpha(theme.colors.accentAmber, 0.22),
  },
  disabled: {
    background: withAlpha(theme.colors.bgElevated, 0.92),
    border: withAlpha(theme.colors.textPrimary, 0.08),
    icon: "checkmark",
    iconColor: withAlpha(theme.colors.bgBase, 0.74),
    iconOutlineColor: withAlpha(theme.colors.textPrimary, 0.1),
    shadow: "transparent",
  },
};

export function PrimaryActionButton({ activeColor, state, onPress, size = 94, style }: PrimaryActionButtonProps) {
  const pressed = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const isDisabled = state === "disabled" || state === "pendingSync" || state === "syncing";
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
            iconColor: accent,
            shadow: withAlpha(accent, 0.26),
          }
        : defaultConfig;

  useEffect(() => {
    if (state === "pendingSync" || state === "syncing") {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.14, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.42, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false,
      );
      return;
    }

    pulseScale.value = withTiming(1, { duration: 140 });
    pulseOpacity.value = withTiming(1, { duration: 140 });
  }, [pulseOpacity, pulseScale, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.985 : 1, { duration: theme.motion.press.duration }) }],
  }));
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (!isDisabled) {
            pressed.value = 1;
          }
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
          <Animated.View
            style={[
              iconAnimatedStyle,
              {
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            {config.iconOutlineColor ? (
              <Ionicons
                color={config.iconOutlineColor}
                name={config.icon}
                size={38}
                style={{ position: "absolute" }}
              />
            ) : null}
            <Ionicons color={config.iconColor} name={config.icon} size={36} />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
