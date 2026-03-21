import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeviceBoardStage } from "@/components/board/device-board-stage";
import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { connectionGraceState } from "@/lib/device-connection";
import { getDeviceAccentColor } from "@/lib/device-accent";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsPath } from "@/lib/device-routes";
import { homeMinimumGoalLabel } from "@/lib/habit-details";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { formatWeekdayFromLocalDate } from "@/lib/runtime-board-projection";
import { useAppUiStore } from "@/store/app-ui-store";
import { useDeviceHabitMetadataStore } from "@/store/device-habit-metadata-store";
import { AddOneDevice } from "@/types/addone";

const HOME_INSIGHT_MAX_LINES = 3;
const HOME_INSIGHT_PANEL_HEIGHT = theme.typography.micro.lineHeight + theme.typography.body.lineHeight * HOME_INSIGHT_MAX_LINES + 18;
const HOME_INSIGHT_TRANSITION_DURATION = 360;
const HOME_INSIGHT_ENTRY_OFFSET = 16;
const HOME_INSIGHT_EXIT_OFFSET = 10;

type HomeHeaderConnectionState = "online" | "verifying-board" | "checking-connection" | "offline";
type HomeInsight = { eyebrow: string; message: string };

function headerConnectionState(device: AddOneDevice): HomeHeaderConnectionState {
  const baseConnectionState = connectionGraceState(device);

  if (baseConnectionState === "online") {
    return device.needsSnapshotRefresh ? "verifying-board" : "online";
  }

  if (baseConnectionState === "checking") {
    return "checking-connection";
  }

  return "offline";
}

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

function visibleBoardStats(device: AddOneDevice) {
  let completed = 0;
  let visibleDays = 0;
  let successfulWeeks = 0;

  for (let col = 0; col < device.days.length; col += 1) {
    const isPastWeek = col > device.today.weekIndex;
    const isCurrentWeek = col === device.today.weekIndex;
    const visibleRows = isPastWeek ? 7 : isCurrentWeek ? device.today.dayIndex + 1 : 0;
    const completedThisWeek = device.days[col].slice(0, visibleRows).filter(Boolean).length;

    visibleDays += visibleRows;
    completed += completedThisWeek;

    if (visibleRows > 0 && completedThisWeek >= device.weeklyTarget) {
      successfulWeeks += 1;
    }
  }

  return {
    completed,
    fillPercentage: visibleDays === 0 ? 0 : Math.round((completed / visibleDays) * 100),
    successfulWeeks,
  };
}

function boardInsight(device: AddOneDevice, stats: { completed: number; fillPercentage: number }, currentWeekCompleted: number): HomeInsight {
  const remainingThisWeek = Math.max(device.weeklyTarget - currentWeekCompleted, 0);

  if (!device.isLive) {
    return {
      eyebrow: "Board note",
      message: `Recovery reconnects the device without changing your ${stats.completed}-day history.`,
    };
  }

  if (remainingThisWeek === 0) {
    return {
      eyebrow: "Weekly target",
      message: `This week is already complete. A check-in today keeps the board current and the pattern honest.`,
    };
  }

  if (remainingThisWeek === 1) {
    return {
      eyebrow: "Weekly target",
      message: `One more check-in reaches this week's target. Visible fill is currently ${stats.fillPercentage}%.`,
    };
  }

  return {
    eyebrow: "This week",
    message: `${remainingThisWeek} more check-ins reaches the weekly target. The board is currently ${stats.fillPercentage}% filled.`,
  };
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        gap: 6,
        justifyContent: "center",
        paddingHorizontal: 2,
      }}
    >
      <Text
        style={{
          color: theme.colors.textTertiary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: 22,
          lineHeight: 26,
          fontVariant: ["tabular-nums"],
          textAlign: "center",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function insightKey(insight: HomeInsight) {
  return `${insight.eyebrow}:${insight.message}`;
}

function HomeInsightCopy({ insight }: { insight: HomeInsight }) {
  return (
    <>
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
        {insight.eyebrow}
      </Text>
      <Text
        ellipsizeMode="tail"
        numberOfLines={HOME_INSIGHT_MAX_LINES}
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        {insight.message}
      </Text>
    </>
  );
}

function HomeInsightPanel({ insight }: { insight: HomeInsight }) {
  const nextInsightKey = insightKey(insight);
  const [currentInsight, setCurrentInsight] = useState<HomeInsight>(() => insight);
  const [currentInsightKey, setCurrentInsightKey] = useState(() => nextInsightKey);
  const [outgoingInsight, setOutgoingInsight] = useState<HomeInsight | null>(null);
  const transitionProgress = useSharedValue(1);
  const transitionTokenRef = useRef(0);

  const clearOutgoingInsight = (token: number) => {
    if (transitionTokenRef.current === token) {
      setOutgoingInsight(null);
    }
  };

  useEffect(() => {
    if (nextInsightKey === currentInsightKey) {
      return;
    }

    const nextToken = transitionTokenRef.current + 1;
    transitionTokenRef.current = nextToken;

    cancelAnimation(transitionProgress);
    setOutgoingInsight(currentInsight);
    setCurrentInsight(insight);
    setCurrentInsightKey(nextInsightKey);
    transitionProgress.value = 0;
    transitionProgress.value = withTiming(
      1,
      {
        duration: HOME_INSIGHT_TRANSITION_DURATION,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(clearOutgoingInsight)(nextToken);
        }
      },
    );
  }, [currentInsight, currentInsightKey, insight, nextInsightKey, transitionProgress]);

  useEffect(
    () => () => {
      cancelAnimation(transitionProgress);
    },
    [transitionProgress],
  );

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transitionProgress.value, [0, 0.16, 1], [0, 0, 1]),
    transform: [
      { translateY: interpolate(transitionProgress.value, [0, 1], [HOME_INSIGHT_ENTRY_OFFSET, 0]) },
      { scale: interpolate(transitionProgress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: outgoingInsight ? interpolate(transitionProgress.value, [0, 0.58, 1], [1, 0.42, 0]) : 0,
    transform: [
      { translateY: interpolate(transitionProgress.value, [0, 1], [0, -HOME_INSIGHT_EXIT_OFFSET]) },
      { scale: interpolate(transitionProgress.value, [0, 1], [1, 0.988]) },
    ],
  }));

  const insightLayerStyle = {
    gap: 6,
    justifyContent: "center" as const,
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return (
    <View
      style={{
        height: HOME_INSIGHT_PANEL_HEIGHT,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {outgoingInsight ? (
        <Animated.View pointerEvents="none" style={[insightLayerStyle, outgoingStyle]}>
          <HomeInsightCopy insight={outgoingInsight} />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[insightLayerStyle, incomingStyle]}>
        <HomeInsightCopy insight={currentInsight} />
      </Animated.View>
    </View>
  );
}

function PulsingStatusDot({ color }: { color: string }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.9, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );

    return () => {
      pulseScale.value = 1;
    };
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 0.85 - (pulseScale.value - 1) * 0.75),
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={{ alignItems: "center", height: 12, justifyContent: "center", width: 12 }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            height: 8,
            width: 8,
            borderRadius: 4,
            backgroundColor: withAlpha(color, 0.28),
          },
          pulseStyle,
        ]}
      />
      <View
        style={{
          height: 8,
          width: 8,
          borderRadius: 4,
          backgroundColor: color,
          boxShadow: `0px 0px 18px ${withAlpha(color, 0.65)}`,
        }}
      />
    </View>
  );
}

function HeaderChip({
  color,
  icon,
  iconColor,
  label,
  onPress,
  pulse = false,
}: {
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label?: string;
  onPress?: () => void;
  pulse?: boolean;
}) {
  const content = (
    <>
      {icon ? <Ionicons color={iconColor ?? theme.colors.textSecondary} name={icon} size={16} /> : null}
      {color && pulse ? <PulsingStatusDot color={color} /> : null}
      {color && !pulse ? (
        <View
          style={{
            height: 8,
            width: 8,
            borderRadius: 4,
            backgroundColor: color,
            boxShadow: `0px 0px 18px ${withAlpha(color, 0.65)}`,
          }}
        />
      ) : null}
      {label ? (
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
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 6,
          justifyContent: "center",
          minHeight: 36,
          minWidth: label ? 36 : 44,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: theme.materials.panel.border,
          backgroundColor: withAlpha(theme.colors.bgBase, 0.22),
          paddingHorizontal: label ? 12 : 0,
          paddingVertical: 7,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
        justifyContent: "center",
        minHeight: 36,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.materials.panel.border,
        backgroundColor: withAlpha(theme.colors.bgBase, 0.22),
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      {content}
    </Pressable>
  );
}

function IconActionPill({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.materials.panel.border,
        backgroundColor: withAlpha(theme.colors.bgBase, 0.22),
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name={icon} size={16} />
    </Pressable>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeDevice, activeDeviceId, isLoading } = useDevices();
  const { isApplyingToday, refreshRuntimeSnapshot, toggleToday } = useDeviceActions();
  const minimumGoal = useDeviceHabitMetadataStore((state) => (activeDeviceId ? state.minimumGoalByDeviceId[activeDeviceId] ?? "" : ""));
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const pendingBoardEditorOpen = useAppUiStore((state) => state.pendingBoardEditorOpen);
  const clearBoardEditorOpen = useAppUiStore((state) => state.clearBoardEditorOpen);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const todayActionLockRef = useRef(false);
  const [todayActionInFlight, setTodayActionInFlight] = useState(false);
  const [staleRefreshInFlight, setStaleRefreshInFlight] = useState(false);
  const staleRefreshKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingBoardEditorOpen || !activeDevice?.isLive) {
      return;
    }

    clearBoardEditorOpen();
    router.push(deviceHistoryPath(activeDevice.id));
  }, [activeDevice?.isLive, clearBoardEditorOpen, pendingBoardEditorOpen, router]);

  const effectiveDevice = useMemo(() => {
    if (!activeDevice) {
      return null;
    }

    return withPendingTodayState(activeDevice, activePendingTodayState);
  }, [activeDevice, activePendingTodayState]);

  useEffect(() => {
    if (!activeDevice?.isLive || !activeDevice.needsSnapshotRefresh) {
      staleRefreshKeyRef.current = null;
      setStaleRefreshInFlight(false);
      return;
    }

    const refreshKey = `${activeDevice.id}:${activeDevice.logicalToday}:${activeDevice.lastSnapshotAt ?? ""}:${activeDevice.runtimeRevision}`;
    if (staleRefreshKeyRef.current === refreshKey) {
      return;
    }

    staleRefreshKeyRef.current = refreshKey;
    setStaleRefreshInFlight(true);

    void refreshRuntimeSnapshot(activeDevice.id)
      .catch((error) => {
        console.warn("Failed to refresh stale runtime snapshot on home", error);
      })
      .finally(() => {
        setStaleRefreshInFlight(false);
      });
  }, [
    activeDevice?.id,
    activeDevice?.isLive,
    activeDevice?.lastSnapshotAt,
    activeDevice?.logicalToday,
    activeDevice?.needsSnapshotRefresh,
    activeDevice?.runtimeRevision,
    refreshRuntimeSnapshot,
  ]);

  const palette = useMemo(
    () => (effectiveDevice ? getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette) : null),
    [effectiveDevice],
  );
  const deviceAccentColor = useMemo(() => getDeviceAccentColor(effectiveDevice), [effectiveDevice]);
  const cells = useMemo(() => (effectiveDevice ? buildBoardCells(effectiveDevice) : []), [effectiveDevice]);

  if (isLoading) {
    return (
      <ScreenScrollView bottomInset={theme.layout.tabScrollBottom} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: 14, paddingVertical: 36 }}>
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
      </ScreenScrollView>
    );
  }

  if (!effectiveDevice || !palette) {
    return (
      <ScreenScrollView
        bottomInset={theme.layout.tabScrollBottom}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        contentMaxWidth={theme.layout.narrowContentWidth}
      >
        <View style={{ alignItems: "center", gap: 18, paddingVertical: 24 }}>
          <Pressable
            onPress={() => router.push("/onboarding")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 132,
              height: 132,
              borderRadius: theme.radius.sheet,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.bgBase, 0.72),
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.22)",
            }}
          >
            <Ionicons color={theme.colors.textPrimary} name="add" size={44} />
          </Pressable>

          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
              textAlign: "center",
            }}
          >
            Connect your AddOne
          </Text>
        </View>
      </ScreenScrollView>
    );
  }

  const device = effectiveDevice;
  const stats = visibleBoardStats(device);
  const todayWeekday = formatWeekdayFromLocalDate(device.logicalToday);
  const currentWeekCompleted = device.days[device.today.weekIndex]
    .slice(0, device.today.dayIndex + 1)
    .filter(Boolean).length;
  const homeBottomInset = theme.layout.tabScrollBottom;
  const contentMinHeight = Math.max(0, height - insets.top - homeBottomInset - theme.layout.scrollTop);
  const isTodayToggleLocked = staleRefreshInFlight || todayActionInFlight || activePendingTodayState !== undefined;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;
  const todayState = boardButtonState(device, buttonIsApplying, isTodayToggleLocked);
  const dividerColor = withAlpha(theme.colors.textPrimary, 0.08);
  const insight = boardInsight(device, stats, currentWeekCompleted);
  const headerStatusState = headerConnectionState(device);
  const headerStatusColor = headerStatusState === "verifying-board" ? theme.colors.accentAmber : theme.colors.accentSuccess;
  const headerContextMessage =
    headerStatusState === "verifying-board"
      ? "Verifying the current board…"
      : headerStatusState === "offline"
          ? "Board looks offline. Open Recovery to reconnect Wi-Fi."
          : homeMinimumGoalLabel(minimumGoal);
  const headerContextKey = `${headerStatusState}:${headerContextMessage ?? "empty"}`;

  return (
    <ScreenScrollView
      bottomInset={homeBottomInset}
      contentContainerStyle={{ flexGrow: 1 }}
      contentMaxWidth={theme.layout.maxContentWidth}
    >
      <View style={{ minHeight: contentMinHeight, gap: 16 }}>
        <View style={{ gap: 8 }}>
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
            {todayWeekday}
          </Text>

          <View style={{ alignItems: "center", flexDirection: "row", gap: 14, justifyContent: "space-between" }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textPrimary,
                flex: 1,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: 34,
                lineHeight: 38,
              }}
            >
              {device.name}
            </Text>

            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              {headerStatusState === "offline" ? (
                <HeaderChip icon="wifi-outline" label="Recovery" onPress={() => router.push(deviceRecoveryPath(device.id))} />
              ) : headerStatusState === "checking-connection" ? (
                <HeaderChip color={theme.colors.accentSuccess} pulse />
              ) : (
                <HeaderChip color={headerStatusColor} />
              )}
              <IconActionPill icon="settings-outline" onPress={() => router.push(deviceSettingsPath(device.id))} />
            </View>
          </View>

          <View style={{ justifyContent: "center", minHeight: 22 }}>
            {headerContextMessage ? (
	              <Animated.View
	                key={headerContextKey}
	                entering={FadeIn.duration(180)}
	                exiting={FadeOut.duration(140)}
	                style={{ justifyContent: "center" }}
	              >
	                <Text
	                  ellipsizeMode="tail"
	                  numberOfLines={1}
	                  style={{
	                    color: theme.colors.textSecondary,
	                    fontFamily: theme.typography.body.fontFamily,
	                    fontSize: 14,
	                    lineHeight: 20,
	                    paddingRight: 4,
	                  }}
	                >
	                  {headerContextMessage}
	                </Text>
	              </Animated.View>
            ) : null}
          </View>
        </View>

        <DeviceBoardStage
          accentColor={theme.colors.accentAmber}
          cells={cells}
          palette={palette}
          pendingPulse={
            activePendingTodayState !== undefined
              ? {
                  col: device.today.weekIndex,
                  row: device.today.dayIndex,
                }
              : null
          }
        />

        <View style={{ gap: 14 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <View style={{ alignItems: "stretch", flexDirection: "row" }}>
            <MetricTile label="This week" value={`${currentWeekCompleted}/${device.weeklyTarget}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Weeks" value={`${stats.successfulWeeks}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Recorded" value={`${stats.completed}d`} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <HomeInsightPanel insight={insight} />
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 20 }}>
          <PrimaryActionButton
            activeColor={deviceAccentColor}
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
            state={todayState}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}
