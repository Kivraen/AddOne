import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useMemo } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDevices } from "@/hooks/use-devices";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  approveDeviceViewRequest,
  fetchDeviceSharing,
  fetchSharedBoards,
  rejectDeviceViewRequest,
  requestDeviceViewAccess,
  rotateDeviceShareCode,
} from "@/lib/supabase/addone-repository";
import { getSupabaseClient } from "@/lib/supabase";
import { DeviceShareRequest, DeviceSharingState, SharedBoard } from "@/types/addone";

const FRIENDS_SELF_HEAL_MS = 15_000;

const EMPTY_SHARING_STATE: DeviceSharingState = {
  code: null,
  pendingRequests: [],
  viewers: [],
};

function emptyBoardDays() {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false));
}

function demoSharedBoards(): SharedBoard[] {
  return [
    {
      id: "demo-shared-board",
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

function demoSharingState(): DeviceSharingState {
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

export function useFriends() {
  const { activeDeviceId } = useDevices();
  const { mode, status, user } = useAuth();
  const queryClient = useQueryClient();
  const isCloudSignedIn = mode === "cloud" && status === "signedIn" && !!user?.id;
  const sharedBoardsKey = addOneQueryKeys.sharedBoards(user?.id);
  const sharingKey = addOneQueryKeys.deviceSharing(activeDeviceId);

  const sharedBoardsQuery = useQuery({
    enabled: mode === "demo" || isCloudSignedIn,
    queryFn: async () => {
      if (mode === "demo") {
        return demoSharedBoards();
      }

      return fetchSharedBoards(user!.id);
    },
    queryKey: sharedBoardsKey,
    refetchInterval: isCloudSignedIn ? FRIENDS_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
  });

  const sharingQuery = useQuery({
    enabled: (mode === "demo" || isCloudSignedIn) && !!activeDeviceId,
    queryFn: async () => {
      if (mode === "demo") {
        return demoSharingState();
      }

      return fetchDeviceSharing(activeDeviceId!);
    },
    queryKey: sharingKey,
    refetchInterval: activeDeviceId && isCloudSignedIn ? FRIENDS_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
  });

  const sharedBoardIds = useMemo(
    () => (sharedBoardsQuery.data ?? []).map((board) => board.id).sort(),
    [sharedBoardsQuery.data],
  );

  useEffect(() => {
    if (!isCloudSignedIn || !user?.id) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const channels: RealtimeChannel[] = [];

    const invalidateSharedBoards = () => {
      void queryClient.invalidateQueries({ queryKey: sharedBoardsKey });
    };

    const invalidateSharing = () => {
      if (!activeDeviceId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: sharingKey });
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
        invalidateSharedBoards,
      )
      .subscribe();
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
          invalidateSharing,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${activeDeviceId}`,
            schema: "public",
            table: "device_share_requests",
          },
          invalidateSharing,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${activeDeviceId}`,
            schema: "public",
            table: "device_memberships",
          },
          invalidateSharing,
        )
        .subscribe();
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
          invalidateSharedBoards,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `device_id=eq.${boardId}`,
            schema: "public",
            table: "device_runtime_snapshots",
          },
          invalidateSharedBoards,
        )
        .subscribe();
      channels.push(boardChannel);
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [activeDeviceId, isCloudSignedIn, queryClient, sharedBoardIds, sharedBoardsKey, sharingKey, user?.id]);

  const requestAccessMutation = useMutation({
    mutationFn: requestDeviceViewAccess,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sharedBoardsKey });
    },
  });

  const rotateCodeMutation = useMutation({
    mutationFn: (deviceId: string) => rotateDeviceShareCode(deviceId),
    onSuccess: async () => {
      if (activeDeviceId) {
        await queryClient.invalidateQueries({ queryKey: sharingKey });
      }
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: (requestId: string) => approveDeviceViewRequest(requestId),
    onSuccess: async () => {
      if (activeDeviceId) {
        await queryClient.invalidateQueries({ queryKey: sharingKey });
      }

      await queryClient.invalidateQueries({ queryKey: sharedBoardsKey });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => rejectDeviceViewRequest(requestId),
    onSuccess: async () => {
      if (activeDeviceId) {
        await queryClient.invalidateQueries({ queryKey: sharingKey });
      }
    },
  });

  return {
    approveRequest: approveRequestMutation.mutateAsync,
    isApprovingRequest: approveRequestMutation.isPending,
    isLoadingSharedBoards: sharedBoardsQuery.isLoading,
    isLoadingSharing: Boolean(activeDeviceId) && sharingQuery.isLoading,
    isRejectingRequest: rejectRequestMutation.isPending,
    isRequestingAccess: requestAccessMutation.isPending,
    isRotatingCode: rotateCodeMutation.isPending,
    rejectRequest: rejectRequestMutation.mutateAsync,
    requestAccess: requestAccessMutation.mutateAsync,
    requestAccessError: requestAccessMutation.error,
    rotateShareCode: rotateCodeMutation.mutateAsync,
    sharedBoards: sharedBoardsQuery.data ?? [],
    sharedBoardsError: sharedBoardsQuery.error,
    sharingError: sharingQuery.error,
    sharingState: sharingQuery.data ?? EMPTY_SHARING_STATE,
  };
}
