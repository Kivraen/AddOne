import { Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, getTodayHighlight } from "@/lib/board";

export default function HistoryModal() {
  const device = useActiveDevice();
  const palette = getMergedPalette(device.paletteId, device.customPalette);
  const { toggleHistoryCell } = useDeviceActions();

  return (
    <GlassSheet
      subtitle="Edit only the day cells. The bottom weekly row always recomputes automatically."
      title="History"
      variant="full"
    >
      <GlassCard style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 18 }}>
        <PixelGrid
          cells={buildBoardCells(device)}
          highlightToday={getTodayHighlight(device)}
          mode="edit"
          onCellPress={(row, col) => {
            void toggleHistoryCell(row, col);
          }}
          palette={palette}
        />
      </GlassCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <ChoicePill label="Day cells" onPress={() => undefined} selected />
        <ChoicePill label="Weekly row auto" onPress={() => undefined} selected={false} />
        <ChoicePill label="Tap to correct" onPress={() => undefined} selected={false} />
      </View>

      <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          Corrections stay on the main board surface.
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
          This view exists as a sheet, but it still belongs to the board. Close it and you land exactly where you were.
        </Text>
      </GlassCard>
    </GlassSheet>
  );
}
