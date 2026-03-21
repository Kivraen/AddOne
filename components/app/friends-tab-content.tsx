import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useSocialProfile } from "@/hooks/use-social-profile";
import { withAlpha } from "@/lib/color";

interface FriendsTabContentProps {
  bottomInset?: number;
}

function ActionButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
        borderRadius: theme.radius.sheet,
        borderWidth: secondary ? 1 : 0,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : "transparent",
        backgroundColor: secondary ? withAlpha(theme.colors.bgElevated, 0.72) : theme.colors.textPrimary,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          color: secondary ? theme.colors.textPrimary : theme.colors.textInverse,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SoonPill() {
  return (
    <View
      style={{
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        Soon
      </Text>
    </View>
  );
}

function LaneRow({ label }: { label: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.72),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
      <SoonPill />
    </View>
  );
}

export function FriendsTabContent({ bottomInset = theme.layout.tabScrollBottom }: FriendsTabContentProps) {
  const router = useRouter();
  const { isComplete, isLoading } = useSocialProfile();

  return (
    <ScreenScrollView bottomInset={bottomInset}>
      <ScreenSection style={{ gap: 16 }}>
        <GlassCard style={{ gap: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
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
            Friends
          </Text>

          {isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={theme.colors.accentAmber} />
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Checking profile…
              </Text>
            </View>
          ) : null}

          {!isLoading && !isComplete ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.title.fontFamily,
                    fontSize: theme.typography.title.fontSize,
                    lineHeight: theme.typography.title.lineHeight,
                  }}
                >
                  Finish your profile first.
                </Text>
                <Text
                  selectable
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Add your first name, last name, and @username before sharing turns on.
                </Text>
                <ActionButton label="Finish profile" onPress={() => router.push("/profile?from=friends")} />
              </View>
            </Animated.View>
          ) : null}

          {!isLoading && isComplete ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
              <View style={{ gap: 10 }}>
                <LaneRow label="Share by code" />
                <LaneRow label="Requests" />
                <LaneRow label="Connected boards" />
              </View>
            </Animated.View>
          ) : null}
        </GlassCard>
      </ScreenSection>
    </ScreenScrollView>
  );
}
