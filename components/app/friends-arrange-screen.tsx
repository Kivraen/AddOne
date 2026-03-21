import { Ionicons } from "@expo/vector-icons";
import DragList, { DragListRenderItemInfo } from "react-native-draglist";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useFriends } from "@/hooks/use-friends";
import { useFriendsBoardOrder } from "@/hooks/use-friends-board-order";
import { withAlpha } from "@/lib/color";
import { SharedBoard } from "@/types/addone";

function emptyBoardDays() {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false));
}

function makePreviewBoard(
  id: string,
  ownerName: string,
  habitName: string,
  paletteId: string,
  marks: number[][],
): SharedBoard {
  const days = emptyBoardDays();
  marks.forEach((weekMarks, weekIndex) => {
    weekMarks.forEach((dayIndex) => {
      if (days[weekIndex]?.[dayIndex] !== undefined) {
        days[weekIndex][dayIndex] = true;
      }
    });
  });

  return {
    id,
    ownerName,
    habitName,
    syncState: "online",
    lastSnapshotAt: new Date().toISOString(),
    weeklyTarget: 4,
    paletteId,
    days,
    dateGrid: undefined,
    logicalToday: new Date().toISOString().slice(0, 10),
    today: {
      weekIndex: 0,
      dayIndex: 4,
    },
  };
}

function previewBoards(): SharedBoard[] {
  return [
    makePreviewBoard(
      "preview-amber",
      "Alexandria Montgomery-Winters",
      "Night Run",
      "amber",
      [[0, 2, 4], [1, 3, 5], [0, 1, 2, 4], [0, 2], [1, 2, 4]],
    ),
    makePreviewBoard("preview-ice", "Riley Hart", "Gymium", "ice", [[1, 2, 3], [0, 2], [1, 3, 5], [1, 2, 4], [2, 4]]),
    makePreviewBoard("preview-geek", "Avery Stone", "Deep Work", "geek", [[0, 1], [2, 4], [0, 2, 4], [1, 3], [2]]),
  ];
}

function moveBoard<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function ArrangeRow(props: DragListRenderItemInfo<SharedBoard>) {
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
        opacity: isActive ? 0.92 : 1,
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

        <Pressable
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
          }}
        >
          <Ionicons color={theme.colors.textSecondary} name="reorder-three-outline" size={20} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

export function FriendsArrangeScreen() {
  const router = useRouter();
  const { isLoadingSharedBoards, sharedBoards, sharedBoardsError } = useFriends();
  const previewOnlyBoards = useMemo(() => previewBoards(), []);
  const { orderedBoards, saveBoardOrder } = useFriendsBoardOrder(sharedBoards.length > 0 ? sharedBoards : previewOnlyBoards);
  const data = useMemo(() => orderedBoards, [orderedBoards]);
  const listHeader = (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
        marginBottom: 14,
      }}
    >
      Press and drag names into the order you want.
    </Text>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Arrange boards",
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
        {isLoadingSharedBoards ? (
          <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Loading boards…
            </Text>
          </GlassCard>
        ) : null}

        {!isLoadingSharedBoards && sharedBoardsError ? (
          <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text
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

        {!isLoadingSharedBoards && !sharedBoardsError && data.length > 0 ? (
          <DragList
            data={data}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            onReordered={async (fromIndex, toIndex) => {
              const nextData = moveBoard(data, fromIndex, toIndex);
              await saveBoardOrder(nextData.map((board) => board.id));
            }}
            renderItem={(info) => <ArrangeRow {...info} />}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
        </View>
      </SafeAreaView>
    </>
  );
}
