import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, LayoutChangeEvent, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { deviceHistoryPath, deviceRecoveryPath, deviceSettingsPath } from "@/lib/device-routes";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice } from "@/types/addone";

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

  for (let col = 0; col < device.days.length; col += 1) {
    const isPastWeek = col > device.today.weekIndex;
    const isCurrentWeek = col === device.today.weekIndex;
    const visibleRows = isPastWeek ? 7 : isCurrentWeek ? device.today.dayIndex + 1 : 0;

    visibleDays += visibleRows;
    completed += device.days[col].slice(0, visibleRows).filter(Boolean).length;
  }

  return {
    completed,
    fillPercentage: visibleDays === 0 ? 0 : Math.round((completed / visibleDays) * 100),
  };
}

function boardStatus(device: AddOneDevice) {
  if (device.syncState === "offline" || !device.isLive) {
    return {
      color: theme.colors.accentAmber,
      railKey: "offline",
      railMessage: "Offline. Open Recovery to reconnect.",
    };
  }

  return {
    color: theme.colors.accentSuccess,
    railKey: `online-${device.nextResetLabel}`,
    railMessage: `Next reset ${device.nextResetLabel}.`,
  };
}

function boardInsight(device: AddOneDevice, stats: { completed: number; fillPercentage: number }, currentWeekCompleted: number) {
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

function HeaderChip({
  color,
  icon,
  label,
  onPress,
}: {
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      {icon ? <Ionicons color={theme.colors.textSecondary} name={icon} size={16} /> : null}
      {color ? (
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
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeDevice, activeDeviceId, isLoading } = useDevices();
  const { isApplyingToday, toggleToday } = useDeviceActions();
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const pendingBoardEditorOpen = useAppUiStore((state) => state.pendingBoardEditorOpen);
  const clearBoardEditorOpen = useAppUiStore((state) => state.clearBoardEditorOpen);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const [boardStageWidth, setBoardStageWidth] = useState(0);
  const todayActionLockRef = useRef(false);
  const [todayActionInFlight, setTodayActionInFlight] = useState(false);

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

  const palette = useMemo(
    () => (effectiveDevice ? getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette) : null),
    [effectiveDevice],
  );
  const cells = useMemo(() => (effectiveDevice ? buildBoardCells(effectiveDevice) : []), [effectiveDevice]);

  function handleBoardStageLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - boardStageWidth) > 1) {
      setBoardStageWidth(nextWidth);
    }
  }

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
      <ScreenScrollView bottomInset={theme.layout.tabScrollBottom} contentMaxWidth={theme.layout.narrowContentWidth}>
        <ScreenSection style={{ paddingTop: 12 }}>
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
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Connect your device, join its AddOne Wi-Fi, choose the home network, and finish the first settings pass.
            </Text>
          </View>

          <GlassCard style={{ gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Dark, quiet, and ready for the first board.
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              The app will guide setup first, then the main board becomes the daily home base for the device.
            </Text>
          </GlassCard>

          <Pressable
            onPress={() => router.push("/onboarding")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 56,
              borderRadius: theme.radius.sheet,
              backgroundColor: theme.colors.textPrimary,
            }}
          >
            <Text
              style={{
                color: theme.colors.textInverse,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Start setup
            </Text>
          </Pressable>
        </ScreenSection>
      </ScreenScrollView>
    );
  }

  const device = effectiveDevice;
  const stats = visibleBoardStats(device);
  const status = boardStatus(device);
  const todayWeekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const currentWeekCompleted = device.days[device.today.weekIndex]
    .slice(0, device.today.dayIndex + 1)
    .filter(Boolean).length;
  const boardFrameInsetX = 10;
  const boardFrameInsetY = 8;
  const homeBottomInset = theme.layout.tabScrollBottom;
  const contentMinHeight = Math.max(0, height - insets.top - homeBottomInset - theme.layout.scrollTop);
  const homeBoardAvailableWidth = Math.max(0, Math.min((boardStageWidth || width - 40) - boardFrameInsetX * 2, 760));
  const isTodayToggleLocked = todayActionInFlight || activePendingTodayState !== undefined;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;
  const todayState = boardButtonState(device, buttonIsApplying, isTodayToggleLocked);
  const dividerColor = withAlpha(theme.colors.textPrimary, 0.08);
  const insight = boardInsight(device, stats, currentWeekCompleted);

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
              {device.isLive ? (
                <HeaderChip color={status.color} />
              ) : (
                <HeaderChip icon="wifi-outline" label="Recovery" onPress={() => router.push(deviceRecoveryPath(device.id))} />
              )}
              <IconActionPill icon="settings-outline" onPress={() => router.push(deviceSettingsPath(device.id))} />
            </View>
          </View>

          <View style={{ justifyContent: "center", minHeight: 22 }}>
            <Animated.View
              key={status.railKey}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              style={{ alignItems: "center", flexDirection: "row", gap: 8 }}
            >
              <View
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: 4,
                  backgroundColor: status.color,
                  boxShadow: `0px 0px 16px ${withAlpha(status.color, 0.45)}`,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textSecondary,
                  flex: 1,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {status.railMessage}
              </Text>
            </Animated.View>
          </View>
        </View>

        <View style={{ position: "relative", alignItems: "center", justifyContent: "center", paddingTop: 10, paddingBottom: 14 }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 10, right: -8, bottom: 28, left: -8 }}>
            <View
              style={{
                position: "absolute",
                top: 42,
                left: "9%",
                width: "82%",
                height: 80,
                borderRadius: theme.radius.full,
                backgroundColor: withAlpha(theme.colors.accentAmber, 0.18),
                boxShadow: `0px 0px 116px ${withAlpha(theme.colors.accentAmber, 0.29)}`,
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
              <View onLayout={handleBoardStageLayout}>
                <PixelGrid
                  availableWidth={homeBoardAvailableWidth}
                  cells={cells}
                  mode="display"
                  palette={palette}
                  pendingPulse={
                    activePendingTodayState !== undefined
                      ? {
                          col: device.today.weekIndex,
                          row: device.today.dayIndex,
                        }
                      : null
                  }
                  readOnly
                  showFooterHint={false}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
          <View style={{ alignItems: "stretch", flexDirection: "row" }}>
            <MetricTile label="This week" value={`${currentWeekCompleted}/${device.weeklyTarget}`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Recorded" value={`${stats.completed}d`} />
            <View style={{ width: 1, backgroundColor: dividerColor, marginHorizontal: 16 }} />
            <MetricTile label="Visible fill" value={`${stats.fillPercentage}%`} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ height: 1, backgroundColor: dividerColor }} />
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
              {insight.eyebrow}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {insight.message}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 20 }}>
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
            state={todayState}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}
