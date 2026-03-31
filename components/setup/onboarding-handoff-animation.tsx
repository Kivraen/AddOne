import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AddOneLogoMark } from "@/components/branding/addone-logo";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

const MARK_ENTRY_MS = 280;
const GLOW_ENTRY_MS = 360;
const MARK_WIDTH = 156;
const MARK_HEIGHT = 117;

export function OnboardingHandoffAnimation() {
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.965);
  const glowOpacity = useSharedValue(0);
  const [activeDots, setActiveDots] = useState(1);

  useEffect(() => {
    containerOpacity.value = withTiming(1, {
      duration: MARK_ENTRY_MS,
      easing: Easing.out(Easing.cubic),
    });
    containerScale.value = withTiming(1, {
      duration: MARK_ENTRY_MS,
      easing: Easing.out(Easing.cubic),
    });
    glowOpacity.value = withTiming(1, {
      duration: GLOW_ENTRY_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [containerOpacity, containerScale, glowOpacity]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveDots((current) => (current >= 3 ? 1 : current + 1));
    }, 420);

    return () => clearInterval(intervalId);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          alignSelf: "stretch",
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
        },
      ]}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: MARK_WIDTH,
          height: MARK_HEIGHT,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            glowStyle,
            {
              position: "absolute",
              width: MARK_WIDTH + 52,
              height: MARK_HEIGHT + 52,
              borderRadius: 40,
              backgroundColor: withAlpha("#FFFFFF", 0.045),
            },
          ]}
        />
        <AddOneLogoMark color="#FFFFFF" height={MARK_HEIGHT} opacity={0.98} width={MARK_WIDTH} />
      </View>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 52,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text
          style={{
            color: theme.colors.textTertiary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: 14,
            lineHeight: 18,
          }}
        >
          Getting ready
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {[0, 1, 2].map((index) => (
            <View
              key={`handoff-dot-${index}`}
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: theme.colors.textTertiary,
                opacity: index < activeDots ? 0.92 : 0.24,
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
