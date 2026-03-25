import { REALTIME_SUBSCRIBE_STATES, RealtimeChannel } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDevices } from "@/hooks/use-devices";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  reconcileViewerSharedBoards,
  removePendingRequestFromOwnerSharing,
  removeViewerBoardByMembershipId,
  removeViewerFromOwnerSharing,
} from "@/lib/friends-state";
import { getSupabaseClient } from "@/lib/supabase";
import {
  approveDeviceViewRequest,
  fetchDeviceSharing,
  fetchSharedBoards,
  leaveSharedBoard as leaveSharedBoardFromRepository,
  rejectDeviceViewRequest,
  requestDeviceViewAccess,
  setSharedBoardCelebrationEnabled as setSharedBoardCelebrationEnabledFromRepository,
  revokeDeviceViewerMembership,
  rotateDeviceShareCode,
} from "@/lib/supabase/addone-repository";
import { DeviceSharingState, SharedBoard } from "@/types/addone";

// Keep shared boards feeling near-live even if a realtime invalidation is missed.
const FRIENDS_SELF_HEAL_MS = 3_000;

export type FriendsDemoScenario = "connected" | "empty-boards" | "empty-owner" | "pending" | "profile-gate";

const EMPTY_OWNER_SHARING_STATE: DeviceSharingState = {
  code: null,
  pendingRequests: [],
  viewers: [],
};

function friendsDebugLog(event: string, payload?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  console.info(`[friends] ${event}`, payload ?? {});
}

function assertRevokedMembership(result: { id?: string; status?: string | null } | null | undefined, message: string) {
  if (result?.status === undefined || result?.status === null) {
    return result;
  }

  if (result.status !== "revoked") {
    throw new Error(message);
  }

  return result;
}

function emptyBoardDays() {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false));
}

function demoSharedBoards(scenario?: FriendsDemoScenario | null): SharedBoard[] {
  if (!scenario || scenario === "profile-gate" || scenario === "empty-owner" || scenario === "empty-boards" || scenario === "pending") {
    return [];
  }

  return [
    {
      celebrationEnabled: true,
      id: "demo-shared-board",
      viewerMembershipId: "demo-viewer-membership",
      ownerName: "Morgan Lee",
      habitName: "Morning Stretch",
      syncState: "online",
      lastSnapshotAt: new Date().toISOString(),
      weeklyTarget: 4,
      paletteId: "amber",
      days: emptyBoardDays().map((week, weekIndex) =>
        week.map((_, dayIndex) => weekIndex < 2 && dayIndex <= 3 && (dayIndex + weekIndex) % 2 === 0),
      ),
      dateGrid: undefined,
      logicalToday: new Date().toISOString().slice(0, 10),
      today: {
        weekIndex: 0,
        dayIndex: 3,
      },
    },
  ];
}

function demoOwnerSharingState(scenario?: FriendsDemoScenario | null): DeviceSharingState {
  if (!scenario || scenario === "profile-gate" || scenario === "empty-boards") {
    return EMPTY_OWNER_SHARING_STATE;
  }

  if (scenario === "empty-owner") {
    return {
      code: "ADDONE",
      pendingRequests: [],
      viewers: [],
    };
  }

  if (scenario === "pending") {
    return {
      code: "ADDONE",
      pendingRequests: [
        {
          createdAt: new Date().toISOString(),
          id: "demo-request",
          requesterDisplayName: "Jamie Cole",
          requesterUserId: "demo-requester",
          status: "pending",
        },
      ],
      viewers: [],
    };
  }

  return {
    code: "ADDONE",
    pendingRequests: [],
    viewers: [
      {
        approvedAt: new Date().toISOString(),
        displayName: "Taylor Reed",
        membershipId: "demo-membership",
        userId: "demo-viewer",
      },
    ],
  };
}

export function formatFriendsError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (/invalid or expired/i.test(error.message)) {
    return "That share code is invalid or expired.";
  }

  if (/already linked/i.test(error.message)) {
    return "That board is already linked to your account.";
  }

  if (/authentication required/i.test(error.message)) {
    return "Sign in again to keep using Friends.";
  }

  return error.message || fallback;
}

export function useFriends(demoScenario?: FriendsDemoScenario | null) {
  const { activeDeviceId, isLoading: isLoadingDevices } = useDevices();
  const { mode, status, user } = useAuth();
  const queryClient = useQueryClient();
  const isProofScenario = demoScenario != null;
  const isCloudSignedIn = mode === "cloud" && status === "signedIn" && !!user?.id;
  const ownerSharingKey = useMemo(() => addOneQueryKeys.ownerSharing(activeDeviceId), [activeDeviceId]);
  const viewerBoardsKey = useMemo(() => addOneQueryKeys.viewerSharedBoards(user?.id), [user?.id]);
  const isResolvingOwnerSharingScope =
    !isProofScenario && mode !== "demo" && isCloudSignedIn && isLoadingDevices && !activeDeviceId;

  const viewerBoardsQuery = useQuery({
    enabled: isProofScenario || mode === "demo" || isCloudSignedIn,
    queryFn: async () => {
      if (isProofScenario || mode === "demo") {
        return demoSharedBoards(demoScenario);
      }

      const nextBoards = await fetchSharedBoards(user!.id);
      const previousBoards = queryClient.getQueryData<SharedBoard[]>(viewerBoardsKey) ?? [];
      return reconcileViewerSharedBoards(previousBoards, nextBoards);
    },
    queryKey: viewerBoardsKey,
    refetchInterval: isCloudSignedIn ? FRIENDS_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const ownerSharingQuery = useQuery({
    enabled: (isProofScenario || mode === "demo" || isCloudSignedIn) && !!activeDeviceId,
    queryFn: async () => {
      if (isProofScenario || mode === "demo") {
        return demoOwnerSharingState(demoScenario);
      }

      return fetchDeviceSharing(activeDeviceId!);
    },
    queryKey: ownerSharingKey,
    refetchInterval: activeDeviceId && isCloudSignedIn && !isProofScenario ? FRIENDS_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const viewerBoards = viewerBoardsQuery.data ?? [];
  const ownerSharing = ownerSharingQuery.data ?? EMPTY_OWNER_SHARING_STATE;
  const sharedBoardIdsSignature = useMemo(() => viewerBoards.map((board) => board.id).sort().join(","), [viewerBoards]);
  const sharedBoardIds = useMemo(
    () => (sharedBoardIdsSignature ? sharedBoardIdsSignature.split(",") : []),
    [sharedBoardIdsSignature],
  );

  const refetchOwnerSharing = useCallback(async () => {
    if (!activeDeviceId) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ownerSharingKey });
    await queryClient.refetchQueries({ queryKey: ownerSharingKey, type: "active" });
  }, [activeDeviceId, ownerSharingKey, queryClient]);

  const refetchViewerBoards = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: viewerBoardsKey });
    await queryClient.refetchQueries({ queryKey: viewerBoardsKey, type: "active" });
  }, [queryClient, viewerBoardsKey]);

  useEffect(() => {
    if (isProofScenario || !isCloudSignedIn || !user?.id) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const channels: RealtimeChannel[] = [];

    const handleChannelStatus = (scope: string, refetch: () => Promise<void>) => {
      return (status: REALTIME_SUBSCRIBE_STATES, error?: Error) => {
        friendsDebugLog(`realtime:${scope}`, {
          error: error?.message ?? null,
          status,
        });

        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          void refetch();
          return;
        }

        if (
          status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          void refetch();
        }
      };
    };

    const invalidateViewerBoards = () => {
      friendsDebugLog("invalidate:viewer-boards", {
        userId: user.id,
      });
      void refetchViewerBoards();
    };

    const invalidateOwnerSharing = () => {
      if (!activeDeviceId) {
        return;
      }

      friendsDebugLog("invalidate:owner-sharing", {
        deviceId: activeDeviceId,
      });
      void refetchOwnerSharing();
    };

    const membershipChannel = supabase
      .channel(`friends-memberships:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${user.id}`,
          schema: "public",
          table: "device_memberships",
        },
        invalidateViewerBoards,
      )
      .subscribe(handleChannelStatus("memberships", refetchViewerBoards));
    channels.push(membershipChannel);

    if (activeDeviceId) {
      const ownerChannel = supabase
        .channel(`friends-owner:${activeDeviceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${activeDeviceId}`,
            schema: "public",
            table: "device_share_codes",
          },
          invalidateOwnerSharing,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${activeDeviceId}`,
            schema: "public",
            table: "device_share_requests",
          },
          invalidateOwnerSharing,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${activeDeviceId}`,
            schema: "public",
            table: "device_memberships",
          },
          invalidateOwnerSharing,
        )
        .subscribe(handleChannelStatus("owner", refetchOwnerSharing));
      channels.push(ownerChannel);
    }

    for (const boardId of sharedBoardIds) {
      const boardChannel = supabase
        .channel(`shared-board:${boardId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `id=eq.${boardId}`,
            schema: "public",
            table: "devices",
          },
          invalidateViewerBoards,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${boardId}`,
            schema: "public",
            table: "device_runtime_snapshots",
          },
          invalidateViewerBoards,
        )
        .subscribe(handleChannelStatus(`shared-board:${boardId}`, refetchViewerBoards));
      channels.push(boardChannel);
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [activeDeviceId, isCloudSignedIn, isProofScenario, refetchOwnerSharing, refetchViewerBoards, sharedBoardIds, user?.id]);

  const requestAccessMutation = useMutation({
    mutationFn: async (code: string) => {
      friendsDebugLog("mutation:request-access:start", { code });
      return requestDeviceViewAccess(code);
    },
    onSuccess: async () => {
      friendsDebugLog("mutation:request-access:success");
      await refetchViewerBoards();
    },
  });

  const rotateCodeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      friendsDebugLog("mutation:rotate-code:start", { deviceId });
      return rotateDeviceShareCode(deviceId);
    },
    onSuccess: async (shareCode) => {
      friendsDebugLog("mutation:rotate-code:success", {
        code: shareCode.code,
      });
      queryClient.setQueryData<DeviceSharingState>(ownerSharingKey, (current) => ({
        ...(current ?? EMPTY_OWNER_SHARING_STATE),
        code: shareCode.code,
      }));
      await refetchOwnerSharing();
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      friendsDebugLog("mutation:approve-request:start", { activeDeviceId, requestId });
      return approveDeviceViewRequest(requestId);
    },
    onSuccess: async (_request, requestId) => {
      friendsDebugLog("mutation:approve-request:success", { requestId });
      queryClient.setQueryData<DeviceSharingState>(ownerSharingKey, (current) =>
        removePendingRequestFromOwnerSharing(current ?? EMPTY_OWNER_SHARING_STATE, requestId),
      );

      await Promise.all([refetchOwnerSharing(), refetchViewerBoards()]);
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      friendsDebugLog("mutation:reject-request:start", { activeDeviceId, requestId });
      return rejectDeviceViewRequest(requestId);
    },
    onSuccess: async (_request, requestId) => {
      friendsDebugLog("mutation:reject-request:success", { requestId });
      queryClient.setQueryData<DeviceSharingState>(ownerSharingKey, (current) =>
        removePendingRequestFromOwnerSharing(current ?? EMPTY_OWNER_SHARING_STATE, requestId),
      );

      await refetchOwnerSharing();
    },
  });

  const revokeViewerMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      friendsDebugLog("mutation:revoke-viewer:start", {
        activeDeviceId,
        isProofScenario,
        membershipId,
        mode,
      });

      if (isProofScenario || mode === "demo") {
        return { id: membershipId };
      }

      if (!activeDeviceId) {
        throw new Error("No owned device connected.");
      }

      const result = await revokeDeviceViewerMembership({
        deviceId: activeDeviceId,
        membershipId,
      });
      friendsDebugLog("mutation:revoke-viewer:resolved", {
        membershipId,
        status: result?.status ?? null,
      });

      return assertRevokedMembership(result, "Viewer removal did not stick on the backend.");
    },
    onSuccess: async (_membership, membershipId) => {
      friendsDebugLog("mutation:revoke-viewer:success", {
        activeDeviceId,
        membershipId,
      });
      queryClient.setQueryData<DeviceSharingState>(ownerSharingKey, (current) =>
        removeViewerFromOwnerSharing(current ?? EMPTY_OWNER_SHARING_STATE, membershipId),
      );
      queryClient.setQueryData<SharedBoard[]>(viewerBoardsKey, (current) =>
        removeViewerBoardByMembershipId(current ?? [], membershipId),
      );

      await Promise.all([refetchOwnerSharing(), refetchViewerBoards()]);
    },
  });

  const leaveSharedBoardMutation = useMutation({
    mutationFn: (params: { deviceId: string; membershipId: string }) => {
      friendsDebugLog("mutation:leave-shared-board:start", params);
      if (isProofScenario || mode === "demo") {
        return Promise.resolve({ id: params.membershipId });
      }

      return leaveSharedBoardFromRepository(params).then((result) => {
        friendsDebugLog("mutation:leave-shared-board:resolved", {
          membershipId: params.membershipId,
          status: result?.status ?? null,
        });

        return assertRevokedMembership(result, "Shared board removal did not stick on the backend.");
      });
    },
    onSuccess: async (_membership, params) => {
      friendsDebugLog("mutation:leave-shared-board:success", params);
      queryClient.setQueryData<SharedBoard[]>(viewerBoardsKey, (current) =>
        removeViewerBoardByMembershipId(current ?? [], params.membershipId),
      );

      await refetchViewerBoards();
    },
  });

  const setSharedBoardCelebrationMutation = useMutation({
    mutationFn: (params: { deviceId: string; enabled: boolean; membershipId: string }) => {
      friendsDebugLog("mutation:set-shared-board-celebration:start", params);
      if (isProofScenario || mode === "demo") {
        return Promise.resolve({
          celebration_enabled: params.enabled,
          id: params.membershipId,
        });
      }

      return setSharedBoardCelebrationEnabledFromRepository(params);
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: viewerBoardsKey });

      const previousBoards = queryClient.getQueryData<SharedBoard[]>(viewerBoardsKey) ?? [];
      queryClient.setQueryData<SharedBoard[]>(viewerBoardsKey, (current) =>
        (current ?? []).map((board) =>
          board.viewerMembershipId === params.membershipId
            ? {
                ...board,
                celebrationEnabled: params.enabled,
              }
            : board,
        ),
      );

      return { previousBoards };
    },
    onError: (_error, _params, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData<SharedBoard[]>(viewerBoardsKey, context.previousBoards);
      }
    },
    onSuccess: async (_membership, params) => {
      friendsDebugLog("mutation:set-shared-board-celebration:success", params);
      await refetchViewerBoards();
    },
  });

  return {
    approveRequest: approveRequestMutation.mutateAsync,
    hasLoadedOwnerSharing: ownerSharingQuery.dataUpdatedAt > 0,
    hasLoadedSharing: ownerSharingQuery.dataUpdatedAt > 0,
    hasLoadedViewerBoards: viewerBoardsQuery.dataUpdatedAt > 0,
    isApprovingRequest: approveRequestMutation.isPending,
    isFetchingOwnerSharing: ownerSharingQuery.isFetching,
    isFetchingSharedBoards: viewerBoardsQuery.isFetching,
    isFetchingSharing: ownerSharingQuery.isFetching,
    isFetchingViewerBoards: viewerBoardsQuery.isFetching,
    isLeavingSharedBoard: leaveSharedBoardMutation.isPending,
    isLoadingOwnerSharing: isResolvingOwnerSharingScope || (Boolean(activeDeviceId) && ownerSharingQuery.isLoading),
    isLoadingSharedBoards: viewerBoardsQuery.isLoading,
    isLoadingSharing: isResolvingOwnerSharingScope || (Boolean(activeDeviceId) && ownerSharingQuery.isLoading),
    isLoadingViewerBoards: viewerBoardsQuery.isLoading,
    isRefetchErrorOwnerSharing: ownerSharingQuery.isRefetchError,
    isRefetchErrorViewerBoards: viewerBoardsQuery.isRefetchError,
    isRejectingRequest: rejectRequestMutation.isPending,
    isRequestingAccess: requestAccessMutation.isPending,
    isRotatingCode: rotateCodeMutation.isPending,
    isRevokingViewer: revokeViewerMutation.isPending,
    isUpdatingSharedBoardCelebration: setSharedBoardCelebrationMutation.isPending,
    leaveSharedBoard: leaveSharedBoardMutation.mutateAsync,
    ownerSharing,
    ownerSharingError: ownerSharingQuery.error,
    refreshOwnerSharing: refetchOwnerSharing,
    refreshSharedBoards: refetchViewerBoards,
    refreshSharing: refetchOwnerSharing,
    refreshViewerBoards: refetchViewerBoards,
    rejectRequest: rejectRequestMutation.mutateAsync,
    revokeViewer: revokeViewerMutation.mutateAsync,
    requestAccess: requestAccessMutation.mutateAsync,
    requestAccessError: requestAccessMutation.error,
    rotateShareCode: rotateCodeMutation.mutateAsync,
    setSharedBoardCelebrationEnabled: setSharedBoardCelebrationMutation.mutateAsync,
    sharedBoards: viewerBoards,
    sharedBoardsError: viewerBoardsQuery.error,
    sharingError: ownerSharingQuery.error,
    sharingState: ownerSharing,
    viewerSharedBoards: viewerBoards,
    viewerSharedBoardsError: viewerBoardsQuery.error,
  };
}
