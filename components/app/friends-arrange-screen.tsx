import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import DragList, { DragListRenderItemInfo } from "react-native-draglist";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useFriends } from "@/hooks/use-friends";
import { useFriendsBoardOrder } from "@/hooks/use-friends-board-order";
import { useIsMountedRef } from "@/hooks/use-is-mounted-ref";
import { withAlpha } from "@/lib/color";
import { shouldHoldFriendsEmptyState } from "@/lib/friends-state";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { SharedBoard } from "@/types/addone";

function moveBoard<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function ManageRow(props: DragListRenderItemInfo<SharedBoard> & { busy: boolean; onRemove: (board: SharedBoard) => void }) {
  const { item: board, isActive, onDragEnd, onDragStart } = props;
  const initials =
    board.ownerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A";

  return (
    <GlassCard
      style={{
        marginBottom: 10,
        opacity: isActive || props.busy ? 0.92 : 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 46,
            height: 46,
            borderRadius: theme.radius.full,
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
            {initials}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 16,
              lineHeight: 20,
            }}
          >
            {board.ownerName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {board.habitName}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            disabled={props.busy}
            hitSlop={10}
            onPress={() => props.onRemove(board)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: theme.radius.full,
              backgroundColor: withAlpha(theme.colors.statusErrorMuted, 0.12),
              opacity: props.busy ? 0.6 : 1,
            }}
          >
            {props.busy ? (
              <ActivityIndicator color={theme.colors.statusErrorMuted} />
            ) : (
              <Ionicons color={theme.colors.statusErrorMuted} name="trash-outline" size={18} />
            )}
          </Pressable>
          <Pressable
            disabled={props.busy}
            hitSlop={10}
            onPressIn={onDragStart}
            onPressOut={onDragEnd}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: theme.radius.full,
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
              opacity: props.busy ? 0.6 : 1,
            }}
          >
            <Ionicons color={theme.colors.textSecondary} name="reorder-three-outline" size={20} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

export function FriendsArrangeScreen() {
  const router = useRouter();
  const isMountedRef = useIsMountedRef();
  const {
    hasLoadedViewerBoards,
    isFetchingViewerBoards,
    isLeavingSharedBoard,
    isLoadingViewerBoards,
    leaveSharedBoard,
    refreshViewerBoards,
    sharedBoards,
    sharedBoardsError,
  } = useFriends();
  const { orderedBoards, saveBoardOrder } = useFriendsBoardOrder(sharedBoards);
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const data = useMemo(() => orderedBoards, [orderedBoards]);
  const showLoadingState = shouldHoldFriendsEmptyState({
    hasLoadedOnce: hasLoadedViewerBoards,
    isFetching: isLoadingViewerBoards || isFetchingViewerBoards,
    itemCount: data.length,
  });
  const hasBoards = data.length > 0;
  const showErrorCard = !showLoadingState && !hasBoards && sharedBoardsError;
  const showErrorBanner = !showLoadingState && hasBoards && sharedBoardsError;
  const listHeader = (
    <View style={{ gap: 10, marginBottom: 14 }}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        Drag to reorder shared boards or remove one from your account.
      </Text>
      {showErrorBanner ? (
        <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
          <Text
            selectable
            style={{
              color: theme.colors.statusErrorMuted,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {sharedBoardsError instanceof Error ? sharedBoardsError.message : "We couldn't refresh every board right now."}
          </Text>
        </GlassCard>
      ) : null}
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      void refreshViewerBoards();
    }, [refreshViewerBoards]),
  );

  const confirmRemove = useCallback(
    (board: SharedBoard) => {
      Alert.alert("Remove shared board?", `Remove ${board.ownerName}'s board from this account?`, [
        {
          style: "cancel",
          text: "Cancel",
        },
        {
          style: "destructive",
          text: "Remove",
          onPress: () => {
            void (async () => {
              setActiveMembershipId(board.viewerMembershipId);

              try {
                await leaveSharedBoard({
                  deviceId: board.id,
                  membershipId: board.viewerMembershipId,
                });
                triggerPrimaryActionSuccessHaptic();
              } catch (error) {
                triggerPrimaryActionFailureHaptic();
                Alert.alert(
                  "Couldn't remove board",
                  error instanceof Error ? error.message : "Try again.",
                );
              } finally {
                if (isMountedRef.current) {
                  setActiveMembershipId(null);
                }
              }
            })();
          },
        },
      ]);
    },
    [isMountedRef, leaveSharedBoard],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Manage boards",
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

                router.replace("/friends");
              }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 32,
                minWidth: 28,
                marginLeft: -4,
                paddingRight: 2,
              }}
            >
              <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.layout.pagePadding,
            paddingTop: 8,
            paddingBottom: theme.layout.scrollBottom,
          }}
        >
          {showLoadingState ? (
            <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
              <ActivityIndicator color={theme.colors.accentAmber} />
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Loading shared boards…
              </Text>
            </GlassCard>
          ) : null}

          {showErrorCard ? (
            <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <Text
                selectable
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {sharedBoardsError instanceof Error ? sharedBoardsError.message : "We couldn't load boards right now."}
              </Text>
            </GlassCard>
          ) : null}

          {!showLoadingState && hasBoards ? (
            <DragList
              data={data}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={listHeader}
              onReordered={async (fromIndex, toIndex) => {
                const nextData = moveBoard(data, fromIndex, toIndex);
                await saveBoardOrder(nextData.map((board) => board.id));
              }}
              renderItem={(info) => (
                <ManageRow
                  {...info}
                  busy={isLeavingSharedBoard && activeMembershipId === info.item.viewerMembershipId}
                  onRemove={confirmRemove}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : null}

          {!showLoadingState && !showErrorCard && !hasBoards ? (
            <GlassCard style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 16 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: 15,
                  lineHeight: 20,
                }}
              >
                No shared boards yet
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Approved boards will appear here after you connect to someone&apos;s code.
              </Text>
            </GlassCard>
          ) : null}
        </View>
      </SafeAreaView>
    </>
  );
}
