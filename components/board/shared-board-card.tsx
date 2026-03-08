import { Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { GlassCard } from "@/components/ui/glass-card";
import { SyncBadge } from "@/components/ui/sync-badge";
import { theme } from "@/constants/theme";
import { buildBoardCells, getMergedPalette, getTodayHighlight, targetStatusLabel } from "@/lib/board";
import { SharedBoard } from "@/types/addone";

interface SharedBoardCardProps {
  board: SharedBoard;
}

export function SharedBoardCard({ board }: SharedBoardCardProps) {
  const palette = getMergedPalette(board.paletteId);

  return (
    <GlassCard style={{ gap: 16, padding: 16 }}>
      <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            {board.habitName}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {board.ownerName}
          </Text>
        </View>
        <SyncBadge state={board.syncState} />
      </View>

      <PixelGrid cells={buildBoardCells(board)} highlightToday={getTodayHighlight(board)} mode="shared" palette={palette} readOnly />

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
        {targetStatusLabel(board)}
      </Text>
    </GlassCard>
  );
}
