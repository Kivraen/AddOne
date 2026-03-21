import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { LayoutChangeEvent, View, ViewStyle, useWindowDimensions } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { BoardPalette, HighlightTarget, PixelCellState } from "@/types/addone";

interface DeviceBoardStageProps {
  accentColor: string;
  cells: PixelCellState[][];
  palette: BoardPalette;
  pendingPulse?: HighlightTarget | null;
  maxGridWidth?: number;
  style?: ViewStyle;
}

export function DeviceBoardStage({
  accentColor,
  cells,
  palette,
  pendingPulse = null,
  maxGridWidth = 760,
  style,
}: DeviceBoardStageProps) {
  const { width } = useWindowDimensions();
  const [stageWidth, setStageWidth] = useState(0);
  const boardFrameInsetX = 6;
  const boardFrameInsetY = 8;
  const availableGridWidth = Math.max(
    0,
    Math.min((stageWidth || width - 40) - boardFrameInsetX * 2, maxGridWidth),
  );

  function handleStageLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - stageWidth) > 1) {
      setStageWidth(nextWidth);
    }
  }

  return (
    <View
      style={[
        {
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 10,
          paddingBottom: 14,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={{ position: "absolute", top: 10, right: -8, bottom: 28, left: -8 }}>
        <View
          style={{
            position: "absolute",
            top: 42,
            left: "9%",
            width: "82%",
            height: 80,
            borderRadius: theme.radius.full,
            backgroundColor: withAlpha(accentColor, 0.18),
            boxShadow: `0px 0px 116px ${withAlpha(accentColor, 0.29)}`,
            transform: [{ scaleX: 1.12 }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 56,
            left: "19%",
            width: "62%",
            height: 46,
            borderRadius: theme.radius.full,
            backgroundColor: withAlpha(palette.dayOn, 0.2),
            boxShadow: `0px 0px 102px ${withAlpha(palette.dayOn, 0.32)}`,
          }}
        />
        <LinearGradient
          colors={["transparent", withAlpha(theme.colors.textPrimary, 0.05), "transparent"]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={{ position: "absolute", top: 0, right: 14, bottom: 10, left: 14, borderRadius: 32 }}
        />
      </View>

      <View
        style={{
          alignSelf: "stretch",
          overflow: "hidden",
          borderRadius: 26,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: "#090B10",
          boxShadow: `0px 22px 60px ${withAlpha(theme.colors.bgBase, 0.38)}`,
          padding: 4,
        }}
      >
        <LinearGradient
          colors={[
            withAlpha(theme.colors.textPrimary, 0.08),
            withAlpha(theme.colors.textPrimary, 0.02),
            "transparent",
          ]}
          end={{ x: 0.9, y: 0.85 }}
          start={{ x: 0.1, y: 0.05 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            overflow: "hidden",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: palette.socket,
            boxShadow: `inset 0px 1px 0px ${withAlpha(theme.colors.textPrimary, 0.06)}`,
            paddingHorizontal: boardFrameInsetX,
            paddingVertical: boardFrameInsetY,
          }}
        >
          <LinearGradient
            colors={[withAlpha(theme.colors.textPrimary, 0.04), "transparent", withAlpha(theme.colors.bgBase, 0.08)]}
            end={{ x: 0.8, y: 1 }}
            start={{ x: 0.1, y: 0 }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View onLayout={handleStageLayout} style={{ width: "100%", alignItems: "center" }}>
            <PixelGrid
              availableWidth={availableGridWidth}
              cells={cells}
              mode="display"
              palette={palette}
              pendingPulse={pendingPulse}
              readOnly
              showFooterHint={false}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
