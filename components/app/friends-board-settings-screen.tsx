import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useFriends } from "@/hooks/use-friends";
import {
  CELEBRATION_TRANSITION_OPTIONS,
  DEFAULT_CELEBRATION_TRANSITION,
  getCelebrationTransitionOption,
} from "@/lib/celebration-transitions";
import { withAlpha } from "@/lib/color";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { CelebrationTransitionStyle, SharedBoard } from "@/types/addone";

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
  const board = useMemo(
    () => sharedBoards.find((item) => item.viewerMembershipId === membershipId) ?? null,
    [membershipId, sharedBoards],
  );

  const transitionSummary = board
    ? getCelebrationTransitionOption(board.celebrationTransition ?? DEFAULT_CELEBRATION_TRANSITION)
    : null;

  const previewBoard = async (targetBoard: SharedBoard, transitionStyle: CelebrationTransitionStyle) => {
    setActiveTransitionId(transitionStyle);
    try {
      await previewCelebration({
        deviceId: activeDevice?.id,
        boardDays: targetBoard.days,
        palettePreset: targetBoard.paletteId,
        sourceDeviceId: targetBoard.id,
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

  const updateCelebrationEnabled = async (targetBoard: SharedBoard, enabled: boolean) => {
    try {
      await setSharedBoardCelebrationEnabled({
        deviceId: targetBoard.id,
        enabled,
        membershipId: targetBoard.viewerMembershipId,
      });
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
    setActiveTransitionId(transitionStyle);
    try {
      await setSharedBoardCelebrationEnabled({
        deviceId: targetBoard.id,
        membershipId: targetBoard.viewerMembershipId,
        transition: transitionStyle,
      });
      await previewBoard(targetBoard, transitionStyle);
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert(
        "Couldn't save transition",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setActiveTransitionId((current) => (current === transitionStyle ? null : current));
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
                    If this is on, your board briefly plays {board.ownerName}&apos;s check-in when they finish today.
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
              <Text
                style={{
                  color: theme.colors.textTertiary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Current transition: {transitionSummary?.label ?? "Blade sweep"}
              </Text>
            </GlassCard>

            <View style={{ gap: 10 }}>
              {CELEBRATION_TRANSITION_OPTIONS.map((option) => {
                const isSelected = board.celebrationTransition === option.id;
                const isBusy = activeTransitionId === option.id && (isPreviewingCelebration || isUpdatingSharedBoardCelebration);
                return (
                  <Pressable
                    key={option.id}
                    disabled={isUpdatingSharedBoardCelebration || isPreviewingCelebration}
                    onPress={() => {
                      void updateTransition(board, option.id);
                    }}
                    style={{
                      opacity: isUpdatingSharedBoardCelebration || isPreviewingCelebration ? 0.7 : 1,
                    }}
                  >
                    <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 18 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Ionicons
                          color={isSelected ? theme.colors.accentAmber : theme.colors.textSecondary}
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={22}
                        />
                        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <Text
                            style={{
                              color: theme.colors.textPrimary,
                              fontFamily: theme.typography.label.fontFamily,
                              fontSize: 17,
                              lineHeight: 22,
                            }}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.textSecondary,
                              fontFamily: theme.typography.body.fontFamily,
                              fontSize: theme.typography.body.fontSize,
                              lineHeight: theme.typography.body.lineHeight,
                            }}
                          >
                            {option.description}
                          </Text>
                        </View>
                        {isBusy ? <ActivityIndicator color={theme.colors.accentAmber} /> : null}
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Tapping a transition saves it for this board and plays a preview on your current device if that device is online.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
