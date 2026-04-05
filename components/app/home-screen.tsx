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
  Easing,
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
import { DEVICE_HEARTBEAT_INTERVAL_MS, latestConnectionActivityAt } from "@/lib/device-connection";
import { resolveDeviceHistoryView } from "@/lib/device-history-view";
import { isDevicePendingRemoval } from "@/lib/device-removal";
import { isDeviceControlReady, isDeviceRecovering, needsDeviceRecovery } from "@/lib/device-recovery";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsPath } from "@/lib/device-routes";
import { homeMinimumGoalLabel } from "@/lib/habit-details";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { formatWeekdayFromLocalDate } from "@/lib/runtime-board-projection";
import { useAppUiStore } from "@/store/app-ui-store";
import { useDeviceHistorySyncStore } from "@/store/device-history-sync-store";
import { AddOneDevice, DeviceHistoryFreshnessState } from "@/types/addone";

const HOME_INSIGHT_MAX_LINES = 3;
const HOME_INSIGHT_PANEL_HEIGHT = theme.typography.micro.lineHeight + theme.typography.body.lineHeight * HOME_INSIGHT_MAX_LINES + 18;
const CLAIMED_SESSION_DEVICE_GRACE_MS = 15_000;
const HOME_PRIMARY_ACTION_SIZE = 156;
const HOME_PRIMARY_ACTION_TOP_GAP = 72;
const HOME_PULL_REFRESH_TRIGGER = 84;

type HomeHeaderConnectionState = "online" | "verifying-board" | "recovering" | "needs-recovery" | "checking-connection" | "offline" | "removing";
type HomeInsight = { eyebrow: string; message: string };

function headerConnectionState(
  device: AddOneDevice,
  freshnessState: DeviceHistoryFreshnessState,
): HomeHeaderConnectionState {
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

  return freshnessState === "fully_settled" ? "online" : "verifying-board";
}

function boardButtonState(
  device: AddOneDevice,
  options?: {
    isApplyingToday?: boolean;
    isAwaitingMirror?: boolean;
    isLocked?: boolean;
  },
): PrimaryActionState {
  if (options?.isApplyingToday || options?.isLocked) {
    return "syncing";
  }

  if (options?.isAwaitingMirror) {
    return "pendingSync";
  }

  if (!isDeviceControlReady(device)) {
    return "disabled";
  }

  return device.days[device.today.weekIndex][device.today.dayIndex] ? "done" : "notDone";
}

function boardInsight(device: AddOneDevice, fillPercentage: number, remainingThisWeek: number): HomeInsight {
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
      message: `One more check-in reaches this week's target. Visible fill is currently ${fillPercentage}%.`,
    };
  }

  return {
    eyebrow: "This week",
    message: `${remainingThisWeek} more check-ins reaches the weekly target. The board is currently ${fillPercentage}% filled.`,
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
      <MetricValueText value={value} />
    </View>
  );
}

function MetricValueText({ value }: { value: string }) {
  return (
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
  );
}

function insightSectionTitle(insight: HomeInsight) {
  if (insight.eyebrow === "Weekly target" || insight.eyebrow === "This week") {
    return "This week";
  }

  return insight.eyebrow;
}

function HomeInsightMessage({ message }: { message: string }) {
  return (
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
      {message}
    </Text>
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
  return (
    <View
      style={{
        height: HOME_INSIGHT_PANEL_HEIGHT,
        gap: 6,
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
        {insightSectionTitle(insight)}
      </Text>
      <View
        style={{
          flex: 1,
        }}
      >
        <HomeInsightMessage message={insight.message} />
      </View>
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
  tone = "default",
}: {
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label?: string;
  onPress?: () => void;
  pulse?: boolean;
  tone?: "accent" | "default";
}) {
  const isAccentTone = tone === "accent";
  const resolvedIconColor = iconColor ?? (isAccentTone ? theme.colors.accentAmber : theme.colors.textSecondary);
  const resolvedLabelColor = isAccentTone ? theme.colors.accentAmber : theme.colors.textPrimary;
  const chipBorderColor = isAccentTone ? withAlpha(theme.colors.accentAmber, 0.24) : theme.materials.panel.border;
  const chipBackgroundColor = isAccentTone ? withAlpha(theme.colors.accentAmber, 0.12) : withAlpha(theme.colors.bgBase, 0.22);
  const chipShadow = isAccentTone ? `0px 10px 24px ${withAlpha(theme.colors.accentAmber, 0.14)}` : undefined;
  const content = (
    <>
      {icon ? <Ionicons color={resolvedIconColor} name={icon} size={16} /> : null}
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
            color: resolvedLabelColor,
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
          borderColor: chipBorderColor,
          backgroundColor: chipBackgroundColor,
          boxShadow: chipShadow,
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
        borderColor: chipBorderColor,
        backgroundColor: chipBackgroundColor,
        boxShadow: chipShadow,
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
  const pendingMirrorByDevice = useDeviceHistorySyncStore((state) => state.pendingMirrorByDevice);
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const pendingBoardEditorOpen = useAppUiStore((state) => state.pendingBoardEditorOpen);
  const clearBoardEditorOpen = useAppUiStore((state) => state.clearBoardEditorOpen);
  const activePendingMirror = activeDeviceId ? pendingMirrorByDevice[activeDeviceId] : undefined;
  const activePendingTodayEntry = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const activePendingTodayState = activePendingTodayEntry?.isDone;
  const activePendingTodayPhase = activePendingTodayEntry?.phase ?? null;
  const todayActionLockRef = useRef(false);
  const [todayActionInFlight, setTodayActionInFlight] = useState(false);
  const [manualRefreshInFlight, setManualRefreshInFlight] = useState(false);
  const [staleRefreshInFlight, setStaleRefreshInFlight] = useState(false);
  const staleRefreshKeyRef = useRef<string | null>(null);
  const reachabilityProbeKeyRef = useRef<string | null>(null);
  const pullRefreshDistanceRef = useRef(0);

  useEffect(() => {
    if (!pendingBoardEditorOpen || !activeDevice || !isDeviceControlReady(activeDevice)) {
      return;
    }

    clearBoardEditorOpen();
    router.push(deviceHistoryPath(activeDevice.id));
  }, [activeDevice, clearBoardEditorOpen, pendingBoardEditorOpen, router]);

  const historyView = useMemo(() => {
    if (!activeDevice) {
      return null;
    }

    return resolveDeviceHistoryView(activeDevice, {
      pendingMirror: activePendingMirror,
      pendingTodayState: activePendingTodayState,
    });
  }, [activeDevice, activePendingMirror, activePendingTodayState]);
  const effectiveDevice = historyView?.device ?? null;
  const headerStatusState = effectiveDevice
    ? headerConnectionState(effectiveDevice, historyView?.freshnessState ?? "fully_settled")
    : null;
  const claimedSessionIsFresh = useMemo(() => {
    if (onboardingSession?.status !== "claimed" || !onboardingSession.claimedAt) {
      return false;
    }

    const claimedAtMs = new Date(onboardingSession.claimedAt).getTime();
    return Number.isFinite(claimedAtMs) && Date.now() - claimedAtMs < CLAIMED_SESSION_DEVICE_GRACE_MS;
  }, [onboardingSession?.claimedAt, onboardingSession?.status]);
  const fallbackBottomPadding = 32;
  const primaryActionBottomPadding = fallbackBottomPadding;
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
    if (
      !activeDevice ||
      !isDeviceControlReady(activeDevice) ||
      headerStatusState !== "checking-connection" ||
      manualRefreshInFlight ||
      staleRefreshInFlight
    ) {
      reachabilityProbeKeyRef.current = null;
      return;
    }

    const lastActivityAt = latestConnectionActivityAt(activeDevice);
    if (!lastActivityAt || Date.now() - lastActivityAt < DEVICE_HEARTBEAT_INTERVAL_MS) {
      reachabilityProbeKeyRef.current = null;
      return;
    }

    const probeKey = `${activeDevice.id}:${activeDevice.lastSeenAt ?? ""}:${activeDevice.lastSyncAt ?? ""}:${activeDevice.lastSnapshotAt ?? ""}`;
    if (reachabilityProbeKeyRef.current === probeKey) {
      return;
    }

    reachabilityProbeKeyRef.current = probeKey;

    void refreshRuntimeSnapshot(activeDevice.id, {
      errorMessage: "The board did not answer the connection check in time.",
      timeoutMs: 6_500,
    }).catch((error) => {
      console.warn("Failed to confirm device reachability from home", error);
    });
  }, [
    activeDevice,
    headerStatusState,
    manualRefreshInFlight,
    refreshRuntimeSnapshot,
    staleRefreshInFlight,
  ]);

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
        probeDevice.recoveryState === "ready"
      ) {
        try {
          await refreshRuntimeSnapshot(probeDevice.id, {
            connectivityIssuePhase: "confirmed",
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
          <Pressable
            onPress={() => {
              clearLocalOnboardingSession();
              router.push("/onboarding?auto=1");
            }}
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
        </View>
      </ScreenScrollView>
    );
  }

  const device = effectiveDevice;
  const todayWeekday = formatWeekdayFromLocalDate(device.logicalToday);
  const currentWeekCompleted = historyView?.currentWeekCompleted ?? 0;
  const currentWeekTarget = historyView?.currentWeekTarget ?? device.weeklyTarget;
  const habitWeeksTotal = historyView?.habitWeeksTotal ?? null;
  const isTodayAwaitingMirror = activePendingTodayPhase === "confirmed";
  const isTodayAwaitingDeviceConfirmation = activePendingTodayState !== undefined && !isTodayAwaitingMirror;
  const isTodayToggleLocked = staleRefreshInFlight || todayActionInFlight || activePendingTodayState !== undefined;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;
  const todayState = boardButtonState(device, {
    isApplyingToday: buttonIsApplying || isTodayAwaitingDeviceConfirmation,
    isAwaitingMirror: isTodayAwaitingMirror,
    isLocked: staleRefreshInFlight || todayActionInFlight,
  });
  const dividerColor = withAlpha(theme.colors.textPrimary, 0.08);
  const remainingThisWeek = Math.max(currentWeekTarget - currentWeekCompleted, 0);
  const insight = boardInsight(device, historyView?.visibleFillPercentage ?? 0, remainingThisWeek);
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
                <HeaderChip
                  icon="wifi-outline"
                  label="Recovery"
                  onPress={() => router.push(deviceRecoveryPath(device.id))}
                  tone="accent"
                />
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
            ) : null}
          </View>
        </View>

        <View style={{ position: "relative" }}>
          <DeviceBoardStage
            accentColor={theme.colors.accentAmber}
            cells={cells}
            palette={palette}
            pendingPulse={null}
          />
          {manualRefreshInFlight ? <HomeBoardRefreshOverlay activeColor={deviceAccentColor} /> : null}
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <View style={{ alignItems: "stretch", flexDirection: "row" }}>
            <MetricTile label="This week" value={`${currentWeekCompleted}/${currentWeekTarget}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile
              label="Weeks"
              value={
                habitWeeksTotal
                  ? `${historyView?.successfulWeeksTotal ?? device.successfulWeeksTotal}/${habitWeeksTotal}`
                  : `${historyView?.successfulWeeksTotal ?? device.successfulWeeksTotal}`
              }
            />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Recorded" value={`${historyView?.recordedDaysTotal ?? device.recordedDaysTotal}d`} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <HomeInsightPanel insight={insight} />
        </View>
      </View>
    </ScreenScrollView>
  );
}
