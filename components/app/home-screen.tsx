import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import { useOnboarding } from "@/hooks/use-onboarding";
import { buildBoardCells, getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { getDeviceAccentColor } from "@/lib/device-accent";
import { isDevicePendingRemoval } from "@/lib/device-removal";
import { isDeviceControlReady, isDeviceRecovering, needsDeviceRecovery } from "@/lib/device-recovery";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsPath } from "@/lib/device-routes";
import { homeMinimumGoalLabel } from "@/lib/habit-details";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { formatWeekdayFromLocalDate, startOfWeek } from "@/lib/runtime-board-projection";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice } from "@/types/addone";

const HOME_INSIGHT_MAX_LINES = 3;
const HOME_INSIGHT_PANEL_HEIGHT = theme.typography.micro.lineHeight + theme.typography.body.lineHeight * HOME_INSIGHT_MAX_LINES + 18;
const HOME_INSIGHT_TRANSITION_DURATION = 360;
const HOME_INSIGHT_ENTRY_OFFSET = 16;
const HOME_INSIGHT_EXIT_OFFSET = 10;
const CLAIMED_SESSION_DEVICE_GRACE_MS = 15_000;
const HOME_PRIMARY_ACTION_SIZE = 156;
const HOME_PRIMARY_ACTION_ANCHOR_RATIO = 0.5;
const HOME_PRIMARY_ACTION_BOTTOM_GAP = 16;
const HOME_PRIMARY_ACTION_TOP_GAP = 72;
const HOME_PULL_REFRESH_TRIGGER = 84;

type HomeHeaderConnectionState = "online" | "verifying-board" | "recovering" | "needs-recovery" | "checking-connection" | "offline" | "removing";
type HomeInsight = { eyebrow: string; message: string };

function resolvePendingSetupCopy(status: "awaiting_ap" | "awaiting_cloud" | "claimed") {
  if (status === "awaiting_ap") {
    return {
      body: "Setup already started. Join the AddOne Wi‑Fi on this phone and continue from the setup flow.",
      buttonLabel: "Resume setup",
      title: "Board setup in progress",
    };
  }

  if (status === "awaiting_cloud") {
    return {
      body: "The board is trying your home Wi‑Fi and finishing its first cloud claim.",
      buttonLabel: "Open setup",
      title: "Connecting your board",
    };
  }

  return {
    body: "The board is claimed. Open setup to finish the last details and load the first full snapshot.",
    buttonLabel: "Finish setup",
    title: "Almost ready",
  };
}

function headerConnectionState(device: AddOneDevice): HomeHeaderConnectionState {
  if (isDevicePendingRemoval(device)) {
    return "removing";
  }

  if (needsDeviceRecovery(device)) {
    return "needs-recovery";
  }

  if (isDeviceRecovering(device)) {
    return "recovering";
  }

  if (!device.isLive) {
    return device.syncState === "syncing" ? "checking-connection" : "offline";
  }

  if (device.syncState === "syncing") {
    return "checking-connection";
  }

  return device.needsSnapshotRefresh ? "verifying-board" : "online";
}

function boardButtonState(device: AddOneDevice, isApplyingToday: boolean, isLocked = false): PrimaryActionState {
  if (isApplyingToday || isLocked) {
    return "syncing";
  }

  if (!isDeviceControlReady(device)) {
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
  let visibleCompleted = 0;
  let visibleDays = 0;

  for (let col = 0; col < device.days.length; col += 1) {
    const isPastWeek = col > device.today.weekIndex;
    const isCurrentWeek = col === device.today.weekIndex;
    const visibleRows = isPastWeek ? 7 : isCurrentWeek ? device.today.dayIndex + 1 : 0;
    const completedThisWeek = device.days[col].slice(0, visibleRows).filter(Boolean).length;

    visibleDays += visibleRows;
    visibleCompleted += completedThisWeek;
  }

  return {
    fillPercentage: visibleDays === 0 ? 0 : Math.round((visibleCompleted / visibleDays) * 100),
  };
}

function totalHabitWeeks(device: AddOneDevice) {
  if (!device.habitStartedOnLocal) {
    return null;
  }

  const habitStartWeek = startOfWeek(device.habitStartedOnLocal, device.weekStart);
  const currentWeek = startOfWeek(device.logicalToday, device.weekStart);
  const daysBetween = Math.round((new Date(`${currentWeek}T00:00:00.000Z`).getTime() - new Date(`${habitStartWeek}T00:00:00.000Z`).getTime()) / 86_400_000);
  const elapsedWeeks = Math.floor(Math.max(daysBetween, 0) / 7) + 1;
  return Math.max(elapsedWeeks, device.successfulWeeksTotal);
}

function boardInsight(device: AddOneDevice, stats: { fillPercentage: number }, currentWeekCompleted: number): HomeInsight {
  const remainingThisWeek = Math.max(device.weeklyTarget - currentWeekCompleted, 0);

  if (isDevicePendingRemoval(device)) {
    return {
      eyebrow: "Removal",
      message: "This board is leaving the account now. AddOne is waiting for the reset confirmation or a short timeout before it disappears.",
    };
  }

  if (needsDeviceRecovery(device)) {
    return {
      eyebrow: "Board note",
      message: `Recovery reconnects the board without changing your ${device.recordedDaysTotal}-day history.`,
    };
  }

  if (isDeviceRecovering(device)) {
    return {
      eyebrow: "Board note",
      message: "Recovery is still finishing. Controls stay locked until the restored board is fully back.",
    };
  }

  if (!device.isLive) {
    return {
      eyebrow: "Board note",
      message: `The board is offline. Your ${device.recordedDaysTotal}-day history is still preserved and ready for recovery.`,
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

function HomePrimaryActionOverlay(props: {
  activeColor: string;
  bottomPadding: number;
  onPress: () => void;
  state: PrimaryActionState;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "center",
        paddingBottom: props.bottomPadding,
      }}
    >
      <PrimaryActionButton activeColor={props.activeColor} onPress={props.onPress} size={HOME_PRIMARY_ACTION_SIZE} state={props.state} />
    </View>
  );
}

function HomeBoardRefreshOverlay({ activeColor }: { activeColor: string }) {
  return (
    <BlurView
      intensity={26}
      pointerEvents="none"
      tint="dark"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          alignItems: "center",
          gap: 10,
          borderRadius: theme.radius.hero,
          backgroundColor: withAlpha(theme.colors.bgBase, 0.38),
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}
      >
        <ActivityIndicator color={activeColor} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          Refreshing board
        </Text>
      </View>
    </BlurView>
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
  const { clearLocalOnboardingSession, isLoading: isOnboardingLoading, session: onboardingSession } = useOnboarding();
  const { isApplyingToday, refreshDevices, refreshRuntimeSnapshot, toggleToday } = useDeviceActions();
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const pendingBoardEditorOpen = useAppUiStore((state) => state.pendingBoardEditorOpen);
  const clearBoardEditorOpen = useAppUiStore((state) => state.clearBoardEditorOpen);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const todayActionLockRef = useRef(false);
  const [todayActionInFlight, setTodayActionInFlight] = useState(false);
  const [manualRefreshInFlight, setManualRefreshInFlight] = useState(false);
  const [staleRefreshInFlight, setStaleRefreshInFlight] = useState(false);
  const staleRefreshKeyRef = useRef<string | null>(null);
  const pullRefreshDistanceRef = useRef(0);
  const weeklyTargetAnchorRef = useRef<View>(null);
  const [weeklyTargetBottom, setWeeklyTargetBottom] = useState<number | null>(null);

  useEffect(() => {
    if (!pendingBoardEditorOpen || !activeDevice || !isDeviceControlReady(activeDevice)) {
      return;
    }

    clearBoardEditorOpen();
    router.push(deviceHistoryPath(activeDevice.id));
  }, [activeDevice, clearBoardEditorOpen, pendingBoardEditorOpen, router]);

  const effectiveDevice = useMemo(() => {
    if (!activeDevice) {
      return null;
    }

    return withPendingTodayState(activeDevice, activePendingTodayState);
  }, [activeDevice, activePendingTodayState]);
  const claimedSessionIsFresh = useMemo(() => {
    if (onboardingSession?.status !== "claimed" || !onboardingSession.claimedAt) {
      return false;
    }

    const claimedAtMs = new Date(onboardingSession.claimedAt).getTime();
    return Number.isFinite(claimedAtMs) && Date.now() - claimedAtMs < CLAIMED_SESSION_DEVICE_GRACE_MS;
  }, [onboardingSession?.claimedAt, onboardingSession?.status]);
  const pendingOnboardingStatus =
    !effectiveDevice && onboardingSession && !onboardingSession.isExpired
      ? onboardingSession.status === "awaiting_ap" ||
        onboardingSession.status === "awaiting_cloud" ||
        (onboardingSession.status === "claimed" && claimedSessionIsFresh)
        ? onboardingSession.status
        : null
      : null;
  const pendingSetupCopy = pendingOnboardingStatus ? resolvePendingSetupCopy(pendingOnboardingStatus) : null;
  const measureWeeklyTargetAnchor = () => {
    if (!weeklyTargetAnchorRef.current) {
      return;
    }

    weeklyTargetAnchorRef.current.measureInWindow((_x, y) => {
      if (!Number.isFinite(y)) {
        return;
      }

      setWeeklyTargetBottom((currentBottom) => {
        if (currentBottom !== null && Math.abs(currentBottom - y) < 1) {
          return currentBottom;
        }

        return y;
      });
    });
  };
  const safeAreaHeight = height - insets.top - insets.bottom;
  const fallbackBottomPadding = 32;
  const tabBarTop = safeAreaHeight - Math.max(theme.layout.tabScrollBottom - insets.bottom, 0);
  const primaryActionBottomPadding =
    weeklyTargetBottom === null
      ? fallbackBottomPadding
      : (() => {
          const weeklyTargetBottomWithinSafeArea = weeklyTargetBottom - insets.top;
          const minTop = weeklyTargetBottomWithinSafeArea + HOME_PRIMARY_ACTION_TOP_GAP;
          const maxTop = tabBarTop - HOME_PRIMARY_ACTION_SIZE - HOME_PRIMARY_ACTION_BOTTOM_GAP;

          if (maxTop <= minTop) {
            return Math.max(safeAreaHeight - (minTop + HOME_PRIMARY_ACTION_SIZE), fallbackBottomPadding);
          }

          const buttonTop = minTop + (maxTop - minTop) * HOME_PRIMARY_ACTION_ANCHOR_RATIO;
          return Math.max(safeAreaHeight - (buttonTop + HOME_PRIMARY_ACTION_SIZE), fallbackBottomPadding);
        })();
  const homeBottomInset = HOME_PRIMARY_ACTION_SIZE + primaryActionBottomPadding + HOME_PRIMARY_ACTION_TOP_GAP;
  const contentMinHeight = Math.max(0, height - insets.top - homeBottomInset - theme.layout.scrollTop);

  useEffect(() => {
    if (effectiveDevice || onboardingSession?.status !== "claimed" || claimedSessionIsFresh) {
      return;
    }

    clearLocalOnboardingSession();
  }, [claimedSessionIsFresh, clearLocalOnboardingSession, effectiveDevice, onboardingSession?.status]);

  useEffect(() => {
    if (!activeDevice || !isDeviceControlReady(activeDevice) || !activeDevice.needsSnapshotRefresh) {
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
    activeDevice,
    refreshRuntimeSnapshot,
  ]);

  useEffect(() => {
    if (!effectiveDevice) {
      setWeeklyTargetBottom(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      measureWeeklyTargetAnchor();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [effectiveDevice, height]);

  const palette = useMemo(
    () => (effectiveDevice ? getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette) : null),
    [effectiveDevice],
  );
  const deviceAccentColor = useMemo(() => getDeviceAccentColor(effectiveDevice), [effectiveDevice]);
  const cells = useMemo(() => (effectiveDevice ? buildBoardCells(effectiveDevice) : []), [effectiveDevice]);

  async function handleManualRefresh() {
    if (manualRefreshInFlight) {
      return;
    }

    setManualRefreshInFlight(true);
    try {
      const refreshResult = await refreshDevices({
        probeDeviceId: activeDevice?.id ?? null,
      });
      const probeDevice = refreshResult.probeDevice;

      if (
        probeDevice &&
        probeDevice.accountRemovalState === "active" &&
        probeDevice.recoveryState === "ready" &&
        probeDevice.isLive &&
        !refreshResult.markedConnectivityIssue
      ) {
        try {
          await refreshRuntimeSnapshot(probeDevice.id, {
            errorMessage: "The board did not answer the refresh check in time.",
            timeoutMs: 6_500,
          });
        } catch (error) {
          console.warn("Failed to refresh device reachability from home", error);
        }
      }
    } finally {
      setManualRefreshInFlight(false);
    }
  }

  const handleHomeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    pullRefreshDistanceRef.current = Math.max(-event.nativeEvent.contentOffset.y, 0);
  };

  const handleHomeScrollEndDrag = () => {
    const shouldRefresh = pullRefreshDistanceRef.current >= HOME_PULL_REFRESH_TRIGGER;
    pullRefreshDistanceRef.current = 0;

    if (shouldRefresh) {
      void handleManualRefresh();
    }
  };

  if (isLoading || (!effectiveDevice && isOnboardingLoading)) {
    return (
      <ScreenScrollView
        alwaysBounceVertical
        bottomInset={theme.layout.tabScrollBottom}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        onScroll={handleHomeScroll}
        onScrollEndDrag={handleHomeScrollEndDrag}
        scrollEventThrottle={16}
      >
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
            {effectiveDevice ? "Loading your board…" : "Checking your AddOne…"}
          </Text>
        </View>
      </ScreenScrollView>
    );
  }

  if (!effectiveDevice || !palette) {
    return (
      <ScreenScrollView
        alwaysBounceVertical
        bottomInset={theme.layout.tabScrollBottom}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        onScroll={handleHomeScroll}
        onScrollEndDrag={handleHomeScrollEndDrag}
        scrollEventThrottle={16}
      >
        <View style={{ alignItems: "center", gap: 28, paddingVertical: 24 }}>
          {pendingSetupCopy ? (
            <GlassCard style={{ gap: 18, paddingHorizontal: 20, paddingVertical: 22 }}>
              <View style={{ alignItems: "center", gap: 14 }}>
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                    backgroundColor: withAlpha(theme.colors.bgBase, 0.62),
                  }}
                >
                  <ActivityIndicator color={theme.colors.textPrimary} />
                </View>
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.title.fontFamily,
                      fontSize: theme.typography.title.fontSize,
                      lineHeight: theme.typography.title.lineHeight,
                      textAlign: "center",
                    }}
                  >
                    {pendingSetupCopy.title}
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
                    {pendingSetupCopy.body}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/onboarding")}
                style={({ pressed }) => ({
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 56,
                  borderRadius: theme.radius.card,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, pressed ? 0.16 : 0.12),
                  backgroundColor: pressed ? withAlpha(theme.colors.textPrimary, 0.92) : theme.colors.textPrimary,
                  transform: [{ scale: pressed ? 0.988 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: theme.colors.bgBase,
                    fontFamily: theme.typography.label.fontFamily,
                    fontSize: 18,
                    lineHeight: 22,
                  }}
                >
                  {pendingSetupCopy.buttonLabel}
                </Text>
              </Pressable>
            </GlassCard>
          ) : (
            <>
              <Pressable
                onPress={() => router.push("/onboarding?auto=1")}
                style={({ pressed }) => ({
                  alignItems: "center",
                  justifyContent: "center",
                  width: 132,
                  height: 132,
                  borderRadius: theme.radius.sheet,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, pressed ? 0.18 : 0.14),
                  backgroundColor: withAlpha(theme.colors.bgBase, pressed ? 0.78 : 0.72),
                  boxShadow: `0px 20px 40px rgba(0, 0, 0, 0.22), 0px 0px 42px ${withAlpha(theme.colors.textPrimary, 0.075)}`,
                  transform: [{ scale: pressed ? 0.988 : 1 }],
                })}
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
            </>
          )}
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
  const habitWeeksTotal = totalHabitWeeks(device);
  const isTodayToggleLocked = staleRefreshInFlight || todayActionInFlight || activePendingTodayState !== undefined;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;
  const todayState = boardButtonState(device, buttonIsApplying, isTodayToggleLocked);
  const dividerColor = withAlpha(theme.colors.textPrimary, 0.08);
  const insight = boardInsight(device, stats, currentWeekCompleted);
  const headerStatusState = headerConnectionState(device);
  const headerStatusColor =
    headerStatusState === "online"
      ? theme.colors.accentSuccess
      : headerStatusState === "checking-connection" || headerStatusState === "offline"
        ? theme.colors.textMuted
        : theme.colors.accentAmber;
  const headerContextMessage =
    headerStatusState === "removing"
      ? "Removing this board from the account…"
      : headerStatusState === "verifying-board"
      ? "Verifying the current board…"
      : headerStatusState === "recovering"
        ? "Recovery is finishing. Controls come back after the restored board syncs."
        : headerStatusState === "needs-recovery"
          ? "This board needs recovery before it can be controlled."
      : headerStatusState === "offline"
          ? "Board looks offline. Open Recovery to reconnect Wi-Fi."
          : homeMinimumGoalLabel(device.dailyMinimum);
  const headerContextKey = `${headerStatusState}:${headerContextMessage ?? "empty"}`;
  const handlePrimaryActionPress = () => {
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
  };

  return (
    <ScreenScrollView
      alwaysBounceVertical
      bottomInset={homeBottomInset}
      bottomOverlay={
        <HomePrimaryActionOverlay
          activeColor={deviceAccentColor}
          bottomPadding={primaryActionBottomPadding}
          onPress={handlePrimaryActionPress}
          state={todayState}
        />
      }
      contentContainerStyle={{ flexGrow: 1 }}
      contentMaxWidth={theme.layout.maxContentWidth}
      onScroll={handleHomeScroll}
      onScrollEndDrag={handleHomeScrollEndDrag}
      scrollEventThrottle={16}
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
              {headerStatusState === "offline" || headerStatusState === "needs-recovery" || headerStatusState === "recovering" ? (
                <HeaderChip icon="wifi-outline" label="Recovery" onPress={() => router.push(deviceRecoveryPath(device.id))} />
              ) : headerStatusState === "removing" ? (
                <HeaderChip color={headerStatusColor} pulse />
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

        <View style={{ position: "relative" }}>
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
          {manualRefreshInFlight ? <HomeBoardRefreshOverlay activeColor={deviceAccentColor} /> : null}
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <View style={{ alignItems: "stretch", flexDirection: "row" }}>
            <MetricTile label="This week" value={`${currentWeekCompleted}/${device.weeklyTarget}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Weeks" value={habitWeeksTotal ? `${device.successfulWeeksTotal}/${habitWeeksTotal}` : `${device.successfulWeeksTotal}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Recorded" value={`${device.recordedDaysTotal}d`} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <HomeInsightPanel insight={insight} />
          <View
            ref={weeklyTargetAnchorRef}
            collapsable={false}
            onLayout={() => {
              requestAnimationFrame(() => {
                measureWeeklyTargetAnchor();
              });
            }}
            pointerEvents="none"
            style={{ height: 1, opacity: 0 }}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}
