import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useFriends } from "@/hooks/use-friends";
import {
  CELEBRATION_DWELL_OPTIONS,
  CELEBRATION_TRANSITION_SPEED_OPTIONS,
  CELEBRATION_TRANSITION_OPTIONS,
  DEFAULT_CELEBRATION_DWELL_SECONDS,
  DEFAULT_CELEBRATION_TRANSITION,
  DEFAULT_CELEBRATION_TRANSITION_SPEED,
  getCelebrationTransitionSpeedOption,
  getCelebrationTransitionOption,
} from "@/lib/celebration-transitions";
import { withAlpha } from "@/lib/color";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { CelebrationTransitionSpeed, CelebrationTransitionStyle, SharedBoard } from "@/types/addone";

type ExpandedSection = "dwell" | "speed" | "transition" | null;

function BoardIdentityCard({ board }: { board: SharedBoard }) {
  return (
    <GlassCard style={{ gap: 6, paddingHorizontal: 18, paddingVertical: 18 }}>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 19,
          lineHeight: 24,
        }}
      >
        {board.ownerName}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        {board.habitName}
      </Text>
    </GlassCard>
  );
}

function SelectorRow(props: {
  expanded: boolean;
  onPress: () => void;
  summary: string;
  title: string;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: 16,
            lineHeight: 20,
          }}
        >
          {props.title}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: 14,
            lineHeight: 18,
          }}
        >
          {props.summary}
        </Text>
      </View>
      <Ionicons
        color={theme.colors.textSecondary}
        name={props.expanded ? "chevron-up-outline" : "chevron-down-outline"}
        size={18}
      />
    </Pressable>
  );
}

function OptionChip(props: {
  active?: boolean;
  busy?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={props.busy}
      onPress={props.onPress}
      style={{
        minWidth: 88,
        borderRadius: theme.radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: props.active ? withAlpha(theme.colors.accentAmber, 0.36) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: props.active ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.textPrimary, 0.04),
        opacity: props.busy ? 0.6 : 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          color: props.active ? theme.colors.accentAmber : theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 14,
          lineHeight: 18,
          textAlign: "center",
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

export function FriendsBoardSettingsScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId?: string }>();
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
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [timingUpdateBusy, setTimingUpdateBusy] = useState(false);

  const board = useMemo(
    () => sharedBoards.find((item) => item.viewerMembershipId === membershipId) ?? null,
    [membershipId, sharedBoards],
  );

  const transitionSummary = board
    ? getCelebrationTransitionOption(board.celebrationTransition ?? DEFAULT_CELEBRATION_TRANSITION)
    : null;
  const speedSummary = board
    ? getCelebrationTransitionSpeedOption(board.celebrationTransitionSpeed ?? DEFAULT_CELEBRATION_TRANSITION_SPEED)
    : null;
  const timingBusy = timingUpdateBusy || isUpdatingSharedBoardCelebration || isPreviewingCelebration;

  const previewBoard = async (
    targetBoard: SharedBoard,
    transitionStyle: CelebrationTransitionStyle = targetBoard.celebrationTransition,
    transitionSpeed: CelebrationTransitionSpeed = targetBoard.celebrationTransitionSpeed,
    dwellSeconds: number = targetBoard.celebrationDwellSeconds,
  ) => {
    setActiveTransitionId(transitionStyle);
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
    } finally {
      setActiveTransitionId((current) => (current === transitionStyle ? null : current));
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
          title: board ? board.ownerName : "Board reveal",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: theme.layout.scrollBottom,
          paddingHorizontal: theme.layout.pagePadding,
          paddingTop: 12,
        }}
        style={{ flex: 1, backgroundColor: theme.colors.bgBase }}
      >
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
            <BoardIdentityCard board={board} />

            <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: 17,
                      lineHeight: 22,
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
                    If this is on, your board can briefly show {board.ownerName}&apos;s check-in when they finish today.
                  </Text>
                </View>
                <Switch
                  disabled={isUpdatingSharedBoardCelebration}
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

            <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
              <SelectorRow
                expanded={expandedSection === "transition"}
                onPress={() => setExpandedSection((current) => (current === "transition" ? null : "transition"))}
                summary={transitionSummary?.label ?? "Blade sweep"}
                title="Transition"
              />
              {expandedSection === "transition" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {CELEBRATION_TRANSITION_OPTIONS.map((option) => (
                    <OptionChip
                      key={option.id}
                      active={board.celebrationTransition === option.id}
                      busy={timingBusy}
                      label={option.label}
                      onPress={() => {
                        void updateTransition(board, option.id);
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
              <SelectorRow
                expanded={expandedSection === "speed"}
                onPress={() => setExpandedSection((current) => (current === "speed" ? null : "speed"))}
                summary={speedSummary?.label ?? "Balanced"}
                title="Speed"
              />
              {expandedSection === "speed" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {CELEBRATION_TRANSITION_SPEED_OPTIONS.map((option) => (
                    <OptionChip
                      key={option.id}
                      active={board.celebrationTransitionSpeed === option.id}
                      busy={timingBusy}
                      label={option.label}
                      onPress={() => {
                        void updateTiming(board, { transitionSpeed: option.id });
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
              <SelectorRow
                expanded={expandedSection === "dwell"}
                onPress={() => setExpandedSection((current) => (current === "dwell" ? null : "dwell"))}
                summary={`${board.celebrationDwellSeconds ?? DEFAULT_CELEBRATION_DWELL_SECONDS}s`}
                title="Visible hold"
              />
              {expandedSection === "dwell" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {CELEBRATION_DWELL_OPTIONS.map((option) => (
                    <OptionChip
                      key={option.seconds}
                      active={board.celebrationDwellSeconds === option.seconds}
                      busy={timingBusy}
                      label={option.label}
                      onPress={() => {
                        void updateTiming(board, { dwellSeconds: option.seconds });
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </GlassCard>

            <Pressable
              disabled={isPreviewingCelebration}
              onPress={() => {
                void previewBoard(board);
              }}
              style={{
                minHeight: 50,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.sheet,
                borderCurve: "continuous",
                backgroundColor: isPreviewingCelebration ? withAlpha(theme.colors.textPrimary, 0.12) : theme.colors.textPrimary,
                opacity: isPreviewingCelebration ? 0.72 : 1,
                paddingHorizontal: 18,
              }}
            >
              {isPreviewingCelebration ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text
                  style={{
                    color: theme.colors.textInverse,
                    fontFamily: theme.typography.label.fontFamily,
                    fontSize: 18,
                    lineHeight: 22,
                  }}
                >
                  Preview current reveal
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
