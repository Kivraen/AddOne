import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, getTodayHighlight, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { AddOneDevice, HistoryDraftUpdate } from "@/types/addone";

function collectHistoryDraftUpdates(baseDevice: AddOneDevice, draftDevice: AddOneDevice): HistoryDraftUpdate[] {
  if (!baseDevice.dateGrid || !draftDevice.dateGrid) {
    return [];
  }

  const updates: HistoryDraftUpdate[] = [];

  for (let weekIndex = 0; weekIndex < draftDevice.dateGrid.length; weekIndex += 1) {
    for (let dayIndex = 0; dayIndex < draftDevice.dateGrid[weekIndex].length; dayIndex += 1) {
      if (draftDevice.days[weekIndex][dayIndex] === baseDevice.days[weekIndex][dayIndex]) {
        continue;
      }

      const localDate = draftDevice.dateGrid[weekIndex]?.[dayIndex];
      if (!localDate) {
        continue;
      }

      updates.push({
        isDone: draftDevice.days[weekIndex][dayIndex],
        localDate,
      });
    }
  }

  return updates;
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 46,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.18),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.06) : withAlpha(theme.colors.accentAmber, 0.14),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 18,
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
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

export default function HistoryModal() {
  const device = useActiveDevice();
  const {
    commitHistoryDraft,
    isRefreshingRuntimeSnapshot,
    isSavingHistoryDraft,
    refreshRuntimeSnapshot,
  } = useDeviceActions();
  const [baseDevice, setBaseDevice] = useState(device);
  const [draftDevice, setDraftDevice] = useState(device);
  const [isLoadingLiveBoard, setIsLoadingLiveBoard] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const refreshRuntimeSnapshotRef = useRef(refreshRuntimeSnapshot);

  useEffect(() => {
    refreshRuntimeSnapshotRef.current = refreshRuntimeSnapshot;
  }, [refreshRuntimeSnapshot]);

  const deviceSyncKey = `${device.id}:${device.runtimeRevision}:${device.lastSnapshotAt ?? ""}`;

  useEffect(() => {
    setBaseDevice(device);
    setDraftDevice(device);
    setIsDirty(false);
    setStatusError(null);
    setStatusMessage(null);

    if (!device.isLive) {
      return;
    }

    let cancelled = false;
    setIsLoadingLiveBoard(true);
    void refreshRuntimeSnapshotRef.current(device.id)
      .then(() => {
        if (cancelled) {
          return;
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.warn("Failed to refresh live board for history draft", error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLiveBoard(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [device.id, device.isLive]);

  useEffect(() => {
    if (isDirty) {
      return;
    }

    setBaseDevice(device);
    setDraftDevice(device);
  }, [deviceSyncKey, isDirty]);

  const palette = getMergedPalette(draftDevice.paletteId, draftDevice.customPalette);
  const updates = useMemo(() => collectHistoryDraftUpdates(baseDevice, draftDevice), [baseDevice, draftDevice]);
  const busy = isSavingHistoryDraft;

  async function handleSave() {
    if (!device.isLive || updates.length === 0) {
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      await commitHistoryDraft(updates, baseDevice.runtimeRevision, device.id);
      setIsDirty(false);
      setStatusMessage("History saved on the device.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to save history on the device.");
    }
  }

  return (
    <GlassSheet
      subtitle="Edit the board here, then save once to apply it on the device."
      title="History"
      variant="full"
    >
      {!device.isLive ? (
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            History edit is unavailable
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This board can only be edited while the device is live.
          </Text>
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 18 }}>
            <PixelGrid
              cells={buildBoardCells(draftDevice)}
              highlightToday={getTodayHighlight(draftDevice)}
              mode="edit"
              onCellPress={(row, col) => {
                if (busy) {
                  return;
                }

                setStatusError(null);
                setStatusMessage(null);
                setDraftDevice((current) => toggleHistoryCellLocal(current, row, col));
                setIsDirty(true);
              }}
              palette={palette}
            />
          </GlassCard>

          <View style={{ flexDirection: "row", gap: 10, paddingTop: 2 }}>
            <ActionButton
              disabled={busy || !isDirty}
              label="Reset"
              onPress={() => {
                setDraftDevice(baseDevice);
                setIsDirty(false);
                setStatusError(null);
                setStatusMessage("Draft reset to the latest live device board.");
              }}
              secondary
            />
            <View style={{ flex: 1 }} />
            <ActionButton
              disabled={busy || updates.length === 0}
              label={busy ? "Saving…" : "Save"}
              onPress={() => {
                void handleSave();
              }}
            />
          </View>
        </>
      )}

      {isLoadingLiveBoard || isRefreshingRuntimeSnapshot ? (
        <View style={{ paddingHorizontal: 4 }}>
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
            Refreshing the live board in the background.
          </Text>
        </View>
      ) : null}

      {statusError ? (
        <GlassCard
          style={{
            borderColor: withAlpha(theme.colors.statusErrorMuted, 0.3),
            borderWidth: 1,
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              color: theme.colors.statusErrorMuted,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {statusError}
          </Text>
        </GlassCard>
      ) : null}

      {statusMessage ? (
        <GlassCard style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {statusMessage}
          </Text>
        </GlassCard>
      ) : null}
    </GlassSheet>
  );
}
