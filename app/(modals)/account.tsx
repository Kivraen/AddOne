import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { withAlpha } from "@/lib/color";

export default function AccountModal() {
  const router = useRouter();
  const { mode, signOut, userEmail } = useAuth();

  return (
    <GlassSheet subtitle="App-level controls stay separate from the current device." title="App settings" variant="peek">
      <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
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
    </GlassSheet>
  );
}
