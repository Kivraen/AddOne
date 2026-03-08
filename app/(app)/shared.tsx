import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { SharedBoardCard } from "@/components/board/shared-board-card";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useSharedBoardsData } from "@/hooks/use-devices";
import { useSharingActions } from "@/hooks/use-sharing";
import { withAlpha } from "@/lib/color";

export default function SharedBoardsScreen() {
  const router = useRouter();
  const { isLoading, sharedBoards } = useSharedBoardsData();
  const { isBusy, requestAccess } = useSharingActions();
  const [shareCode, setShareCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              Shared boards
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              View only
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              These boards stay read-only in v1.
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <View style={{ gap: 14 }}>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Join by code
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Enter a board code from another AddOne owner. Access remains pending until they approve it.
          </Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={(value) => {
              setShareCode(value);
              setError(null);
              setMessage(null);
            }}
            placeholder="Share code"
            placeholderTextColor={theme.colors.textTertiary}
            style={{
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
            value={shareCode}
          />
          <Pressable
            disabled={!shareCode.trim() || isBusy}
            onPress={async () => {
              try {
                setError(null);
                setMessage(null);
                await requestAccess(shareCode.trim().toUpperCase());
                setMessage("Request sent. The owner will need to approve it before the board appears here.");
                setShareCode("");
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : "Failed to request access.");
              }
            }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 54,
              borderRadius: theme.radius.sheet,
              backgroundColor: !shareCode.trim() || isBusy ? withAlpha(theme.colors.textPrimary, 0.12) : theme.colors.textPrimary,
              opacity: !shareCode.trim() || isBusy ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: theme.colors.bgBase,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Request access
            </Text>
          </Pressable>
          {message ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {message}
            </Text>
          ) : null}
          {error ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {error}
            </Text>
          ) : null}
        </GlassCard>

        {isLoading ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Loading shared boards…
          </Text>
        ) : null}
        {!isLoading && sharedBoards.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            No shared boards yet.
          </Text>
        ) : null}
        {sharedBoards.map((board) => (
          <SharedBoardCard board={board} key={board.id} />
        ))}
      </View>
    </ScreenFrame>
  );
}
