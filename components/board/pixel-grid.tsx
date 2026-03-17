import { useEffect } from "react";
import { useWindowDimensions, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { BoardPalette, HighlightTarget, PixelCellState, PixelGridMode } from "@/types/addone";

interface PixelGridProps {
  availableWidth?: number;
  availableHeight?: number;
  cells: PixelCellState[][];
  palette: BoardPalette;
  mode: PixelGridMode;
  highlightToday?: HighlightTarget;
  maxWidth?: number;
  pendingPulse?: HighlightTarget | null;
  onCellPress?: (row: number, col: number) => void;
  readOnly?: boolean;
  showFooterHint?: boolean;
}

function PendingPulse({ cellSize }: { cellSize: number }) {
  const opacity = useSharedValue(0.24);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: 320 }), withTiming(0.18, { duration: 320 })), -1, true);
    scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 320 }), withTiming(1, { duration: 320 })), -1, true);
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -2,
          right: -2,
          bottom: -2,
          left: -2,
          borderRadius: Math.max(6, Math.floor(cellSize * 0.34)),
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.accentAmber, 0.9),
          backgroundColor: withAlpha(theme.colors.accentAmber, 0.14),
        },
        animatedStyle,
      ]}
    />
  );
}

function cellColors(state: PixelCellState, palette: BoardPalette) {
  switch (state) {
    case "done":
      return {
        fill: palette.dayOn,
      };
    case "weekSuccess":
      return {
        fill: palette.weekSuccess,
      };
    case "weekFail":
      return {
        fill: palette.weekFail,
      };
    case "socket":
      return {
        fill: shadeHex(palette.socketEdge, 0.84),
      };
    default:
      return {
        fill: shadeHex(palette.socketEdge, 0.84),
      };
  }
}

function isLitCell(state: PixelCellState) {
  return state === "done" || state === "weekSuccess" || state === "weekFail";
}

function shadeHex(hex: string, factor: number) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;

  const red = Math.max(0, Math.min(255, Math.round(Number.parseInt(value.slice(0, 2), 16) * factor)));
  const green = Math.max(0, Math.min(255, Math.round(Number.parseInt(value.slice(2, 4), 16) * factor)));
  const blue = Math.max(0, Math.min(255, Math.round(Number.parseInt(value.slice(4, 6), 16) * factor)));

  return `rgb(${red}, ${green}, ${blue})`;
}

function litPixelTreatment(fill: string) {
  return {
    edgeFill: shadeHex(fill, 0.72),
    centerFill: fill,
    outerGlowOpacity: 0.18,
  };
}

function LitPixelDiffuser({ cellSize, fill }: { cellSize: number; fill: string }) {
  const fullRadius = Math.max(4, Math.floor(cellSize * 0.28));
  const layers = [
    { size: 0.98, alpha: 0.14 },
    { size: 0.8, alpha: 0.24 },
    { size: 0.6, alpha: 0.34 },
    { size: 0.38, alpha: 0.5 },
  ];

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: fullRadius,
        overflow: "hidden",
      }}
    >
      {layers.map((layer, index) => {
        const size = Math.max(4, Math.floor(cellSize * layer.size));
        return (
          <View
            key={`diffuser-${index}`}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: Math.max(3, Math.floor(size * 0.28)),
              backgroundColor: withAlpha(fill, layer.alpha),
            }}
          />
        );
      })}
    </View>
  );
}

export function PixelGrid({
  availableWidth,
  availableHeight,
  cells,
  palette,
  mode,
  highlightToday,
  maxWidth,
  pendingPulse = null,
  onCellPress,
  readOnly = false,
  showFooterHint = true,
}: PixelGridProps) {
  const { width } = useWindowDimensions();
  const gap = mode === "display" || mode === "preview" ? 4 : 5;
  const unclampedWidth = availableWidth ?? width - 48;
  const resolvedWidth = maxWidth ? Math.min(unclampedWidth, maxWidth) : unclampedWidth;
  const widthBoundCellSize = Math.floor((resolvedWidth - gap * 20) / 21);
  const heightBoundCellSize =
    availableHeight !== undefined ? Math.floor((availableHeight - gap * 7) / 8) : Number.POSITIVE_INFINITY;
  const cellSize = Math.max(10, Math.min(widthBoundCellSize, heightBoundCellSize));
  const boardWidth = cellSize * 21 + gap * 20;
  const boardHeight = cellSize * 8 + gap * 7;

  return (
    <Animated.View entering={FadeIn.duration(theme.motion.board.duration)} style={{ height: boardHeight, width: boardWidth }}>
      <View style={{ gap, width: boardWidth }}>
        {cells.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap }}>
            {row.map((cell, colIndex) => {
              const colors = cellColors(cell, palette);
              const lit = isLitCell(cell);
              const treatment = lit ? litPixelTreatment(colors.fill) : undefined;
              const outerGlow = lit && treatment ? withAlpha(colors.fill, treatment.outerGlowOpacity) : "transparent";
              const isToday = highlightToday?.row === rowIndex && highlightToday?.col === colIndex;
              const disabled = readOnly || mode === "display" || mode === "shared" || rowIndex === 7;
              const cellStyle = {
                alignItems: "center" as const,
                justifyContent: "center" as const,
                height: cellSize,
                width: cellSize,
                borderRadius: Math.max(4, Math.floor(cellSize * 0.28)),
                backgroundColor: lit && treatment ? treatment.edgeFill : colors.fill,
                overflow: "hidden" as const,
                boxShadow: lit ? `0px 0px ${Math.max(10, Math.floor(cellSize * 0.55))}px ${outerGlow}` : undefined,
              };
              const ledGlow = lit && treatment ? <LitPixelDiffuser cellSize={cellSize} fill={treatment.centerFill} /> : null;

              const showHighlight = mode === "edit" && isToday;
              const showPendingPulse = pendingPulse?.row === rowIndex && pendingPulse?.col === colIndex;
              const highlight = showHighlight ? (
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
                    {ledGlow}
                    {showPendingPulse ? <PendingPulse cellSize={cellSize} /> : null}
                    {highlight}
                  </View>
                );
              }

              return (
                <Pressable key={`cell-${rowIndex}-${colIndex}`} onPress={() => onCellPress?.(rowIndex, colIndex)} style={cellStyle}>
                  {ledGlow}
                  {showPendingPulse ? <PendingPulse cellSize={cellSize} /> : null}
                  {highlight}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {mode === "edit" && showFooterHint ? (
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
