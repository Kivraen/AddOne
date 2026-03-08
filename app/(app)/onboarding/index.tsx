import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <ScreenFrame
      header={
        <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12, paddingBottom: 20 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              Nearby setup
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              First boot
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <View style={{ gap: 14 }}>
        {[
          "Power the device and wait for its temporary AddOne Wi-Fi network.",
          "Join the device access point from the phone and keep the app open.",
          "Choose the home Wi-Fi, set habit basics, and finish linking the device.",
        ].map((step, index) => (
          <GlassCard key={step} style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              Step {index + 1}
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
                marginTop: 10,
              }}
            >
              {step}
            </Text>
          </GlassCard>
        ))}

        <Pressable
          onPress={() => router.push("/recovery")}
          style={{
            alignItems: "center",
            borderRadius: theme.radius.sheet,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.12),
            backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
            paddingHorizontal: 20,
            paddingVertical: 18,
          }}
        >
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Open recovery flow
          </Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}
