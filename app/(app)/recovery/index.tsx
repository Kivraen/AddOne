import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";

export default function RecoveryScreen() {
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
              Recovery
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              Rejoin Wi-Fi
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <View style={{ gap: 14 }}>
        <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Manual AP entry
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              marginTop: 10,
            }}
          >
            Hold the single button while connecting power. The device opens its temporary network, then returns to normal once Wi-Fi is saved again.
          </Text>
        </GlassCard>

        <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Automatic fallback
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              marginTop: 10,
            }}
          >
            If saved Wi-Fi fails after reboot, the device can open AP mode on its own. Cloud failure alone never triggers this behavior.
          </Text>
        </GlassCard>
      </View>
    </ScreenFrame>
  );
}
