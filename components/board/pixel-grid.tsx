import { useWindowDimensions, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { BoardPalette, HighlightTarget, PixelCellState, PixelGridMode } from "@/types/addone";

interface PixelGridProps {
  cells: PixelCellState[][];
  palette: BoardPalette;
  mode: PixelGridMode;
  highlightToday?: HighlightTarget;
  onCellPress?: (row: number, col: number) => void;
  readOnly?: boolean;
}

function cellColors(state: PixelCellState, palette: BoardPalette) {
  switch (state) {
    case "done":
      return {
        fill: palette.dayOn,
        border: withAlpha(palette.dayOn, 0.18),
      };
    case "weekSuccess":
      return {
        fill: palette.weekSuccess,
        border: withAlpha(palette.weekSuccess, 0.18),
      };
    case "weekFail":
      return {
        fill: palette.weekFail,
        border: withAlpha(palette.weekFail, 0.18),
      };
    case "todayFocus":
      return {
        fill: palette.socket,
        border: withAlpha(theme.colors.accentAmber, 0.52),
      };
    case "socket":
      return {
        fill: palette.socket,
        border: palette.socketEdge,
      };
    default:
      return {
        fill: withAlpha(palette.socket, 0.56),
        border: withAlpha(palette.socketEdge, 0.65),
      };
  }
}

export function PixelGrid({ cells, palette, mode, highlightToday, onCellPress, readOnly = false }: PixelGridProps) {
  const { width } = useWindowDimensions();
  const gap = mode === "preview" ? 2 : 3;
  const availableWidth = Math.min(width - 64, 360);
  const cellSize = Math.max(10, Math.floor((availableWidth - gap * 20) / 21));
  const boardWidth = cellSize * 21 + gap * 20;
  const boardHeight = cellSize * 8 + gap * 7;

  return (
    <Animated.View entering={FadeIn.duration(theme.motion.board.duration)} style={{ height: boardHeight, width: boardWidth }}>
      <View style={{ gap, width: boardWidth }}>
        {cells.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap }}>
            {row.map((cell, colIndex) => {
              const colors = cellColors(cell, palette);
              const activeGlow =
                cell === "done" || cell === "weekSuccess" || cell === "weekFail" ? withAlpha(colors.fill, 0.18) : "transparent";
              const isToday = highlightToday?.row === rowIndex && highlightToday?.col === colIndex;
              const disabled = readOnly || mode === "display" || mode === "shared" || rowIndex === 7;
              const cellStyle = {
                alignItems: "center" as const,
                justifyContent: "center" as const,
                height: cellSize,
                width: cellSize,
                borderRadius: Math.max(4, Math.floor(cellSize * 0.28)),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.fill,
                shadowColor: activeGlow,
                shadowOpacity: activeGlow === "transparent" ? 0 : 1,
                shadowRadius: activeGlow === "transparent" ? 0 : 10,
                shadowOffset: { width: 0, height: 0 },
              };

              const highlight = isToday ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    bottom: -2,
                    left: -2,
                    borderRadius: Math.max(6, Math.floor(cellSize * 0.34)),
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.accentAmber, 0.88),
                  }}
                />
              ) : null;

              if (disabled) {
                return (
                  <View key={`cell-${rowIndex}-${colIndex}`} style={cellStyle}>
                    {highlight}
                  </View>
                );
              }

              return (
                <Pressable key={`cell-${rowIndex}-${colIndex}`} onPress={() => onCellPress?.(rowIndex, colIndex)} style={cellStyle}>
                  {highlight}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {mode === "edit" ? (
        <Text
          style={{
            marginTop: 12,
            color: theme.colors.textTertiary,
            fontFamily: theme.typography.micro.fontFamily,
            fontSize: theme.typography.micro.fontSize,
            lineHeight: theme.typography.micro.lineHeight,
            letterSpacing: theme.typography.micro.letterSpacing,
            textTransform: "uppercase",
          }}
        >
          Bottom row is automatic. Tap day cells to correct history.
        </Text>
      ) : null}
    </Animated.View>
  );
}
