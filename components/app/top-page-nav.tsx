import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { triggerNavigationHaptic } from "@/lib/haptics";

const NAV_ITEMS = [
  { icon: "grid-outline", label: "Home" },
  { icon: "people-outline", label: "Friends" },
  { icon: "person-outline", label: "Profile" },
] as const;

interface TopPageNavProps {
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function TopPageNav({ activeIndex, onSelect }: TopPageNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 10) + 8,
      }}
    >
      <BlurView
        experimentalBlurMethod="dimezisBlurView"
        intensity={34}
        tint="dark"
        style={{
          overflow: "hidden",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.07),
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.72),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
          >
          {NAV_ITEMS.map((item, index) => {
            const active = activeIndex === index;

            return (
              <Pressable
                key={item.label}
                hitSlop={10}
                onPress={() => {
                  if (!active) {
                    triggerNavigationHaptic();
                    onSelect(index);
                  }
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 8,
                  borderRadius: 18,
                  backgroundColor: active ? withAlpha(theme.colors.bgSurface, 0.96) : "transparent",
                }}
              >
                <Ionicons
                  color={active ? theme.colors.textPrimary : theme.colors.textSecondary}
                  name={item.icon}
                  size={18}
                />
                <Text
                  style={{
                    color: active ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontFamily: active ? theme.typography.label.fontFamily : theme.typography.body.fontFamily,
                    fontSize: 15,
                    lineHeight: 20,
                  }}
                >
                  {item.label}
                </Text>
                <View
                  style={{
                    width: active ? 18 : 6,
                    height: 2,
                    borderRadius: 2,
                    backgroundColor: active ? theme.colors.textPrimary : withAlpha(theme.colors.textPrimary, 0.06),
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
