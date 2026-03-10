import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  createDeviceOnboardingSession,
  fetchDeviceOnboardingSession,
  fetchLatestActiveDeviceOnboardingSession,
  redeemDeviceOnboardingClaimForTesting,
  markDeviceOnboardingWaiting,
} from "@/lib/supabase/addone-repository";
import { useAppUiStore } from "@/store/app-ui-store";

const ONBOARDING_POLL_INTERVAL_MS = 3000;

export function useOnboarding() {
  const { mode, status, user } = useAuth();
  const queryClient = useQueryClient();
  const activeOnboardingClaimToken = useAppUiStore((state) => state.activeOnboardingClaimToken);
  const activeOnboardingSessionId = useAppUiStore((state) => state.activeOnboardingSessionId);
  const clearOnboardingSession = useAppUiStore((state) => state.clearOnboardingSession);
  const setActiveDeviceId = useAppUiStore((state) => state.setActiveDeviceId);
  const setActiveOnboardingSession = useAppUiStore((state) => state.setActiveOnboardingSession);

  const latestActiveSessionQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && !!user?.id,
    queryFn: () => fetchLatestActiveDeviceOnboardingSession(user!.id),
    queryKey: addOneQueryKeys.activeOnboardingSession(user?.id),
  });

  const sessionId = activeOnboardingSessionId ?? latestActiveSessionQuery.data?.id ?? null;

  useEffect(() => {
    if (!activeOnboardingSessionId && latestActiveSessionQuery.data?.id) {
      setActiveOnboardingSession({
        claimToken: null,
        sessionId: latestActiveSessionQuery.data.id,
      });
    }
  }, [activeOnboardingSessionId, latestActiveSessionQuery.data?.id, setActiveOnboardingSession]);

  const onboardingSessionQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && !!sessionId,
    queryFn: () => fetchDeviceOnboardingSession(sessionId!),
    queryKey: addOneQueryKeys.onboardingSession(sessionId),
    refetchInterval: (query) => {
      const session = query.state.data;

      if (!session || session.status !== "awaiting_cloud" || session.isExpired) {
        return false;
      }

      return ONBOARDING_POLL_INTERVAL_MS;
    },
  });

  const session = onboardingSessionQuery.data ?? (sessionId === latestActiveSessionQuery.data?.id ? latestActiveSessionQuery.data : null);

  useEffect(() => {
    if (session?.status !== "claimed" || !session.deviceId) {
      return;
    }

    setActiveDeviceId(session.deviceId);
    void queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) });
    void queryClient.invalidateQueries({ queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) });
  }, [queryClient, session?.deviceId, session?.status, setActiveDeviceId, user?.id]);

  const createSessionMutation = useMutation({
    mutationFn: createDeviceOnboardingSession,
    onSuccess: async (nextSession) => {
      setActiveOnboardingSession({
        claimToken: nextSession.claimToken ?? null,
        sessionId: nextSession.id,
      });
      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);
      await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) });
    },
  });

  const markWaitingMutation = useMutation({
    mutationFn: markDeviceOnboardingWaiting,
    onSuccess: (nextSession) => {
      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);
    },
  });

  const redeemMutation = useMutation({
    mutationFn: redeemDeviceOnboardingClaimForTesting,
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);

      if (nextSession.deviceId) {
        setActiveDeviceId(nextSession.deviceId);
      }

      await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) });
      await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) });
    },
  });

  return {
    claimToken: activeOnboardingClaimToken,
    clearLocalOnboardingSession: clearOnboardingSession,
    createSession: createSessionMutation.mutateAsync,
    hasClaimToken: Boolean(activeOnboardingClaimToken),
    isBusy: createSessionMutation.isPending || markWaitingMutation.isPending || redeemMutation.isPending,
    isLoading: latestActiveSessionQuery.isLoading || onboardingSessionQuery.isLoading,
    isPolling: onboardingSessionQuery.isFetching && session?.status === "awaiting_cloud",
    markWaiting: markWaitingMutation.mutateAsync,
    refreshSession: onboardingSessionQuery.refetch,
    session,
    sessionId,
    simulateRedeemForTesting: redeemMutation.mutateAsync,
  };
}
