import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  cancelDeviceOnboardingSession,
  createDeviceOnboardingSession,
  fetchDeviceOnboardingSession,
  fetchRestorableBoardBackupsForUser,
  fetchLatestActiveDeviceOnboardingSession,
  redeemDeviceOnboardingClaimForTesting,
  markDeviceOnboardingWaiting,
  restoreBoardBackupToDevice,
} from "@/lib/supabase/addone-repository";
import { useAddOneStore } from "@/store/addone-store";
import { useAppUiStore } from "@/store/app-ui-store";
import { DeviceOnboardingSession } from "@/types/addone";

const ONBOARDING_POLL_INTERVAL_MS = 3000;
const DEMO_ONBOARDING_CLAIM_TOKEN = "demo-claim-token";
const DEMO_ONBOARDING_SESSION_ID = "demo-onboarding-session";

function isCancelledErrorLike(error: unknown) {
  if (error instanceof Error && error.name === "CancelledError") {
    return true;
  }

  if (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "CancelledError") {
    return true;
  }

  return typeof error === "string" && error.includes("CancelledError");
}

function ignoreCancelledError(task: () => Promise<unknown>, label: string) {
  try {
    const promise = task();
    void promise.catch((error) => {
      if (isCancelledErrorLike(error)) {
        return;
      }

      console.warn(`[use-onboarding] ${label} failed`, error);
    });
  } catch (error) {
    if (isCancelledErrorLike(error)) {
      return;
    }

    console.warn(`[use-onboarding] ${label} failed`, error);
  }
}

function buildDemoSession(input: {
  claimToken?: string | null;
  claimedAt?: string | null;
  deviceId?: string | null;
  hardwareProfileHint?: string | null;
  id?: string;
  lastError?: string | null;
  status: DeviceOnboardingSession["status"];
  waitingForDeviceAt?: string | null;
}): DeviceOnboardingSession {
  const createdAt = new Date().toISOString();
  return {
    claimToken: input.claimToken ?? DEMO_ONBOARDING_CLAIM_TOKEN,
    claimTokenPrefix: "DEMOCL",
    claimedAt: input.claimedAt ?? null,
    createdAt,
    deviceId: input.deviceId ?? null,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    hardwareProfileHint: input.hardwareProfileHint ?? "addone-v1",
    id: input.id ?? DEMO_ONBOARDING_SESSION_ID,
    isExpired: false,
    lastError: input.lastError ?? null,
    status: input.status,
    waitingForDeviceAt: input.waitingForDeviceAt ?? null,
  };
}

export function useOnboarding(options?: {
  autoResumeLatestActiveSession?: boolean;
  discardLocalSessionWhenExpiresSoonMs?: number | null;
  persistLocalSession?: boolean;
  resumeStoredLocalSession?: boolean;
}) {
  const { mode, status, user } = useAuth();
  const queryClient = useQueryClient();
  const autoResumeLatestActiveSession = options?.autoResumeLatestActiveSession ?? true;
  const discardLocalSessionWhenExpiresSoonMs = options?.discardLocalSessionWhenExpiresSoonMs ?? null;
  const persistLocalSession = options?.persistLocalSession ?? true;
  const resumeStoredLocalSession = options?.resumeStoredLocalSession ?? true;
  const demoDeviceId = useAddOneStore((state) => state.activeDeviceId);
  const activeOnboardingClaimToken = useAppUiStore((state) => state.activeOnboardingClaimToken);
  const activeOnboardingSessionId = useAppUiStore((state) => state.activeOnboardingSessionId);
  const clearOnboardingSession = useAppUiStore((state) => state.clearOnboardingSession);
  const setActiveDeviceId = useAppUiStore((state) => state.setActiveDeviceId);
  const setActiveOnboardingSession = useAppUiStore((state) => state.setActiveOnboardingSession);
  const [demoSession, setDemoSession] = useState<DeviceOnboardingSession | null>(null);
  const [localCloudClaimToken, setLocalCloudClaimToken] = useState<string | null>(null);
  const [localCloudSessionId, setLocalCloudSessionId] = useState<string | null>(null);

  const latestActiveSessionQuery = useQuery({
    enabled: autoResumeLatestActiveSession && mode === "cloud" && status === "signedIn" && !!user?.id,
    queryFn: () => fetchLatestActiveDeviceOnboardingSession(user!.id),
    queryKey: addOneQueryKeys.activeOnboardingSession(user?.id),
  });

  const sessionId =
    mode === "demo"
      ? demoSession?.id ?? null
      : localCloudSessionId ??
        (resumeStoredLocalSession ? activeOnboardingSessionId : null) ??
        (autoResumeLatestActiveSession ? latestActiveSessionQuery.data?.id ?? null : null);

  useEffect(() => {
    if (!persistLocalSession) {
      return;
    }

    if (!activeOnboardingSessionId && latestActiveSessionQuery.data?.id) {
      setActiveOnboardingSession({
        claimToken: null,
        sessionId: latestActiveSessionQuery.data.id,
      });
    }
  }, [activeOnboardingSessionId, latestActiveSessionQuery.data?.id, persistLocalSession, setActiveOnboardingSession]);

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

  const session =
    mode === "demo"
      ? demoSession
      : onboardingSessionQuery.data ?? (sessionId === latestActiveSessionQuery.data?.id ? latestActiveSessionQuery.data : null);

  useEffect(() => {
    if (mode !== "cloud" || !activeOnboardingSessionId || !session || session.id !== activeOnboardingSessionId) {
      return;
    }

    const shouldClearTerminalSession =
      session.isExpired ||
      session.status === "expired" ||
      session.status === "cancelled" ||
      session.status === "failed";
    if (shouldClearTerminalSession) {
      queryClient.setQueryData(addOneQueryKeys.activeOnboardingSession(user?.id), null);
      setLocalCloudClaimToken(null);
      setLocalCloudSessionId(null);
      clearOnboardingSession();
      return;
    }
  }, [activeOnboardingSessionId, clearOnboardingSession, mode, queryClient, session, user?.id]);

  useEffect(() => {
    if (
      mode !== "cloud" ||
      !activeOnboardingSessionId ||
      !session ||
      session.id !== activeOnboardingSessionId ||
      session.isExpired ||
      session.status === "claimed" ||
      !discardLocalSessionWhenExpiresSoonMs
    ) {
      return;
    }

    const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(remainingMs) || remainingMs > discardLocalSessionWhenExpiresSoonMs) {
      return;
    }

    setLocalCloudClaimToken(null);
    setLocalCloudSessionId(null);
    clearOnboardingSession();
  }, [
    activeOnboardingSessionId,
    clearOnboardingSession,
    discardLocalSessionWhenExpiresSoonMs,
    mode,
    session,
  ]);

  const restoreCandidatesQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && session?.status === "claimed" && !!session?.deviceId,
    queryFn: () => fetchRestorableBoardBackupsForUser(session!.deviceId!),
    queryKey: addOneQueryKeys.restoreCandidates(session?.deviceId, user?.id),
  });

  useEffect(() => {
    if (mode !== "demo" || demoSession?.status !== "awaiting_cloud") {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDemoSession((current) => {
        if (!current || current.status !== "awaiting_cloud") {
          return current;
        }

        return {
          ...current,
          claimedAt: new Date().toISOString(),
          deviceId: demoDeviceId,
          status: "claimed",
        };
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [demoDeviceId, demoSession?.status, mode]);

  useEffect(() => {
    if (session?.status !== "claimed" || !session.deviceId) {
      return;
    }

    setActiveDeviceId(session.deviceId);
    ignoreCancelledError(
      () => queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) }, { cancelRefetch: false }),
      "invalidate devices",
    );
    ignoreCancelledError(
      () =>
        queryClient.invalidateQueries(
          { queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) },
          { cancelRefetch: false },
        ),
      "invalidate active onboarding session",
    );
  }, [queryClient, session?.deviceId, session?.status, setActiveDeviceId, user?.id]);

  const createSessionMutation = useMutation({
    mutationFn: async (params?: Parameters<typeof createDeviceOnboardingSession>[0]) => {
      if (mode === "demo") {
        return buildDemoSession({
          hardwareProfileHint: params?.hardwareProfileHint ?? "addone-v1",
          status: "awaiting_ap",
        });
      }

      return createDeviceOnboardingSession(params);
    },
    onSuccess: async (nextSession) => {
      if (mode === "demo") {
        setDemoSession(nextSession);
        return;
      }

      setLocalCloudClaimToken(nextSession.claimToken ?? null);
      setLocalCloudSessionId(nextSession.id);
      if (persistLocalSession) {
        setActiveOnboardingSession({
          claimToken: nextSession.claimToken ?? null,
          sessionId: nextSession.id,
        });
      }
      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);
      ignoreCancelledError(
        () =>
          queryClient.invalidateQueries(
            { queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) },
            { cancelRefetch: false },
          ),
        "invalidate active onboarding session",
      );
    },
  });

  const markWaitingMutation = useMutation({
    mutationFn: async (nextSessionId: string) => {
      if (mode === "demo") {
        return buildDemoSession({
          claimToken: demoSession?.claimToken ?? DEMO_ONBOARDING_CLAIM_TOKEN,
          hardwareProfileHint: demoSession?.hardwareProfileHint ?? "addone-v1",
          id: nextSessionId,
          status: "awaiting_cloud",
          waitingForDeviceAt: new Date().toISOString(),
        });
      }

      return markDeviceOnboardingWaiting(nextSessionId);
    },
    onSuccess: (nextSession) => {
      if (mode === "demo") {
        setDemoSession(nextSession);
        return;
      }

      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (params: { reason?: string | null; sessionId: string }) => {
      if (mode === "demo") {
        return buildDemoSession({
          claimToken: demoSession?.claimToken ?? DEMO_ONBOARDING_CLAIM_TOKEN,
          hardwareProfileHint: demoSession?.hardwareProfileHint ?? "addone-v1",
          id: params.sessionId,
          lastError: params.reason ?? "Cancelled from the app.",
          status: "cancelled",
        });
      }

      return cancelDeviceOnboardingSession(params.sessionId, params.reason ?? null);
    },
    onSuccess: async (nextSession) => {
      if (mode === "demo") {
        setDemoSession(null);
        clearOnboardingSession();
        return;
      }

      setLocalCloudClaimToken(null);
      setLocalCloudSessionId(null);
      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);
      queryClient.setQueryData(addOneQueryKeys.activeOnboardingSession(user?.id), null);
      clearOnboardingSession();
      ignoreCancelledError(
        () =>
          queryClient.invalidateQueries(
            { queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) },
            { cancelRefetch: false },
          ),
        "invalidate active onboarding session",
      );
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (params: Parameters<typeof redeemDeviceOnboardingClaimForTesting>[0]) => {
      if (mode === "demo") {
        return buildDemoSession({
          claimToken: demoSession?.claimToken ?? DEMO_ONBOARDING_CLAIM_TOKEN,
          claimedAt: new Date().toISOString(),
          deviceId: params.hardwareUid || demoDeviceId,
          hardwareProfileHint: params.hardwareProfile ?? "addone-v1",
          status: "claimed",
        });
      }

      return redeemDeviceOnboardingClaimForTesting(params);
    },
    onSuccess: async (nextSession) => {
      if (mode === "demo") {
        setDemoSession(nextSession);
        return;
      }

      queryClient.setQueryData(addOneQueryKeys.onboardingSession(nextSession.id), nextSession);

      if (nextSession.deviceId) {
        setActiveDeviceId(nextSession.deviceId);
      }

      ignoreCancelledError(
        () =>
          queryClient.invalidateQueries(
            { queryKey: addOneQueryKeys.activeOnboardingSession(user?.id) },
            { cancelRefetch: false },
          ),
        "invalidate active onboarding session",
      );
      ignoreCancelledError(
        () => queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) }, { cancelRefetch: false }),
        "invalidate devices",
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (params: { backupId: string; deviceId: string; requestId: string }) => {
      if (mode === "demo") {
        return {
          board_id: "demo-board",
          command_id: "demo-restore",
          status: "queued",
        };
      }

      return restoreBoardBackupToDevice(params);
    },
    onSuccess: async (_result, variables) => {
      if (mode === "demo") {
        return;
      }

      ignoreCancelledError(
        () => queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user?.id) }, { cancelRefetch: false }),
        "invalidate devices",
      );
      ignoreCancelledError(
        () =>
          queryClient.invalidateQueries(
            { queryKey: addOneQueryKeys.restoreCandidates(variables.deviceId, user?.id) },
            { cancelRefetch: false },
          ),
        "invalidate restore candidates",
      );
    },
  });

  return {
    cancelSession: cancelMutation.mutateAsync,
    claimToken:
      mode === "demo"
        ? demoSession?.claimToken ?? null
        : localCloudClaimToken ?? (resumeStoredLocalSession ? activeOnboardingClaimToken : null),
    clearLocalOnboardingSession: () => {
      setLocalCloudClaimToken(null);
      setLocalCloudSessionId(null);
      clearOnboardingSession();
      setDemoSession(null);
    },
    createSession: createSessionMutation.mutateAsync,
    hasClaimToken: mode === "demo" ? Boolean(demoSession?.claimToken) : Boolean(activeOnboardingClaimToken),
    isBusy:
      createSessionMutation.isPending ||
      markWaitingMutation.isPending ||
      cancelMutation.isPending ||
      redeemMutation.isPending ||
      restoreMutation.isPending,
    isLoading: latestActiveSessionQuery.isLoading || onboardingSessionQuery.isLoading,
    isPolling: mode === "demo" ? session?.status === "awaiting_cloud" : onboardingSessionQuery.isFetching && session?.status === "awaiting_cloud",
    markWaiting: markWaitingMutation.mutateAsync,
    refreshSession: mode === "demo" ? async () => ({ data: demoSession }) : onboardingSessionQuery.refetch,
    restoreCandidates: mode === "demo" ? [] : restoreCandidatesQuery.data ?? [],
    restorePreviousBoard: restoreMutation.mutateAsync,
    session,
    sessionId,
    simulateRedeemForTesting: redeemMutation.mutateAsync,
    isRestoringBoard: restoreMutation.isPending,
  };
}
