import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, getTodayHighlight, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";

const kHistoryCommitIdleMs = 250;

export default function HistoryModal() {
  const device = useActiveDevice();
  const [draftDevice, setDraftDevice] = useState(device);
  const idleCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Map<string, boolean>>(new Map());
  const palette = getMergedPalette(draftDevice.paletteId, draftDevice.customPalette);
  const { commitHistoryBatch } = useDeviceActions();

  const flushDraft = useCallback(async () => {
    if (idleCommitRef.current) {
      clearTimeout(idleCommitRef.current);
      idleCommitRef.current = null;
    }

    if (pendingUpdatesRef.current.size === 0) {
      return;
    }

    const updates = Array.from(pendingUpdatesRef.current.entries()).map(([localDate, isDone]) => ({
      isDone,
      localDate,
    }));
    pendingUpdatesRef.current.clear();

    await commitHistoryBatch(updates, device.id).catch((error) => {
      console.warn("Failed to commit history batch", error);
    });
  }, [commitHistoryBatch, device.id]);

  useEffect(() => {
    setDraftDevice(device);
    pendingUpdatesRef.current.clear();
    if (idleCommitRef.current) {
      clearTimeout(idleCommitRef.current);
      idleCommitRef.current = null;
    }
  }, [device.id]);

  useEffect(() => {
    return () => {
      void flushDraft().catch((error) => {
        console.warn("Failed to flush history draft on close", error);
      });
    };
  }, [flushDraft]);

  return (
    <GlassSheet
      subtitle="Edit only the day cells. The bottom weekly row always recomputes automatically."
      title="History"
      variant="full"
    >
      <GlassCard style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 18 }}>
        <PixelGrid
          cells={buildBoardCells(draftDevice)}
          highlightToday={getTodayHighlight(draftDevice)}
          mode="edit"
          onCellPress={(row, col) => {
            setDraftDevice((current) => {
              const localDate = current.dateGrid?.[col]?.[row];
              const next = toggleHistoryCellLocal(current, row, col);

              if (localDate) {
                pendingUpdatesRef.current.set(localDate, next.days[col][row]);
                if (idleCommitRef.current) {
                  clearTimeout(idleCommitRef.current);
                }
                idleCommitRef.current = setTimeout(() => {
                  void flushDraft();
                }, kHistoryCommitIdleMs);
              }

              return next;
            });
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
