import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { SharedBoardCard } from "@/components/board/shared-board-card";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useSharedBoards } from "@/hooks/use-shared-boards";

export default function SharedBoardsScreen() {
  const router = useRouter();
  const sharedBoards = useSharedBoards();

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
        {sharedBoards.map((board) => (
          <SharedBoardCard board={board} key={board.id} />
        ))}
      </View>
    </ScreenFrame>
  );
}
