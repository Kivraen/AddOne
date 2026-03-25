const UNKNOWN_OWNER_NAME = "AddOne User";

type TodayPointerLike = {
  dayIndex: number;
  weekIndex: number;
};

type SharingStateLike = {
  code: string | null;
  pendingRequests: Array<{ id: string }>;
  viewers: Array<{ membershipId: string }>;
};

type SharedBoardLike = {
  id: string;
  ownerName: string;
  lastSnapshotAt?: string | null;
  days: boolean[][];
  dateGrid?: string[][];
  logicalToday: string;
  today: TodayPointerLike;
  viewerMembershipId: string;
};

export function removePendingRequestFromOwnerSharing<T extends SharingStateLike>(state: T, requestId: string): T {
  const nextPendingRequests = state.pendingRequests.filter((request) => request.id !== requestId);
  if (nextPendingRequests.length === state.pendingRequests.length) {
    return state;
  }

  return {
    ...state,
    pendingRequests: nextPendingRequests,
  };
}

export function removeViewerFromOwnerSharing<T extends SharingStateLike>(state: T, membershipId: string): T {
  const nextViewers = state.viewers.filter((viewer) => viewer.membershipId !== membershipId);
  if (nextViewers.length === state.viewers.length) {
    return state;
  }

  return {
    ...state,
    viewers: nextViewers,
  };
}

export function removeViewerBoardByMembershipId<T extends SharedBoardLike>(boards: readonly T[], membershipId: string) {
  return boards.filter((board) => board.viewerMembershipId !== membershipId);
}

export function reconcileViewerSharedBoards<T extends SharedBoardLike>(previous: readonly T[], next: readonly T[]): T[] {
  if (previous.length === 0 || next.length === 0) {
    return [...next];
  }

  const previousById = new Map(previous.map((board) => [board.id, board]));

  return next.map((board) => {
    const previousBoard = previousById.get(board.id);
    if (!previousBoard) {
      return board;
    }

    const shouldPreserveOwnerName = board.ownerName === UNKNOWN_OWNER_NAME && previousBoard.ownerName !== UNKNOWN_OWNER_NAME;
    const shouldPreserveSnapshotProjection = !board.lastSnapshotAt && !!previousBoard.lastSnapshotAt;

    if (!shouldPreserveOwnerName && !shouldPreserveSnapshotProjection) {
      return board;
    }

    return {
      ...board,
      ownerName: shouldPreserveOwnerName ? previousBoard.ownerName : board.ownerName,
      lastSnapshotAt: shouldPreserveSnapshotProjection ? previousBoard.lastSnapshotAt : board.lastSnapshotAt,
      days: shouldPreserveSnapshotProjection ? previousBoard.days : board.days,
      dateGrid: shouldPreserveSnapshotProjection ? previousBoard.dateGrid : board.dateGrid,
      logicalToday: shouldPreserveSnapshotProjection ? previousBoard.logicalToday : board.logicalToday,
      today: shouldPreserveSnapshotProjection ? previousBoard.today : board.today,
    };
  });
}

export function shouldHoldFriendsEmptyState(params: {
  hasLoadedOnce: boolean;
  isFetching: boolean;
  itemCount: number;
}) {
  return params.isFetching && !params.hasLoadedOnce && params.itemCount === 0;
}
