import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";
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
  icon,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
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
        minHeight: 48,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.18),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.06) : withAlpha(theme.colors.accentAmber, 0.14),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        {icon ? <Ionicons color={theme.colors.textPrimary} name={icon} size={16} /> : null}
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
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
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
  const [isOrientationReady, setIsOrientationReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const refreshRuntimeSnapshotRef = useRef(refreshRuntimeSnapshot);

  useEffect(() => {
    refreshRuntimeSnapshotRef.current = refreshRuntimeSnapshot;
  }, [refreshRuntimeSnapshot]);

  useEffect(() => {
    let cancelled = false;
    setIsOrientationReady(false);

    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);

    const settleTimer = setTimeout(() => {
      if (!cancelled) {
        setIsOrientationReady(true);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);

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
      .catch((error) => {
        if (!cancelled) {
          console.warn("Failed to refresh live board for history draft", error);
        }
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
  }, [deviceSyncKey, device, isDirty]);

  const palette = getMergedPalette(draftDevice.paletteId, draftDevice.customPalette);
  const updates = useMemo(() => collectHistoryDraftUpdates(baseDevice, draftDevice), [baseDevice, draftDevice]);
  const busy = isSavingHistoryDraft;
  const gridAvailableWidth = Math.max(420, width - 48);
  const gridAvailableHeight = Math.max(180, height - 214);

  async function handleSave() {
    if (!device.isLive || updates.length === 0) {
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      await commitHistoryDraft(updates, baseDevice.runtimeRevision, device.id);
      setIsDirty(false);
      setStatusMessage("Saved on the device.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to save history on the device.");
    }
  }

  return (
    <ScreenFrame
      header={
        <View style={{ alignItems: "center", flexDirection: "row", gap: 14, paddingBottom: 8 }}>
          <IconButton icon="arrow-back-outline" onPress={() => router.back()} />
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
              Edit history
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              {device.name}
            </Text>
          </View>
        </View>
      }
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
            History is unavailable
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            The device must be live before you can change past days.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
          {!isOrientationReady ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
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
                Preparing editor
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                  textAlign: "center",
                }}
              >
                Rotating the board for easier editing…
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Tap day cells to correct the board. The weekly row updates automatically.
              </Text>

              <GlassCard
                style={{
                  alignItems: "center",
                  flex: 1,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                }}
              >
                <PixelGrid
                  availableHeight={gridAvailableHeight}
                  availableWidth={gridAvailableWidth}
                  cells={buildBoardCells(draftDevice)}
                  maxWidth={1600}
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
                  showFooterHint={false}
                />
              </GlassCard>

              <View style={{ gap: 8 }}>
                {isLoadingLiveBoard || isRefreshingRuntimeSnapshot ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Refreshing the live board…
                  </Text>
                ) : null}

                {statusError ? (
                  <Text
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {statusError}
                  </Text>
                ) : null}

                {statusMessage ? (
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
                ) : null}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ActionButton
                    disabled={busy || !isDirty}
                    icon="refresh-outline"
                    label="Reset"
                    onPress={() => {
                      setDraftDevice(baseDevice);
                      setIsDirty(false);
                      setStatusError(null);
                      setStatusMessage("Draft reset.");
                    }}
                    secondary
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ActionButton
                    disabled={busy || updates.length === 0}
                    icon="checkmark-outline"
                    label={busy ? "Saving…" : "Save"}
                    onPress={() => {
                      void handleSave();
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </ScreenFrame>
  );
}
