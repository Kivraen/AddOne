import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, targetStatusLabel, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, HistoryDraftUpdate } from "@/types/addone";

function boardButtonState(device: AddOneDevice, isApplyingToday: boolean): PrimaryActionState {
  if (isApplyingToday) {
    return "syncing";
  }

  if (!device.isLive) {
    return "disabled";
  }

  return device.days[device.today.weekIndex][device.today.dayIndex] ? "done" : "notDone";
}

function withPendingTodayState(device: AddOneDevice, pendingTodayState?: boolean): AddOneDevice {
  if (pendingTodayState === undefined) {
    return device;
  }

  const days = device.days.map((week) => [...week]);
  days[device.today.weekIndex][device.today.dayIndex] = pendingTodayState;

  return {
    ...device,
    days,
  };
}

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

function boardStatus(device: AddOneDevice, isApplying: boolean) {
  if (isApplying) {
    return {
      color: theme.colors.accentAmber,
      label: "Applying",
    };
  }

  if (device.syncState === "offline" || !device.isLive) {
    return {
      color: theme.colors.textTertiary,
      label: "Offline",
    };
  }

  return {
    color: "#8FD36A",
    label: "Live",
  };
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
      }}
    >
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
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 16,
          lineHeight: 20,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          height: 8,
          width: 8,
          borderRadius: 8,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.5,
          shadowRadius: 6,
          shadowOffset: { height: 0, width: 0 },
        }}
      />
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 58,
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: 34,
          width: 34,
          borderRadius: 12,
          backgroundColor: withAlpha(theme.colors.accentAmber, 0.12),
        }}
      >
        <Ionicons color={theme.colors.textPrimary} name={icon} size={16} />
      </View>
      <Text
        style={{
          flex: 1,
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ActionPill({
  icon,
  label,
  onPress,
  tone = "secondary",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "accent" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor:
          tone === "accent" ? withAlpha(theme.colors.accentAmber, 0.2) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor:
          tone === "accent" ? withAlpha(theme.colors.accentAmber, 0.12) : withAlpha(theme.colors.textPrimary, 0.04),
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name={icon} size={16} />
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

function visibleBoardStats(device: AddOneDevice) {
  let completed = 0;
  let visibleDays = 0;

  for (let col = 0; col < device.days.length; col += 1) {
    const isPastWeek = col > device.today.weekIndex;
    const isCurrentWeek = col === device.today.weekIndex;
    const visibleRows = isPastWeek ? 7 : isCurrentWeek ? device.today.dayIndex + 1 : 0;

    visibleDays += visibleRows;
    completed += device.days[col].slice(0, visibleRows).filter(Boolean).length;
  }

  const fillPercentage = visibleDays === 0 ? 0 : Math.round((completed / visibleDays) * 100);

  return {
    completed,
    fillPercentage,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { activeDevice, activeDeviceId, isLoading } = useDevices();
  const {
    commitHistoryDraft,
    isApplyingToday,
    isRefreshingRuntimeSnapshot,
    isSavingHistoryDraft,
    refreshRuntimeSnapshot,
    toggleToday,
  } = useDeviceActions();
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyBaseDevice, setHistoryBaseDevice] = useState<AddOneDevice | null>(activeDevice);
  const [historyDraftDevice, setHistoryDraftDevice] = useState<AddOneDevice | null>(activeDevice);
  const [historyIsDirty, setHistoryIsDirty] = useState(false);
  const [historyStatusError, setHistoryStatusError] = useState<string | null>(null);
  const [historyStatusMessage, setHistoryStatusMessage] = useState<string | null>(null);
  const deviceSyncKey = `${activeDevice?.id ?? "none"}:${activeDevice?.runtimeRevision ?? 0}:${activeDevice?.lastSnapshotAt ?? ""}`;

  useEffect(() => {
    if (!activeDevice) {
      setHistoryBaseDevice(null);
      setHistoryDraftDevice(null);
      setIsEditingHistory(false);
      setHistoryIsDirty(false);
      return;
    }

    if (!historyIsDirty) {
      setHistoryBaseDevice(activeDevice);
      setHistoryDraftDevice(activeDevice);
    }
  }, [activeDevice, deviceSyncKey, historyIsDirty]);

  const effectiveDevice = useMemo(() => {
    if (!activeDevice) {
      return null;
    }

    if (isEditingHistory && historyDraftDevice) {
      return historyDraftDevice;
    }

    return withPendingTodayState(activeDevice, activePendingTodayState);
  }, [activeDevice, activePendingTodayState, historyDraftDevice, isEditingHistory]);
  const palette = useMemo(
    () => (effectiveDevice ? getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette) : null),
    [effectiveDevice],
  );
  const cells = useMemo(() => (effectiveDevice ? buildBoardCells(effectiveDevice) : []), [effectiveDevice]);
  const todayLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }, []);
  const historyUpdates = useMemo(() => {
    if (!historyBaseDevice || !historyDraftDevice) {
      return [];
    }

    return collectHistoryDraftUpdates(historyBaseDevice, historyDraftDevice);
  }, [historyBaseDevice, historyDraftDevice]);
  const pendingPulse =
    !isEditingHistory && effectiveDevice && activePendingTodayState !== undefined
      ? {
          col: effectiveDevice.today.weekIndex,
          row: effectiveDevice.today.dayIndex,
        }
      : null;
  const homeBoardAvailableWidth = Math.max(260, Math.min(width - 74, 680));

  const header = (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 18,
      }}
    >
      <View style={{ gap: 4 }}>
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
          AddOne
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.display.fontFamily,
            fontSize: 30,
            lineHeight: 34,
          }}
        >
          {todayLabel}
        </Text>
      </View>
      {effectiveDevice ? <IconButton icon="person-circle-outline" onPress={() => router.push("/account")} /> : null}
    </View>
  );

  if (isLoading) {
    return (
      <ScreenFrame header={header}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <ActivityIndicator color={theme.colors.textPrimary} />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Loading your board…
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (!effectiveDevice || !palette) {
    return (
      <ScreenFrame header={header}>
        <View style={{ flex: 1, justifyContent: "center", gap: 18 }}>
          <View style={{ gap: 6 }}>
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
              First device
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              Set up AddOne
            </Text>
          </View>

          <GlassCard style={{ gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Connect your device, join its AddOne Wi‑Fi, choose your home network, then finish the core settings.
            </Text>
          </GlassCard>

          <Pressable
            onPress={() => router.push("/onboarding")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 58,
              borderRadius: theme.radius.sheet,
              backgroundColor: theme.colors.textPrimary,
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
              Start setup
            </Text>
          </Pressable>
        </View>
      </ScreenFrame>
    );
  }

  const device = effectiveDevice;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;
  const status = boardStatus(device, buttonIsApplying || activePendingTodayState !== undefined);
  const stats = visibleBoardStats(device);

  async function openInlineHistoryEditor() {
    if (!activeDevice?.isLive) {
      return;
    }

    setHistoryStatusError(null);
    setHistoryStatusMessage(null);
    setHistoryIsDirty(false);
    setIsEditingHistory(true);

    try {
      await refreshRuntimeSnapshot(activeDevice.id);
    } catch (error) {
      setHistoryStatusError(error instanceof Error ? error.message : "Failed to refresh the live board.");
    }
  }

  async function handleSaveHistory() {
    if (!activeDevice || !historyBaseDevice || historyUpdates.length === 0) {
      return;
    }

    try {
      setHistoryStatusError(null);
      setHistoryStatusMessage(null);
      await commitHistoryDraft(historyUpdates, historyBaseDevice.runtimeRevision, activeDevice.id);
      setHistoryIsDirty(false);
      setIsEditingHistory(false);
    } catch (error) {
      setHistoryStatusError(error instanceof Error ? error.message : "Failed to save history on the device.");
    }
  }

  return (
    <ScreenFrame header={header} scroll>
      <View style={{ gap: 12, paddingBottom: 24 }}>
        <GlassCard style={{ gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ gap: 12 }}>
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.display.fontFamily,
                    fontSize: 30,
                    lineHeight: 34,
                  }}
                  numberOfLines={1}
                >
                  {device.name}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  Today is {todayLabel}
                </Text>
              </View>
              <StatusBadge color={status.color} label={status.label} />
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 18,
                borderTopWidth: 1,
                borderTopColor: withAlpha(theme.colors.textPrimary, 0.06),
                paddingTop: 10,
              }}
            >
              <InlineStat label="This week" value={targetStatusLabel(device)} />
              <InlineStat label="Recorded" value={`${stats.completed} total`} />
            </View>
          </View>

          <View
            style={{
              alignItems: "center",
              borderRadius: theme.radius.card,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.05),
              backgroundColor: withAlpha(theme.colors.bgBase, 0.35),
              justifyContent: "center",
              paddingHorizontal: 10,
              paddingVertical: 12,
              width: "100%",
            }}
          >
            <PixelGrid
              availableWidth={homeBoardAvailableWidth}
              cells={cells}
              mode={isEditingHistory ? "edit" : "display"}
              onCellPress={
                isEditingHistory
                  ? (row, col) => {
                      if (!historyDraftDevice || isSavingHistoryDraft) {
                        return;
                      }

                      setHistoryStatusError(null);
                      setHistoryStatusMessage(null);
                      setHistoryDraftDevice((current) => (current ? toggleHistoryCellLocal(current, row, col) : current));
                      setHistoryIsDirty(true);
                    }
                  : undefined
              }
              palette={palette}
              pendingPulse={pendingPulse}
              readOnly={!isEditingHistory}
              showFooterHint={false}
            />
          </View>

          {isEditingHistory ? (
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Edit the board directly here, then save once.
              </Text>

              {isRefreshingRuntimeSnapshot || historyStatusError || historyStatusMessage ? (
                <View style={{ gap: 4 }}>
                  {isRefreshingRuntimeSnapshot ? (
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      Refreshing live board…
                    </Text>
                  ) : null}
                  {historyStatusError ? (
                    <Text
                      style={{
                        color: theme.colors.statusErrorMuted,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      {historyStatusError}
                    </Text>
                  ) : null}
                  {historyStatusMessage ? (
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      {historyStatusMessage}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                <ActionPill
                  icon="close-outline"
                  label="Cancel"
                  onPress={() => {
                    setHistoryDraftDevice(historyBaseDevice);
                    setHistoryIsDirty(false);
                    setHistoryStatusError(null);
                    setHistoryStatusMessage(null);
                    setIsEditingHistory(false);
                  }}
                />
                <ActionPill
                  icon="checkmark-outline"
                  label={isSavingHistoryDraft ? "Saving…" : "Save"}
                  onPress={() => void handleSaveHistory()}
                  tone="accent"
                />
              </View>
            </View>
          ) : (
            <PrimaryActionButton
              onPress={() => {
                void toggleToday(device.id).catch((error) => {
                  console.warn("Failed to toggle today from app", error);
                });
              }}
              state={boardButtonState(device, buttonIsApplying)}
              style={{ width: "100%" }}
            />
          )}
        </GlassCard>

        {!isEditingHistory ? (
          <GlassCard style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <QuickAction
                icon="create-outline"
                label="Edit board"
                onPress={() => void openInlineHistoryEditor()}
              />
              <QuickAction
                icon="options-outline"
                label="Device settings"
                onPress={() => router.push("/settings")}
              />
            </View>
          </GlassCard>
        ) : null}
      </View>
    </ScreenFrame>
  );
}
