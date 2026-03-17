import { Text, View } from "react-native";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";

interface FriendsTabContentProps {
  bottomInset?: number;
}

export function FriendsTabContent({ bottomInset = theme.layout.tabScrollBottom }: FriendsTabContentProps) {
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
            Friends
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Shared grids and friend activity will live here once the core solo experience is fully locked.
          </Text>
        </View>

        <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Coming next
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This page will show the other grids you care about without mixing them into your own habit screen.
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
            Planned qualities
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Expect quiet activity summaries, intentional follows, and no noise bleeding into your own daily board.
          </Text>
        </GlassCard>
      </ScreenSection>
    </ScreenScrollView>
  );
}
