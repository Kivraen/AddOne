import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { SharedBoard } from "@/types/addone";

const FRIENDS_BOARD_ORDER_KEY = "addone:friends-board-order";

function sortBoardsByOrder(boards: SharedBoard[], orderedIds: string[]) {
  if (orderedIds.length === 0) {
    return boards;
  }

  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...boards].sort((left, right) => {
    const leftIndex = orderMap.get(left.id);
    const rightIndex = orderMap.get(right.id);

    if (leftIndex === undefined && rightIndex === undefined) {
      return 0;
    }
    if (leftIndex === undefined) {
      return 1;
    }
    if (rightIndex === undefined) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

export function useFriendsBoardOrder(boards: SharedBoard[]) {
  const { mode, user } = useAuth();
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const storageKey = `${FRIENDS_BOARD_ORDER_KEY}:${mode === "demo" ? "demo" : user?.id ?? "guest"}`;

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (cancelled || !value) {
          return;
        }

        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setOrderedIds(parsed.filter((entry): entry is string => typeof entry === "string"));
          }
        } catch {
          // Ignore malformed local ordering and fall back to natural order.
        }
      })
      .catch(() => {
        // Ignore local persistence failures and keep natural order.
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const orderedBoards = useMemo(() => sortBoardsByOrder(boards, orderedIds), [boards, orderedIds]);

  useEffect(() => {
    const visibleIds = new Set(boards.map((board) => board.id));
    const nextIds = orderedIds.filter((id) => visibleIds.has(id));

    if (nextIds.length === orderedIds.length) {
      return;
    }

    setOrderedIds(nextIds);
    void AsyncStorage.setItem(storageKey, JSON.stringify(nextIds)).catch(() => {
      // Ignore local persistence failures.
    });
  }, [boards, orderedIds, storageKey]);

  const saveBoardOrder = useCallback(
    async (nextIds: string[]) => {
      setOrderedIds(nextIds);
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextIds));
    },
    [storageKey],
  );

  return {
    orderedBoards,
    saveBoardOrder,
  };
}
