import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import PagerView from "react-native-pager-view";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, LayoutChangeEvent, Pressable, Text, View, useWindowDimensions } from "react-native";

import { FriendsTabContent } from "@/components/app/friends-tab-content";
import { ProfileTabContent } from "@/components/app/profile-tab-content";
import { TopPageNav } from "@/components/app/top-page-nav";
import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, HistoryDraftUpdate } from "@/types/addone";

function boardButtonState(device: AddOneDevice, isApplyingToday: boolean, isLocked = false): PrimaryActionState {
  if (isApplyingToday || isLocked) {
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

function boardStatus(device: AddOneDevice) {
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

function StatusDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.5,
        shadowRadius: 6,
        shadowOffset: { height: 0, width: 0 },
      }}
    />
  );
}

function StatusBadge({ color }: { color: string }) {
  return (
    <View
      style={{
        minWidth: 34,
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.07),
        backgroundColor: withAlpha(theme.colors.bgSurface, 0.96),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusDot color={color} size={8} />
    </View>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
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

function StatDivider() {
  return (
    <View
      style={{
        width: 1,
        height: 34,
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
      }}
    />
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

const TAB_KEYS = ["home", "friends", "profile"] as const;

function tabIndexFromParam(tab?: string | string[]) {
  const value = Array.isArray(tab) ? tab[0] : tab;
  const index = TAB_KEYS.indexOf((value as (typeof TAB_KEYS)[number]) ?? "home");
  return index >= 0 ? index : 0;
}

function HomeTabContent() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
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
  const pendingBoardEditorOpen = useAppUiStore((state) => state.pendingBoardEditorOpen);
  const clearBoardEditorOpen = useAppUiStore((state) => state.clearBoardEditorOpen);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyBaseDevice, setHistoryBaseDevice] = useState<AddOneDevice | null>(activeDevice);
  const [historyDraftDevice, setHistoryDraftDevice] = useState<AddOneDevice | null>(activeDevice);
  const [historyIsDirty, setHistoryIsDirty] = useState(false);
  const [historyStatusError, setHistoryStatusError] = useState<string | null>(null);
  const [historyStatusMessage, setHistoryStatusMessage] = useState<string | null>(null);
  const [todayActionInFlight, setTodayActionInFlight] = useState(false);
  const [boardStageWidth, setBoardStageWidth] = useState(0);
  const todayActionLockRef = useRef(false);
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

  useEffect(() => {
    if (!pendingBoardEditorOpen || !activeDevice?.isLive || isEditingHistory) {
      return;
    }

    clearBoardEditorOpen();
    void openInlineHistoryEditor();
  }, [activeDevice?.isLive, clearBoardEditorOpen, isEditingHistory, pendingBoardEditorOpen]);

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
  const todayWeekday = useMemo(() => new Date().toLocaleDateString("en-US", { weekday: "long" }), []);
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
  const isTodayToggleLocked = todayActionInFlight || activePendingTodayState !== undefined;
  const boardFrameInsetX = 14;
  const boardFrameInsetY = 10;
  const boardFrameRadius = 16;
  const homeBoardAvailableWidth = Math.max(
    0,
    Math.min((boardStageWidth || width - 32) - boardFrameInsetX * 2, 760),
  );
  const boardColumnWidth = Math.max(
    0,
    Math.min(homeBoardAvailableWidth + boardFrameInsetX * 2, width - 32),
  );
  const screenBottomInset = 102;
  const topSectionFlex = height < 780 ? 1.1 : 1.22;
  const bottomSectionFlex = 1.08;

  function handleBoardStageLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - boardStageWidth) > 1) {
      setBoardStageWidth(nextWidth);
    }
  }

  if (isLoading) {
    return (
      <ScreenFrame>
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
      <ScreenFrame bottomInset={screenBottomInset}>
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
  const status = boardStatus(device);
  const stats = visibleBoardStats(device);
  const currentWeekCompleted = device.days[device.today.weekIndex]
    .slice(0, device.today.dayIndex + 1)
    .filter(Boolean).length;
  const topCardSurface = withAlpha(theme.colors.bgElevated, 0.98);
  const topCardBorder = withAlpha(theme.colors.textPrimary, 0.06);
  const topCardSubtle = withAlpha(theme.colors.textPrimary, 0.04);

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

  const boardIdentity = (
    <View
      style={{
        width: "100%",
        maxWidth: boardColumnWidth,
        alignSelf: "center",
        gap: 10,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: 30,
              lineHeight: 34,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {device.name}
          </Text>
        </View>

        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <StatusBadge color={status.color} />
          <Pressable
            hitSlop={10}
            onPress={() => router.push("/settings")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
            }}
          >
            <Ionicons color={theme.colors.textSecondary} name="options-outline" size={21} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const boardSection = (
    <View
      onLayout={handleBoardStageLayout}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <View
        style={{
          alignItems: "center",
          width: "100%",
          maxWidth: boardColumnWidth,
          borderRadius: boardFrameRadius,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.06),
          backgroundColor: palette.socket,
          paddingHorizontal: boardFrameInsetX,
          paddingVertical: boardFrameInsetY,
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
    </View>
  );

  const statsBand = (
    <View
      style={{
        width: "100%",
        maxWidth: boardColumnWidth,
        alignSelf: "center",
        minHeight: 108,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <InlineStat label="Today" value={todayWeekday} />
        <StatDivider />
        <InlineStat label="This week" value={`${currentWeekCompleted} of ${device.weeklyTarget}`} />
        <StatDivider />
        <InlineStat label="Recorded" value={`${stats.completed} total`} />
      </View>
    </View>
  );

  const topComposition = (
    <View
      style={{
        width: "100%",
        borderRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: topCardBorder,
        backgroundColor: topCardSurface,
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 0,
        gap: 24,
      }}
    >
      <LinearGradient
        colors={[withAlpha(theme.colors.textPrimary, 0.08), withAlpha(theme.colors.textPrimary, 0.015), "transparent"]}
        end={{ x: 0.82, y: 0.6 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          left: 0,
          height: 180,
        }}
      />
      {boardIdentity}
      {boardSection}
      {statsBand}
    </View>
  );

  if (isEditingHistory) {
    return (
      <ScreenFrame bottomInset={screenBottomInset} scroll>
        <View style={{ gap: 18, paddingTop: 24, paddingBottom: 24 }}>
          {topComposition}

          <View
            style={{
              width: "100%",
              maxWidth: boardColumnWidth,
              alignSelf: "center",
              gap: 12,
            }}
          >
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
        </View>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame bottomInset={screenBottomInset}>
      <View style={{ flex: 1, paddingTop: 12, paddingBottom: 0 }}>
        <View
          style={{
            flex: topSectionFlex,
            justifyContent: "center",
            gap: 18,
          }}
        >
          {topComposition}
        </View>

        <View
          style={{
            flex: bottomSectionFlex,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          <PrimaryActionButton
            activeColor={palette.dayOn}
            onPress={() => {
              if (todayActionLockRef.current || isTodayToggleLocked) {
                return;
              }

              todayActionLockRef.current = true;
              setTodayActionInFlight(true);

              void toggleToday(device.id)
                .then(() => {
                  triggerPrimaryActionSuccessHaptic();
                })
                .catch((error) => {
                  const message = error instanceof Error ? error.message : "Failed to update the device.";
                  triggerPrimaryActionFailureHaptic();
                  Alert.alert("Couldn’t update the device", message);
                  console.warn("Failed to toggle today from app", error);
                })
                .finally(() => {
                  todayActionLockRef.current = false;
                  setTodayActionInFlight(false);
                });
            }}
            size={156}
            state={boardButtonState(device, buttonIsApplying, isTodayToggleLocked)}
            style={{ alignSelf: "center" }}
          />
        </View>
      </View>
    </ScreenFrame>
  );
}

export default function HomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const pagerRef = useRef<PagerView>(null);
  const [selectedTabIndex, setSelectedTabIndex] = useState(() => tabIndexFromParam(tab));

  useEffect(() => {
    const nextIndex = tabIndexFromParam(tab);
    setSelectedTabIndex((currentIndex) => {
      if (nextIndex === currentIndex) {
        return currentIndex;
      }

      pagerRef.current?.setPageWithoutAnimation(nextIndex);
      return nextIndex;
    });
  }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
      <PagerView
        ref={pagerRef}
        initialPage={selectedTabIndex}
        offscreenPageLimit={3}
        onPageSelected={(event) => {
          setSelectedTabIndex(event.nativeEvent.position);
        }}
        overdrag={false}
        style={{ flex: 1 }}
      >
        <View collapsable={false} key="home" style={{ flex: 1 }}>
          <HomeTabContent />
        </View>
        <View collapsable={false} key="friends" style={{ flex: 1 }}>
          <FriendsTabContent />
        </View>
        <View collapsable={false} key="profile" style={{ flex: 1 }}>
          <ProfileTabContent />
        </View>
      </PagerView>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <TopPageNav
          activeIndex={selectedTabIndex}
          onSelect={(nextIndex) => {
            if (nextIndex === selectedTabIndex) {
              return;
            }

            setSelectedTabIndex(nextIndex);
            pagerRef.current?.setPage(nextIndex);
          }}
        />
      </View>
    </View>
  );
}
