import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  approveDeviceViewRequest,
  fetchDeviceSharing,
  rejectDeviceViewRequest,
  requestDeviceViewAccess,
  rotateDeviceShareCode,
} from "@/lib/supabase/addone-repository";
import { useDevices } from "@/hooks/use-devices";
import { DeviceSharingState } from "@/types/addone";

function buildDemoSharingState(sharedViewerCount: number): DeviceSharingState {
  return {
    code: "A1DEMO",
    pendingRequests: [
      {
        createdAt: new Date().toISOString(),
        id: "demo-request",
        requesterDisplayName: "Jordan",
        requesterUserId: "demo-requester",
        status: "pending",
      },
    ],
    viewers: Array.from({ length: sharedViewerCount }, (_, index) => ({
      approvedAt: new Date().toISOString(),
      displayName: index === 0 ? "Mina" : `Viewer ${index + 1}`,
      membershipId: `demo-viewer-${index + 1}`,
      userId: `demo-user-${index + 1}`,
    })),
  };
}

export function useDeviceSharing(deviceId?: string | null) {
  const { mode } = useAuth();
  const { activeDevice } = useDevices();
  const shareQuery = useQuery({
    enabled: mode === "cloud" && !!deviceId,
    queryFn: () => fetchDeviceSharing(deviceId!),
    queryKey: addOneQueryKeys.sharing(deviceId),
  });

  return {
    isLoading: mode === "cloud" ? shareQuery.isLoading : false,
    sharing:
      mode === "cloud"
        ? shareQuery.data ?? { code: null, pendingRequests: [], viewers: [] }
        : buildDemoSharingState(activeDevice?.sharedViewers ?? 0),
  };
}

export function useSharingActions(deviceId?: string | null) {
  const { mode, user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharing(deviceId) });
    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) });
    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharedBoards(user?.id) });
  };

  const rotateMutation = useMutation({
    mutationFn: () => rotateDeviceShareCode(deviceId!),
    onSuccess: invalidate,
  });

  const requestMutation = useMutation({
    mutationFn: requestDeviceViewAccess,
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: approveDeviceViewRequest,
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: rejectDeviceViewRequest,
    onSuccess: invalidate,
  });

  if (mode === "demo") {
    return {
      approveRequest: async () => undefined,
      isBusy: false,
      rejectRequest: async () => undefined,
      requestAccess: async () => undefined,
      rotateCode: async () => undefined,
    };
  }

  return {
    approveRequest: approveMutation.mutateAsync,
    isBusy: rotateMutation.isPending || requestMutation.isPending || approveMutation.isPending || rejectMutation.isPending,
    rejectRequest: rejectMutation.mutateAsync,
    requestAccess: requestMutation.mutateAsync,
    rotateCode: rotateMutation.mutateAsync,
  };
}
