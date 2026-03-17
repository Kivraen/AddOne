import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { withAlpha } from "@/lib/color";

interface ProfileTabContentProps {
  bottomInset?: number;
}

export function ProfileTabContent({ bottomInset = theme.layout.tabScrollBottom }: ProfileTabContentProps) {
  const router = useRouter();
  const { mode, signOut, userEmail } = useAuth();

  return (
    <ScreenScrollView bottomInset={bottomInset}>
      <ScreenSection style={{ gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: theme.typography.display.fontSize,
              lineHeight: theme.typography.display.lineHeight,
            }}
          >
            Profile
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Account controls live here, separate from the current device board and setup surfaces.
          </Text>
        </View>

        <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 18 }}>
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
            Account
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            {mode === "demo" ? "Demo preview" : userEmail ?? "Email OTP session"}
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Device tools
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Manage the active board’s appearance, timing, and recovery flow from device settings.
          </Text>
          <Pressable
            onPress={() => router.push("/settings")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.materials.panel.border,
              backgroundColor: withAlpha(theme.colors.bgBase, 0.16),
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Open device settings
            </Text>
          </Pressable>
        </GlassCard>

        {mode === "cloud" ? (
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/sign-in");
            }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.card,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.statusErrorMuted, 0.24),
              backgroundColor: withAlpha(theme.colors.statusErrorMuted, 0.12),
              minHeight: 52,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Sign out
            </Text>
          </Pressable>
        ) : null}
      </ScreenSection>
    </ScreenScrollView>
  );
}
