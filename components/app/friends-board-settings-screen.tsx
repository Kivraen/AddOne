import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FriendsRouteHeader } from "@/components/app/friends-route-header";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useFriends } from "@/hooks/use-friends";
import {
  CELEBRATION_DWELL_OPTIONS,
  CELEBRATION_TRANSITION_SPEED_OPTIONS,
  CELEBRATION_TRANSITION_OPTIONS,
  DEFAULT_CELEBRATION_DWELL_SECONDS,
  DEFAULT_CELEBRATION_TRANSITION_SPEED,
  getCelebrationPreviewPlaybackMs,
  getCelebrationTransitionSpeedOption,
} from "@/lib/celebration-transitions";
import { withAlpha } from "@/lib/color";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { CelebrationTransitionSpeed, CelebrationTransitionStyle, SharedBoard } from "@/types/addone";

function firstNameFromOwnerName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "Friend";
}

function makeBoardTitle(name: string) {
  const firstName = firstNameFromOwnerName(name);
  return firstName.endsWith("s") ? `${firstName}' Board` : `${firstName}'s Board`;
}

function PickerRow(props: {
  disabled?: boolean;
  onPress: () => void;
  title: string;
  value: string;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 44,
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 16,
          lineHeight: 20,
          flex: 1,
          minWidth: 0,
        }}
      >
        {props.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "55%" }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: 14,
            lineHeight: 18,
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {props.value}
        </Text>
        <Ionicons color={theme.colors.textSecondary} name="chevron-down" size={17} />
      </View>
    </Pressable>
  );
}

function TransitionRow(props: {
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={{
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: theme.radius.sheet,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: props.active ? withAlpha(theme.colors.accentAmber, 0.36) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: props.active ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.textPrimary, 0.04),
        opacity: props.disabled ? 0.6 : 1,
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <Text
        style={{
          color: props.active ? theme.colors.accentAmber : theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 14,
          lineHeight: 18,
        }}
      >
        {props.label}
      </Text>
      {props.busy ? (
        <ActivityIndicator color={theme.colors.accentAmber} size="small" />
      ) : props.active ? (
        <Ionicons color={theme.colors.accentAmber} name="checkmark" size={18} />
      ) : null}
    </Pressable>
  );
}

export function FriendsBoardSettingsScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId?: string }>();
  const router = useRouter();
  const { activeDevice } = useDevices();
  const { isPreviewingCelebration, previewCelebration } = useDeviceActions();
  const {
    isLoadingViewerBoards,
    isUpdatingSharedBoardCelebration,
    refreshViewerBoards,
    setSharedBoardCelebrationEnabled,
    sharedBoards,
  } = useFriends();
  const [activeTransitionId, setActiveTransitionId] = useState<CelebrationTransitionStyle | null>(null);
  const [timingUpdateBusy, setTimingUpdateBusy] = useState(false);
  const previewLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const board = useMemo(
    () => sharedBoards.find((item) => item.viewerMembershipId === membershipId) ?? null,
    [membershipId, sharedBoards],
  );

  const speedSummary = board
    ? getCelebrationTransitionSpeedOption(board.celebrationTransitionSpeed ?? DEFAULT_CELEBRATION_TRANSITION_SPEED)
    : null;
  const previewLocked = activeTransitionId !== null || isPreviewingCelebration;
  const interactionLocked = timingUpdateBusy || isUpdatingSharedBoardCelebration || previewLocked;

  useEffect(() => {
    return () => {
      if (previewLockTimeoutRef.current) {
        clearTimeout(previewLockTimeoutRef.current);
      }
    };
  }, []);

  const beginPreviewLock = (
    transitionStyle: CelebrationTransitionStyle,
    transitionSpeed: CelebrationTransitionSpeed,
    dwellSeconds: number,
  ) => {
    if (previewLockTimeoutRef.current) {
      clearTimeout(previewLockTimeoutRef.current);
    }

    setActiveTransitionId(transitionStyle);
    previewLockTimeoutRef.current = setTimeout(() => {
      setActiveTransitionId((current) => (current === transitionStyle ? null : current));
      previewLockTimeoutRef.current = null;
    }, getCelebrationPreviewPlaybackMs(transitionSpeed, dwellSeconds) + 400);
  };

  const clearPreviewLock = () => {
    if (previewLockTimeoutRef.current) {
      clearTimeout(previewLockTimeoutRef.current);
      previewLockTimeoutRef.current = null;
    }
    setActiveTransitionId(null);
  };

  const openSingleSelectMenu = <T extends string | number>(params: {
    onSelect: (value: T) => void;
    options: Array<{ label: string; value: T }>;
    selectedValue: T;
    title: string;
  }) => {
    if (Platform.OS === "ios") {
      const cancelButtonIndex = params.options.length;
      const destructiveButtonIndex = undefined;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: params.title,
          options: [...params.options.map((option) => option.label), "Cancel"],
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex == null || buttonIndex === cancelButtonIndex) {
            return;
          }

          const selected = params.options[buttonIndex];
          if (!selected || selected.value === params.selectedValue) {
            return;
          }

          params.onSelect(selected.value);
        },
      );
      return;
    }

    Alert.alert(
      params.title,
      undefined,
      [
        ...params.options.map((option) => ({
          text: option.label,
          onPress: () => {
            if (option.value !== params.selectedValue) {
              params.onSelect(option.value);
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const previewBoard = async (
    targetBoard: SharedBoard,
    transitionStyle: CelebrationTransitionStyle = targetBoard.celebrationTransition,
    transitionSpeed: CelebrationTransitionSpeed = targetBoard.celebrationTransitionSpeed,
    dwellSeconds: number = targetBoard.celebrationDwellSeconds,
  ) => {
    beginPreviewLock(transitionStyle, transitionSpeed, dwellSeconds);
    try {
      await previewCelebration({
        deviceId: activeDevice?.id,
        boardDays: targetBoard.days,
        dwellSeconds,
        palettePreset: targetBoard.paletteId,
        sourceDeviceId: targetBoard.id,
        transitionSpeed,
        transitionStyle,
        weeklyTarget: targetBoard.weeklyTarget,
      });
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert(
        "Preview failed",
        error instanceof Error ? error.message : "The celebration preview could not be started.",
      );
      clearPreviewLock();
    }
  };

  const savePreferences = async (
    targetBoard: SharedBoard,
    patch: {
      dwellSeconds?: number;
      enabled?: boolean;
      transition?: CelebrationTransitionStyle;
      transitionSpeed?: CelebrationTransitionSpeed;
    },
  ) => {
    await setSharedBoardCelebrationEnabled({
      deviceId: targetBoard.id,
      dwellSeconds: patch.dwellSeconds,
      enabled: patch.enabled,
      membershipId: targetBoard.viewerMembershipId,
      transition: patch.transition,
      transitionSpeed: patch.transitionSpeed,
    });
  };

  const updateCelebrationEnabled = async (targetBoard: SharedBoard, enabled: boolean) => {
    try {
      await savePreferences(targetBoard, { enabled });
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert(
        "Couldn't update board reveal",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const updateTransition = async (targetBoard: SharedBoard, transitionStyle: CelebrationTransitionStyle) => {
    try {
      await savePreferences(targetBoard, { transition: transitionStyle });
      await previewBoard(targetBoard, transitionStyle, targetBoard.celebrationTransitionSpeed, targetBoard.celebrationDwellSeconds);
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert(
        "Couldn't save transition",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const updateTiming = async (
    targetBoard: SharedBoard,
    patch: {
      dwellSeconds?: number;
      transitionSpeed?: CelebrationTransitionSpeed;
    },
  ) => {
    setTimingUpdateBusy(true);
    try {
      await savePreferences(targetBoard, patch);
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert(
        "Couldn't save timing",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setTimingUpdateBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: board ? makeBoardTitle(board.ownerName) : "Board reveal",
          headerShown: Platform.OS !== "android",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
          headerLeft: () => (
            <Pressable
              hitSlop={10}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace("/friends-arrange");
              }}
              disabled={interactionLocked}
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 32,
                minWidth: 28,
                marginLeft: -4,
                opacity: interactionLocked ? 0.45 : 1,
                paddingRight: 2,
              }}
            >
              <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView edges={Platform.OS === "android" ? undefined : ["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            gap: 18,
            paddingBottom: theme.layout.scrollBottom,
            paddingHorizontal: theme.layout.pagePadding,
            paddingTop: Platform.OS === "android" ? theme.layout.scrollTop : 12,
          }}
          style={{ flex: 1, backgroundColor: theme.colors.bgBase }}
        >
          {Platform.OS === "android" ? (
            <FriendsRouteHeader
              onBack={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace("/friends-arrange");
              }}
              title={board ? makeBoardTitle(board.ownerName) : "Board reveal"}
            />
          ) : null}
          {isLoadingViewerBoards && !board ? (
          <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
            <ActivityIndicator color={theme.colors.accentAmber} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Loading board settings…
            </Text>
          </GlassCard>
          ) : null}

        {!isLoadingViewerBoards && !board ? (
          <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: 18,
                lineHeight: 22,
              }}
            >
              This board is no longer available.
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Refresh the list or go back to Manage boards.
            </Text>
            <Pressable
              onPress={() => {
                void refreshViewerBoards();
              }}
              style={{
                minHeight: 46,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.sheet,
                backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
              }}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: 18,
                  lineHeight: 22,
                }}
              >
                Refresh
              </Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {board ? (
          <>
            <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: 16,
                      lineHeight: 20,
                    }}
                  >
                    Board reveal
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Show this board when {firstNameFromOwnerName(board.ownerName)} checks in.
                  </Text>
                </View>
                <Switch
                  disabled={interactionLocked}
                  onValueChange={(value) => {
                    void updateCelebrationEnabled(board, value);
                  }}
                  trackColor={{
                    false: withAlpha(theme.colors.textPrimary, 0.12),
                    true: withAlpha(theme.colors.accentAmber, 0.3),
                  }}
                  thumbColor={board.celebrationEnabled ? theme.colors.accentAmber : theme.colors.textPrimary}
                  value={board.celebrationEnabled}
                />
              </View>
            </GlassCard>

            <GlassCard style={{ gap: 8, paddingHorizontal: 18, paddingVertical: 16 }}>
              <PickerRow
                disabled={interactionLocked}
                onPress={() =>
                  openSingleSelectMenu({
                    title: "Speed",
                    selectedValue: board.celebrationTransitionSpeed,
                    options: CELEBRATION_TRANSITION_SPEED_OPTIONS.map((option) => ({
                      label: option.label,
                      value: option.id,
                    })),
                    onSelect: (value) => {
                      void updateTiming(board, { transitionSpeed: value as CelebrationTransitionSpeed });
                    },
                  })
                }
                title="Speed"
                value={speedSummary?.label ?? "Balanced"}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: withAlpha(theme.colors.textPrimary, 0.06),
                }}
              />

              <PickerRow
                disabled={interactionLocked}
                onPress={() =>
                  openSingleSelectMenu({
                    title: "Visible hold",
                    selectedValue: board.celebrationDwellSeconds,
                    options: CELEBRATION_DWELL_OPTIONS.map((option) => ({
                      label: option.label,
                      value: option.seconds,
                    })),
                    onSelect: (value) => {
                      void updateTiming(board, { dwellSeconds: Number(value) });
                    },
                  })
                }
                title="Visible hold"
                value={`${board.celebrationDwellSeconds ?? DEFAULT_CELEBRATION_DWELL_SECONDS}s`}
              />
            </GlassCard>

            <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 16 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: 16,
                  lineHeight: 20,
                }}
              >
                Transition
              </Text>
              <View style={{ gap: 8 }}>
                {CELEBRATION_TRANSITION_OPTIONS.map((option) => (
                  <TransitionRow
                    key={option.id}
                    active={board.celebrationTransition === option.id}
                    busy={activeTransitionId === option.id}
                    disabled={interactionLocked}
                    label={option.label}
                    onPress={() => {
                      void updateTransition(board, option.id);
                    }}
                  />
                ))}
              </View>
            </GlassCard>
          </>
        ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
