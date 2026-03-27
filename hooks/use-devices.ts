import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  applyDeviceSettingsFromApp,
  applyHistoryDraftFromApp,
  claimDevice,
  enterWifiRecoveryFromApp,
  fetchDeviceCommandStatus,
  fetchOwnedDevices,
  queueFriendCelebrationPreviewFromApp,
  removeDeviceFromAccountFromApp,
  resetDeviceHistoryFromApp,
  requestDeviceFactoryResetFromApp,
  requestRuntimeSnapshotFromApp,
  saveActiveHabitMetadataFromApp,
  setActiveHabitStartDateFromApp,
  setDayStateFromApp,
} from "@/lib/supabase/addone-repository";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import { DEVICE_OFFLINE_CONFIRMATION_MS, latestConnectionActivityAt } from "@/lib/device-connection";
import { areCustomPalettesEqual, sanitizeCustomPalette } from "@/lib/device-settings";
import { buildRestoreHistoryDraft, buildRestoreSettingsPatch } from "@/lib/onboarding-restore";
import { useAuth } from "@/hooks/use-auth";
import { useAddOneStore } from "@/store/addone-store";
import { useAppUiStore } from "@/store/app-ui-store";
import {
  AddOneDevice,
  CelebrationTransitionSpeed,
  CelebrationTransitionStyle,
  DeviceSettingsPatch,
  HistoryDraftUpdate,
  OnboardingRestoreSource,
  SyncState,
} from "@/types/addone";

type DeviceRemovalProgressState = "idle" | "removing_offline" | "sending_reset" | "waiting_for_board";

function randomHexSegment(length: number) {
  let output = "";

  while (output.length < length) {
    output += Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  }

  return output.slice(0, length);
}

function makeClientEventId() {
  return [
    randomHexSegment(8),
    randomHexSegment(4),
    `4${randomHexSegment(3)}`,
    `${(Math.floor(Math.random() * 4) + 8).toString(16)}${randomHexSegment(3)}`,
    randomHexSegment(12),
  ].join("-");
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const DEVICE_SNAPSHOT_SELF_HEAL_MS = 30_000;
const LIVE_WAIT_CACHE_POLL_MS = 100;
const LIVE_WAIT_REFRESH_MS = 1_500;
const CONNECTIVITY_CHECKING_MS = 10_000;

function isTransientNetworkFailureMessage(message: string) {
  return /network request failed|network request timed out|timed out|failed to fetch|load failed/i.test(message);
}

function getDayStateByLocalDate(device: AddOneDevice, localDate: string) {
  const dateGrid = device.dateGrid ?? [];

  for (let weekIndex = 0; weekIndex < dateGrid.length; weekIndex += 1) {
    const dayIndex = dateGrid[weekIndex]?.indexOf(localDate) ?? -1;
    if (dayIndex >= 0) {
      return device.days[weekIndex]?.[dayIndex];
    }
  }

  return undefined;
}

function deviceMatchesHistory(device: AddOneDevice, updates: HistoryDraftUpdate[]) {
  return updates.every((update) => getDayStateByLocalDate(device, update.localDate) === update.isDone);
}

function deviceMatchesSettingsPatch(device: AddOneDevice, patch: DeviceSettingsPatch) {
  if (patch.ambient_auto !== undefined && device.autoBrightness !== patch.ambient_auto) {
    return false;
  }
  if (patch.brightness !== undefined && device.brightness !== patch.brightness) {
    return false;
  }
  if (patch.day_reset_time !== undefined && device.resetTime !== patch.day_reset_time.slice(0, 5)) {
    return false;
  }
  if (patch.name !== undefined && device.name !== patch.name) {
    return false;
  }
  if (patch.palette_preset !== undefined && device.paletteId !== patch.palette_preset) {
    return false;
  }
  if (patch.palette_custom !== undefined && !areCustomPalettesEqual(device.customPalette, sanitizeCustomPalette(patch.palette_custom))) {
    return false;
  }
  if (patch.timezone !== undefined && device.timezone !== patch.timezone) {
    return false;
  }
  if (patch.weekly_target !== undefined && device.weeklyTarget !== patch.weekly_target) {
    return false;
  }

  return true;
}

function isRuntimeRevisionConflictError(message: string) {
  return message.includes("Runtime revision conflict");
}

function buildCelebrationPreviewBoard(device: AddOneDevice) {
  return Array.from({ length: 21 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      if (weekIndex === 0) {
        return dayIndex <= Math.min(device.today.dayIndex, 6);
      }

      if (weekIndex < 6) {
        return dayIndex === (weekIndex % 7) || dayIndex === (6 - (weekIndex % 7));
      }

      if (weekIndex < 12) {
        return dayIndex <= 2 || (weekIndex % 2 === 0 && dayIndex === 6);
      }

      if (weekIndex < 18) {
        return dayIndex >= 4;
      }

      return (weekIndex + dayIndex) % 3 === 0;
    }),
  );
}

type CelebrationPreviewRequest = {
  boardDays?: boolean[][];
  dwellSeconds?: number;
  deviceId?: string;
  paletteCustom?: Record<string, string>;
  palettePreset?: string;
  sourceDeviceId?: string;
  transitionSpeed?: CelebrationTransitionSpeed;
  transitionStyle?: CelebrationTransitionStyle;
  weeklyTarget?: number;
};

export function useDevices() {
  const { isAuthenticated, mode, status, user, userEmail } = useAuth();
  const demoDevices = useAddOneStore((state) => state.devices);
  const demoActiveDeviceId = useAddOneStore((state) => state.activeDeviceId);
  const setDemoActiveDevice = useAddOneStore((state) => state.setActiveDevice);
  const cloudActiveDeviceId = useAppUiStore((state) => state.activeDeviceId);
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const clearPendingTodayState = useAppUiStore((state) => state.clearPendingTodayState);
  const clearConnectivityIssue = useAppUiStore((state) => state.clearConnectivityIssue);
  const connectivityIssueByDevice = useAppUiStore((state) => state.connectivityIssueByDevice);
  const clearRuntimeConflictRecovery = useAppUiStore((state) => state.clearRuntimeConflictRecovery);
  const recoveryNeededRevisionByDevice = useAppUiStore((state) => state.recoveryNeededRevisionByDevice);
  const setCloudActiveDeviceId = useAppUiStore((state) => state.setActiveDeviceId);

  const devicesQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && !!user?.id,
    queryFn: () => fetchOwnedDevices({ userEmail, userId: user!.id }),
    queryKey: addOneQueryKeys.devices(user?.id),
    // Keep a light self-heal refetch even with realtime enabled.
    refetchInterval: mode === "cloud" && status === "signedIn" ? DEVICE_SNAPSHOT_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const baseDevices = mode === "demo" ? demoDevices : devicesQuery.data ?? [];
  const devices = baseDevices.map((device) => {
    const recoveryNeededRevision = recoveryNeededRevisionByDevice[device.id];
    if (
      recoveryNeededRevision === undefined ||
      device.accountRemovalState !== "active" ||
      device.recoveryState !== "ready" ||
      device.runtimeRevision !== recoveryNeededRevision
    ) {
      return device;
    }

    const syncState: SyncState = device.isLive ? "syncing" : "offline";

    return {
      ...device,
      recoveryState: "needs_recovery" as const,
      syncState,
    };
  });
  const effectiveDevices = devices.map((device) => {
    const connectivityIssue = connectivityIssueByDevice[device.id];
    if (!connectivityIssue || device.accountRemovalState !== "active" || device.recoveryState !== "ready") {
      return device;
    }

    const timestampsChanged =
      (device.lastSeenAt ?? null) !== connectivityIssue.lastSeenAt ||
      (device.lastSnapshotAt ?? null) !== connectivityIssue.lastSnapshotAt ||
      (device.lastSyncAt ?? null) !== connectivityIssue.lastSyncAt;
    if (timestampsChanged) {
      return device;
    }

    const syncState: SyncState = Date.now() - connectivityIssue.markedAt < CONNECTIVITY_CHECKING_MS ? "syncing" : "offline";

    return {
      ...device,
      isLive: false,
      syncState,
    };
  });
  const activeDeviceId = mode === "demo" ? demoActiveDeviceId : cloudActiveDeviceId;

  useEffect(() => {
    if (mode !== "cloud") {
      return;
    }

    for (const [deviceId, recoveryNeededRevision] of Object.entries(recoveryNeededRevisionByDevice)) {
      const matchingDevice = baseDevices.find((device) => device.id === deviceId);
      if (!matchingDevice) {
        clearRuntimeConflictRecovery(deviceId);
        continue;
      }

      if (
        matchingDevice.accountRemovalState !== "active" ||
        matchingDevice.recoveryState !== "ready" ||
        matchingDevice.runtimeRevision !== recoveryNeededRevision
      ) {
        clearRuntimeConflictRecovery(deviceId);
      }
    }
  }, [baseDevices, clearRuntimeConflictRecovery, mode, recoveryNeededRevisionByDevice]);

  useEffect(() => {
    if (mode !== "cloud") {
      return;
    }

    for (const [deviceId, connectivityIssue] of Object.entries(connectivityIssueByDevice)) {
      const matchingDevice = baseDevices.find((device) => device.id === deviceId);
      if (!matchingDevice || !connectivityIssue) {
        clearConnectivityIssue(deviceId);
        continue;
      }

      const timestampsChanged =
        (matchingDevice.lastSeenAt ?? null) !== connectivityIssue.lastSeenAt ||
        (matchingDevice.lastSnapshotAt ?? null) !== connectivityIssue.lastSnapshotAt ||
        (matchingDevice.lastSyncAt ?? null) !== connectivityIssue.lastSyncAt;
      if (
        matchingDevice.accountRemovalState !== "active" ||
        timestampsChanged ||
        matchingDevice.recoveryState !== "ready"
      ) {
        clearConnectivityIssue(deviceId);
      }
    }
  }, [baseDevices, clearConnectivityIssue, connectivityIssueByDevice, mode]);

  useEffect(() => {
    if (mode !== "cloud") {
      return;
    }

    if (effectiveDevices.length === 0) {
      if (cloudActiveDeviceId !== null) {
        setCloudActiveDeviceId(null);
      }
      return;
    }

    if (!cloudActiveDeviceId || !effectiveDevices.some((device) => device.id === cloudActiveDeviceId)) {
      setCloudActiveDeviceId(effectiveDevices[0].id);
    }
  }, [cloudActiveDeviceId, effectiveDevices, mode, setCloudActiveDeviceId]);

  const activeDevice = effectiveDevices.find((device) => device.id === activeDeviceId) ?? effectiveDevices[0] ?? null;

  useEffect(() => {
    for (const [deviceId, pendingState] of Object.entries(pendingTodayStateByDevice)) {
      if (pendingState === undefined) {
        continue;
      }

      const matchingDevice = effectiveDevices.find((device) => device.id === deviceId);
      if (!matchingDevice) {
        continue;
      }

      const localDate = matchingDevice.dateGrid?.[matchingDevice.today.weekIndex]?.[matchingDevice.today.dayIndex];
      if (!localDate) {
        continue;
      }

      if (getDayStateByLocalDate(matchingDevice, localDate) === pendingState) {
        clearPendingTodayState(deviceId);
      }
    }
  }, [clearPendingTodayState, effectiveDevices, pendingTodayStateByDevice]);

  return {
    activeDevice,
    activeDeviceId: activeDevice?.id ?? null,
    devices: effectiveDevices,
    isAuthenticated,
    isLoading: mode === "cloud" ? devicesQuery.isLoading : false,
    mode,
    setActiveDevice: mode === "demo" ? setDemoActiveDevice : setCloudActiveDeviceId,
  };
}

export function useDeviceActions() {
  const { activeDevice, devices } = useDevices();
  const { mode, user, userEmail } = useAuth();
  const queryClient = useQueryClient();
  const clearConnectivityIssue = useAppUiStore((state) => state.clearConnectivityIssue);
  const clearPendingTodayState = useAppUiStore((state) => state.clearPendingTodayState);
  const clearRuntimeConflictRecovery = useAppUiStore((state) => state.clearRuntimeConflictRecovery);
  const markConnectivityIssue = useAppUiStore((state) => state.markConnectivityIssue);
  const markRuntimeConflictRecovery = useAppUiStore((state) => state.markRuntimeConflictRecovery);
  const setPendingTodayState = useAppUiStore((state) => state.setPendingTodayState);
  const [isAwaitingSettingsConfirmation, setIsAwaitingSettingsConfirmation] = useState(false);
  const [deviceRemovalState, setDeviceRemovalState] = useState<{
    deadlineAt: string | null;
    deviceId: string | null;
    phase: DeviceRemovalProgressState;
  }>({
    deadlineAt: null,
    deviceId: null,
    phase: "idle",
  });

  const demoActions = {
    setAutoBrightness: useAddOneStore((state) => state.setAutoBrightness),
    setPalette: useAddOneStore((state) => state.setPalette),
    setResetTime: useAddOneStore((state) => state.setResetTime),
    setTimezone: useAddOneStore((state) => state.setTimezone),
    setWeeklyTarget: useAddOneStore((state) => state.setWeeklyTarget),
    toggleHistoryCell: useAddOneStore((state) => state.toggleHistoryCell),
    toggleToday: useAddOneStore((state) => state.toggleToday),
  };

  const loadLatestDevices = async () => {
    if (!user?.id) {
      return [] as AddOneDevice[];
    }

    try {
      return await queryClient.fetchQuery({
        queryFn: () => fetchOwnedDevices({ userEmail, userId: user.id }),
        queryKey: addOneQueryKeys.devices(user.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTransientNetworkFailureMessage(message)) {
        return queryClient.getQueryData<AddOneDevice[]>(addOneQueryKeys.devices(user.id)) ?? [];
      }

      throw error;
    }
  };

  const getCachedDevices = () => {
    if (!user?.id) {
      return [] as AddOneDevice[];
    }

    return queryClient.getQueryData<AddOneDevice[]>(addOneQueryKeys.devices(user.id)) ?? [];
  };

  const invalidateCloudDevices = async () => {
    if (!user?.id) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) }, { cancelRefetch: false });
  };

  const refreshDevices = async (options?: { probeDeviceId?: string | null }) => {
    if (mode !== "cloud") {
      return {
        markedConnectivityIssue: false,
        probeDevice: null as AddOneDevice | null,
      };
    }

    const probeDeviceId = options?.probeDeviceId ?? null;
    const previousProbeDevice = probeDeviceId ? resolveDevice(probeDeviceId) : null;
    const latestDevices = await loadLatestDevices();
    const probeDevice = probeDeviceId ? latestDevices.find((device) => device.id === probeDeviceId) ?? null : null;

    if (!probeDevice) {
      if (probeDeviceId) {
        clearConnectivityIssue(probeDeviceId);
      }

      return {
        markedConnectivityIssue: false,
        probeDevice: null as AddOneDevice | null,
      };
    }

    const didAdvanceTimestamps =
      !!previousProbeDevice &&
      (
        (probeDevice.lastSeenAt ?? null) !== (previousProbeDevice.lastSeenAt ?? null) ||
        (probeDevice.lastSnapshotAt ?? null) !== (previousProbeDevice.lastSnapshotAt ?? null) ||
        (probeDevice.lastSyncAt ?? null) !== (previousProbeDevice.lastSyncAt ?? null)
      );
    const latestActivityAt = latestConnectionActivityAt(probeDevice) ?? 0;
    const latestActivityAgeMs = latestActivityAt > 0 ? Date.now() - latestActivityAt : Number.POSITIVE_INFINITY;
    const shouldMarkConnectivityIssue =
      probeDevice.accountRemovalState === "active" &&
      probeDevice.recoveryState === "ready" &&
      !didAdvanceTimestamps &&
      latestActivityAgeMs >= DEVICE_OFFLINE_CONFIRMATION_MS;

    if (shouldMarkConnectivityIssue) {
      markConnectivityIssue(probeDevice.id, {
        lastSeenAt: probeDevice.lastSeenAt ?? null,
        lastSnapshotAt: probeDevice.lastSnapshotAt ?? null,
        lastSyncAt: probeDevice.lastSyncAt ?? null,
      });
    } else {
      clearConnectivityIssue(probeDevice.id);
    }

    return {
      markedConnectivityIssue: shouldMarkConnectivityIssue,
      probeDevice,
    };
  };

  const resolveDevice = (deviceId?: string | null) => devices.find((device) => device.id === deviceId) ?? activeDevice ?? null;

  const resolveFreshDevice = async (deviceId?: string | null) => {
    const current = resolveDevice(deviceId);

    if (mode !== "cloud") {
      return current;
    }

    const latestDevices = await loadLatestDevices();
    return latestDevices.find((device) => device.id === (deviceId ?? current?.id)) ?? current;
  };

  const resolveFreshLiveDevice = async (deviceId?: string | null) => {
    return requireLiveDevice(await resolveFreshDevice(deviceId));
  };

  const requireLiveDevice = (device: AddOneDevice | null) => {
    if (!device) {
      throw new Error("No AddOne device is active.");
    }

    if (!device.isLive) {
      throw new Error("The device is offline. Reconnect it through cloud or join its AddOne AP for live changes.");
    }

    return device;
  };

  const markDeviceNeedsRecoveryFromConflict = (deviceId: string, runtimeRevision?: number) => {
    markRuntimeConflictRecovery(deviceId, {
      runtimeRevision: runtimeRevision ?? resolveDevice(deviceId)?.runtimeRevision ?? 0,
    });
  };

  const markDeviceConnectivityIssueFromTimeout = (deviceId: string) => {
    const device = resolveDevice(deviceId);
    if (!device) {
      return;
    }

    markConnectivityIssue(deviceId, {
      lastSeenAt: device.lastSeenAt ?? null,
      lastSnapshotAt: device.lastSnapshotAt ?? null,
      lastSyncAt: device.lastSyncAt ?? null,
    });
  };

  const readCommandFailure = async (commandId?: string | null) => {
    if (!commandId) {
      return null;
    }

    try {
      const command = await fetchDeviceCommandStatus(commandId);
      if (command.status === "failed" || command.status === "cancelled") {
        return command.last_error ?? "The device rejected the requested change.";
      }
    } catch {
      // Command row visibility is not the runtime source of truth. Ignore lookup misses here.
    }

    return null;
  };

  const waitForDeviceMatch = async (
    deviceId: string,
    options: {
      baseRevision?: number;
      commandId?: string | null;
      errorMessage?: string;
      requireRevisionAdvance?: boolean;
      timeoutMs?: number;
    },
    predicate: (device: AddOneDevice) => boolean,
  ) => {
    const timeoutMs = options.timeoutMs ?? 12_000;
    const startedAt = Date.now();
    let lastRefreshAt = 0;
    const requireRevisionAdvance = options.requireRevisionAdvance ?? false;

    while (Date.now() - startedAt < timeoutMs) {
      const latestDevices = getCachedDevices();
      const next = latestDevices.find((device) => device.id === deviceId);
      const revisionSatisfied =
        options.baseRevision === undefined || !requireRevisionAdvance || (next?.runtimeRevision ?? 0) > options.baseRevision;
      if (next && revisionSatisfied && predicate(next)) {
        return next;
      }

      if (Date.now() - lastRefreshAt >= LIVE_WAIT_REFRESH_MS) {
        void invalidateCloudDevices();
        lastRefreshAt = Date.now();
      }

      await sleep(LIVE_WAIT_CACHE_POLL_MS);
    }

    const finalDevices = await loadLatestDevices();
    const finalMatch = finalDevices.find((device) => device.id === deviceId);
    const finalRevisionSatisfied =
      options.baseRevision === undefined ||
      !requireRevisionAdvance ||
      (finalMatch?.runtimeRevision ?? 0) > options.baseRevision;
    if (finalMatch && finalRevisionSatisfied && predicate(finalMatch)) {
      return finalMatch;
    }

    const failure = await readCommandFailure(options.commandId);
    if (failure) {
      if (isRuntimeRevisionConflictError(failure)) {
        markDeviceNeedsRecoveryFromConflict(deviceId, options.baseRevision);
      }
      throw new Error(failure);
    }

    markDeviceConnectivityIssueFromTimeout(deviceId);
    throw new Error(options.errorMessage ?? "The device did not mirror the latest state in time.");
  };

  const claimMutation = useMutation({
    mutationFn: claimDevice,
    onSuccess: invalidateCloudDevices,
  });

  const refreshRuntimeMutation = useMutation({
    mutationFn: requestRuntimeSnapshotFromApp,
  });

  const setDayStateMutation = useMutation({
    mutationFn: setDayStateFromApp,
  });

  const historyDraftMutation = useMutation({
    mutationFn: applyHistoryDraftFromApp,
  });

  const applySettingsMutation = useMutation({
    mutationFn: ({ deviceId, patch }: { deviceId: string; patch: DeviceSettingsPatch }) =>
      applyDeviceSettingsFromApp(deviceId, patch),
  });
  const wifiRecoveryMutation = useMutation({
    mutationFn: enterWifiRecoveryFromApp,
  });
  const factoryResetMutation = useMutation({
    mutationFn: requestDeviceFactoryResetFromApp,
  });
  const resetHistoryMutation = useMutation({
    mutationFn: resetDeviceHistoryFromApp,
  });
  const saveHabitMetadataMutation = useMutation({
    mutationFn: saveActiveHabitMetadataFromApp,
  });
  const setHabitStartDateMutation = useMutation({
    mutationFn: setActiveHabitStartDateFromApp,
  });
  const removeFromAppMutation = useMutation({
    mutationFn: removeDeviceFromAccountFromApp,
  });
  const celebrationPreviewMutation = useMutation({
    mutationFn: queueFriendCelebrationPreviewFromApp,
  });

  const isBusy =
    claimMutation.isPending ||
    refreshRuntimeMutation.isPending ||
    setDayStateMutation.isPending ||
    historyDraftMutation.isPending ||
    applySettingsMutation.isPending ||
    isAwaitingSettingsConfirmation ||
    wifiRecoveryMutation.isPending ||
    factoryResetMutation.isPending ||
    resetHistoryMutation.isPending ||
    setHabitStartDateMutation.isPending ||
    celebrationPreviewMutation.isPending ||
    removeFromAppMutation.isPending ||
    deviceRemovalState.phase !== "idle";

  const refreshRuntimeSnapshot = async (
    deviceId?: string,
    options?: {
      errorMessage?: string;
      timeoutMs?: number;
    },
  ) => {
    const targetDevice = await resolveFreshLiveDevice(deviceId);
    const previousSnapshotAt = targetDevice.lastSnapshotAt ?? "";
    const previousRevision = targetDevice.runtimeRevision;
    const result = await refreshRuntimeMutation.mutateAsync({
      deviceId: targetDevice.id,
      requestId: makeClientEventId(),
    });

    await waitForDeviceMatch(
      targetDevice.id,
      {
        baseRevision: previousRevision,
        commandId: result.command_id ?? null,
        errorMessage: options?.errorMessage ?? "The device did not publish a fresh runtime snapshot in time.",
        requireRevisionAdvance: false,
        timeoutMs: options?.timeoutMs,
      },
      (device) => (device.lastSnapshotAt ?? "") !== previousSnapshotAt || device.runtimeRevision > previousRevision,
    );
    clearConnectivityIssue(targetDevice.id);
  };

  const waitForDeviceAbsence = async (
    deviceId: string,
    options: {
      commandId?: string | null;
      errorMessage?: string;
      timeoutMs?: number;
    },
  ) => {
    const timeoutMs = options.timeoutMs ?? 20_000;
    const startedAt = Date.now();
    let lastRefreshAt = 0;

    while (Date.now() - startedAt < timeoutMs) {
      const latestDevices = getCachedDevices();
      if (!latestDevices.some((device) => device.id === deviceId)) {
        return;
      }

      if (Date.now() - lastRefreshAt >= LIVE_WAIT_REFRESH_MS) {
        void invalidateCloudDevices();
        lastRefreshAt = Date.now();
      }

      await sleep(LIVE_WAIT_CACHE_POLL_MS);
    }

    const finalDevices = await loadLatestDevices();
    if (!finalDevices.some((device) => device.id === deviceId)) {
      return;
    }

    const failure = await readCommandFailure(options.commandId);
    if (failure) {
      throw new Error(failure);
    }

    throw new Error(options.errorMessage ?? "The device is still attached to this account.");
  };

  const waitForCommandApplied = async (
    commandId: string,
    options?: {
      errorMessage?: string;
      timeoutMs?: number;
    },
  ) => {
    const timeoutMs = options?.timeoutMs ?? 12_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const command = await fetchDeviceCommandStatus(commandId);
      if (command.status === "applied") {
        return command;
      }

      if (command.status === "failed" || command.status === "cancelled") {
        throw new Error(command.last_error ?? options?.errorMessage ?? "The device rejected the test celebration.");
      }

      await sleep(LIVE_WAIT_CACHE_POLL_MS);
    }

    throw new Error(options?.errorMessage ?? "The device did not start the test celebration in time.");
  };

  const applySettingsPatch = async (patch: DeviceSettingsPatch, deviceId?: string) => {
    const targetDevice = await resolveFreshLiveDevice(deviceId);
    const baseRevision = targetDevice.runtimeRevision;
    const result = await applySettingsMutation.mutateAsync({
      deviceId: targetDevice.id,
      patch,
    });

    await waitForDeviceMatch(
      targetDevice.id,
      {
        baseRevision,
        commandId: result.command_id ?? null,
        errorMessage: "The device did not confirm the updated settings in time.",
        requireRevisionAdvance: true,
      },
      (device) => deviceMatchesSettingsPatch(device, patch),
    );
    clearConnectivityIssue(targetDevice.id);
    clearRuntimeConflictRecovery(targetDevice.id);
    void invalidateCloudDevices();
  };

  const applySettingsDraft = async (patch: DeviceSettingsPatch, deviceId?: string) => {
    const normalizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as DeviceSettingsPatch;

    if (Object.keys(normalizedPatch).length === 0) {
      return;
    }

    if (mode === "demo") {
      if (normalizedPatch.weekly_target !== undefined) {
        demoActions.setWeeklyTarget(normalizedPatch.weekly_target);
      }
      if (normalizedPatch.timezone !== undefined) {
        demoActions.setTimezone(normalizedPatch.timezone);
      }
      if (normalizedPatch.day_reset_time !== undefined) {
        demoActions.setResetTime(normalizedPatch.day_reset_time.slice(0, 5));
      }
      if (normalizedPatch.palette_preset !== undefined) {
        demoActions.setPalette(normalizedPatch.palette_preset);
      }
      if (normalizedPatch.ambient_auto !== undefined) {
        demoActions.setAutoBrightness(normalizedPatch.ambient_auto);
      }
      return;
    }

    setIsAwaitingSettingsConfirmation(true);
    try {
      await applySettingsPatch(normalizedPatch, deviceId);
    } finally {
      setIsAwaitingSettingsConfirmation(false);
    }
  };

  const restoreBoardFromSnapshot = async (source: OnboardingRestoreSource, deviceId?: string) => {
    const issueRestore = async (allowRetry: boolean) => {
      let targetDevice = await resolveFreshLiveDevice(deviceId);
      await refreshRuntimeSnapshot(targetDevice.id);
      targetDevice = await resolveFreshLiveDevice(targetDevice.id);

      const settingsPatch = buildRestoreSettingsPatch(source, targetDevice);
      if (settingsPatch) {
        await applySettingsPatch(settingsPatch, targetDevice.id);
        targetDevice = await resolveFreshLiveDevice(targetDevice.id);
      }

      await saveHabitMetadataMutation.mutateAsync({
        dailyMinimum: source.settings.dailyMinimum,
        deviceId: targetDevice.id,
        habitName: source.settings.name,
        weeklyTarget: source.settings.weeklyTarget,
      });
      await invalidateCloudDevices();

      const updates = buildRestoreHistoryDraft(source);
      if (updates.length === 0) {
        void invalidateCloudDevices();
        return;
      }

      try {
        const baseRevision = targetDevice.runtimeRevision;
        const result = await historyDraftMutation.mutateAsync({
          baseRevision,
          deviceId: targetDevice.id,
          draftId: makeClientEventId(),
          updates,
        });

        await waitForDeviceMatch(
          targetDevice.id,
          {
            baseRevision,
            commandId: result.command_id ?? null,
            errorMessage: "The device did not confirm the restored board in time.",
            requireRevisionAdvance: true,
          },
          (device) => deviceMatchesHistory(device, updates),
        );
        clearConnectivityIssue(targetDevice.id);
        clearRuntimeConflictRecovery(targetDevice.id);
        void invalidateCloudDevices();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to restore the saved board.";
        if (allowRetry && isRuntimeRevisionConflictError(message)) {
          try {
            await refreshRuntimeSnapshot(targetDevice.id);
          } catch {
            await invalidateCloudDevices();
          }
          return issueRestore(false);
        }

        if (isRuntimeRevisionConflictError(message)) {
          markDeviceNeedsRecoveryFromConflict(targetDevice.id, targetDevice.runtimeRevision);
        }

        throw error;
      }
    };

    await issueRestore(true);
  };

  if (mode === "demo") {
    return {
      applySettingsDraft,
      claimDevice: claimMutation.mutateAsync,
      commitHistoryDraft: async () => undefined,
      isApplyingToday: false,
      isBusy,
      isRefreshingRuntimeSnapshot: false,
      isSavingHistoryDraft: false,
      isSavingSettings: false,
      isRemovingDeviceFromApp: false,
      isResettingHistory: false,
      isPreviewingCelebration: false,
      isStartingFactoryReset: false,
      isStartingWifiRecovery: false,
      removalDeadlineAt: null as string | null,
      removalPhase: "idle" as DeviceRemovalProgressState,
      factoryResetAndRemove: async (_deviceId?: string) => undefined,
      previewCelebration: async (_params?: CelebrationPreviewRequest | string) => undefined,
      resetHistory: async (_params?: {
        dailyMinimum: string;
        deviceId?: string;
        habitName: string;
        weeklyTarget: number;
      }) => undefined,
      requestFactoryReset: async (_deviceId?: string) => undefined,
      requestWifiRecovery: async (_deviceId?: string) => undefined,
      refreshDevices: async () => ({
        markedConnectivityIssue: false,
        probeDevice: null as AddOneDevice | null,
      }),
      refreshRuntimeSnapshot: async () => undefined,
      saveActiveHabitMetadata: async (_params: {
        dailyMinimum: string;
        deviceId?: string;
        habitName: string;
        weeklyTarget: number;
      }) => undefined,
      setActiveHabitStartDate: async (_habitStartedOnLocal: string, _deviceId?: string) => undefined,
      isUpdatingHabitStartDate: false,
      restoreBoardFromSnapshot: async (_source: OnboardingRestoreSource, _deviceId?: string) => undefined,
      toggleHistoryCell: demoActions.toggleHistoryCell,
      toggleToday: async (_deviceId?: string) => {
        demoActions.toggleToday();
      },
    };
  }

  return {
    applySettingsDraft,
    claimDevice: claimMutation.mutateAsync,
    commitHistoryDraft: async (
      updates: HistoryDraftUpdate[],
      baseRevision: number,
      deviceId?: string,
    ) => {
      const targetDevice = requireLiveDevice(resolveDevice(deviceId));
      if (updates.length === 0) {
        return;
      }

      const result = await historyDraftMutation.mutateAsync({
        baseRevision,
        deviceId: targetDevice.id,
        draftId: makeClientEventId(),
        updates,
      });

      await waitForDeviceMatch(
        targetDevice.id,
        {
          baseRevision,
          commandId: result.command_id ?? null,
          errorMessage: "The device did not confirm the saved history draft in time.",
          requireRevisionAdvance: true,
        },
        (device) => deviceMatchesHistory(device, updates),
      );
      clearConnectivityIssue(targetDevice.id);
      clearRuntimeConflictRecovery(targetDevice.id);
      void invalidateCloudDevices();
    },
    isApplyingToday: setDayStateMutation.isPending,
    isBusy,
    isRefreshingRuntimeSnapshot: refreshRuntimeMutation.isPending,
    isSavingHistoryDraft: historyDraftMutation.isPending,
    isSavingSettings: applySettingsMutation.isPending || saveHabitMetadataMutation.isPending || isAwaitingSettingsConfirmation,
    isUpdatingHabitStartDate: setHabitStartDateMutation.isPending,
    isRemovingDeviceFromApp: removeFromAppMutation.isPending || deviceRemovalState.phase !== "idle",
    isResettingHistory: resetHistoryMutation.isPending,
    isPreviewingCelebration: celebrationPreviewMutation.isPending,
    isStartingFactoryReset: factoryResetMutation.isPending,
    isStartingWifiRecovery: wifiRecoveryMutation.isPending,
    removalDeadlineAt: deviceRemovalState.deadlineAt,
    removalPhase: deviceRemovalState.phase,
    factoryResetAndRemove: async (deviceId?: string) => {
      const targetDevice = await resolveFreshDevice(deviceId);
      if (!targetDevice) {
        throw new Error("No AddOne device is active.");
      }

      if (targetDevice.accountRemovalState === "pending_device_reset") {
        throw new Error("Removal is already in progress for this board.");
      }

      const remoteReset = targetDevice.isLive;
      setDeviceRemovalState({
        deadlineAt: null,
        deviceId: targetDevice.id,
        phase: remoteReset ? "sending_reset" : "removing_offline",
      });

      try {
        const result = await removeFromAppMutation.mutateAsync({
          deviceId: targetDevice.id,
          remoteReset,
          requestId: makeClientEventId(),
        });

        if (result.mode === "remote_reset_remove") {
          setDeviceRemovalState({
            deadlineAt: result.removal_deadline_at,
            deviceId: targetDevice.id,
            phase: "waiting_for_board",
          });
        }

        await waitForDeviceAbsence(targetDevice.id, {
          commandId: result.command_id ?? null,
          errorMessage: remoteReset
            ? "The device did not leave this account in time."
            : "The device is still attached to this account.",
          timeoutMs: remoteReset ? 40_000 : 8_000,
        });
        useAppUiStore.getState().clearOnboardingSession();
        void invalidateCloudDevices();
      } finally {
        setDeviceRemovalState({
          deadlineAt: null,
          deviceId: null,
          phase: "idle",
        });
      }
    },
    previewCelebration: async (params?: CelebrationPreviewRequest | string) => {
      const normalizedParams =
        typeof params === "string" || params === undefined ? { deviceId: params } : params;
      const targetDevice = await resolveFreshLiveDevice(normalizedParams.deviceId);
      const result = await celebrationPreviewMutation.mutateAsync({
        boardDays: normalizedParams.boardDays ?? buildCelebrationPreviewBoard(targetDevice),
        dwellSeconds: normalizedParams.dwellSeconds,
        deviceId: targetDevice.id,
        paletteCustom:
          normalizedParams.paletteCustom ??
          (sanitizeCustomPalette(targetDevice.customPalette) as Record<string, string>),
        palettePreset: normalizedParams.palettePreset ?? targetDevice.paletteId,
        requestId: makeClientEventId(),
        sourceDeviceId: normalizedParams.sourceDeviceId,
        transitionSpeed: normalizedParams.transitionSpeed,
        transitionStyle: normalizedParams.transitionStyle,
        weeklyTarget: normalizedParams.weeklyTarget ?? targetDevice.weeklyTarget,
      });

      await waitForCommandApplied(result.id, {
        errorMessage: "The device did not start the celebration preview in time.",
      });
    },
    resetHistory: async (params?: {
      dailyMinimum: string;
      deviceId?: string;
      habitName: string;
      weeklyTarget: number;
    }) => {
      const targetDevice = await resolveFreshLiveDevice(params?.deviceId);
      const baseRevision = targetDevice.runtimeRevision;
      const result = await resetHistoryMutation.mutateAsync({
        dailyMinimum: params?.dailyMinimum ?? targetDevice.dailyMinimum,
        deviceId: targetDevice.id,
        habitName: params?.habitName ?? targetDevice.name,
        requestId: makeClientEventId(),
        weeklyTarget: params?.weeklyTarget ?? targetDevice.weeklyTarget,
      });

      await waitForDeviceMatch(
        targetDevice.id,
        {
          baseRevision,
          commandId: result.command_id ?? null,
          errorMessage: "The device did not clear its history in time.",
          requireRevisionAdvance: true,
          timeoutMs: 20_000,
        },
        (device) =>
          device.recordedDaysTotal === 0 &&
          device.successfulWeeksTotal === 0 &&
          device.name === (params?.habitName ?? targetDevice.name) &&
          device.dailyMinimum === (params?.dailyMinimum ?? targetDevice.dailyMinimum) &&
          device.weeklyTarget === (params?.weeklyTarget ?? targetDevice.weeklyTarget),
      );
      clearConnectivityIssue(targetDevice.id);
      clearRuntimeConflictRecovery(targetDevice.id);
      void invalidateCloudDevices();
    },
    requestFactoryReset: async (deviceId?: string) => {
      const targetDevice = await resolveFreshLiveDevice(deviceId);
      await factoryResetMutation.mutateAsync({
        deviceId: targetDevice.id,
        requestId: makeClientEventId(),
      });
    },
    requestWifiRecovery: async (deviceId?: string) => {
      const targetDevice = await resolveFreshLiveDevice(deviceId);
      await wifiRecoveryMutation.mutateAsync({
        deviceId: targetDevice.id,
        requestId: makeClientEventId(),
      });
    },
    refreshDevices,
    refreshRuntimeSnapshot,
    saveActiveHabitMetadata: async (params: {
      dailyMinimum: string;
      deviceId?: string;
      habitName: string;
      weeklyTarget: number;
    }) => {
      const targetDevice = await resolveFreshLiveDevice(params.deviceId);
      await saveHabitMetadataMutation.mutateAsync({
        dailyMinimum: params.dailyMinimum,
        deviceId: targetDevice.id,
        habitName: params.habitName,
        weeklyTarget: params.weeklyTarget,
      });
      void invalidateCloudDevices();
    },
    setActiveHabitStartDate: async (habitStartedOnLocal: string, deviceId?: string) => {
      const targetDevice = await resolveFreshLiveDevice(deviceId);
      await setHabitStartDateMutation.mutateAsync({
        deviceId: targetDevice.id,
        habitStartedOnLocal,
      });
      void invalidateCloudDevices();
    },
    restoreBoardFromSnapshot,
    toggleHistoryCell: async () => undefined,
    toggleToday: async (deviceId?: string) => {
      const issueToggle = async (allowRetry: boolean) => {
        let targetDevice = await resolveFreshLiveDevice(deviceId);
        if (targetDevice.needsSnapshotRefresh) {
          await refreshRuntimeSnapshot(targetDevice.id);
          targetDevice = await resolveFreshLiveDevice(targetDevice.id);
        }

        const localDate = targetDevice.dateGrid?.[targetDevice.today.weekIndex]?.[targetDevice.today.dayIndex];
        if (!localDate) {
          throw new Error("The device board is missing today's date.");
        }

        const desiredState = !targetDevice.days[targetDevice.today.weekIndex][targetDevice.today.dayIndex];
        const baseRevision = targetDevice.runtimeRevision;
        setPendingTodayState(targetDevice.id, desiredState);

        let result: Awaited<ReturnType<typeof setDayStateMutation.mutateAsync>> | null = null;

        try {
          result = await setDayStateMutation.mutateAsync({
            baseRevision,
            clientEventId: makeClientEventId(),
            deviceId: targetDevice.id,
            isDone: desiredState,
            localDate,
          });

          await waitForDeviceMatch(
            targetDevice.id,
            {
              baseRevision,
              commandId: result.command_id ?? null,
              errorMessage: "The device did not confirm today's state in time.",
              requireRevisionAdvance: false,
            },
            (device) => getDayStateByLocalDate(device, localDate) === desiredState,
          );
          clearPendingTodayState(targetDevice.id);
          clearConnectivityIssue(targetDevice.id);
          clearRuntimeConflictRecovery(targetDevice.id);
          void invalidateCloudDevices();
        } catch (error) {
          const appliedCommand =
            result?.command_id
              ? await fetchDeviceCommandStatus(result.command_id).catch(() => null)
              : null;

          if (appliedCommand?.status === "applied") {
            clearConnectivityIssue(targetDevice.id);
            clearRuntimeConflictRecovery(targetDevice.id);
            void invalidateCloudDevices();
            void refreshRuntimeSnapshot(targetDevice.id, {
              errorMessage: "The board changed, but the refreshed snapshot did not arrive in time.",
              timeoutMs: 12_000,
            }).catch((refreshError) => {
              console.warn("Day-state command applied before the runtime snapshot caught up", refreshError);
            });
            return;
          }

          clearPendingTodayState(targetDevice.id);
          const message = error instanceof Error ? error.message : "Failed to change today's state.";
          if (allowRetry && isRuntimeRevisionConflictError(message)) {
            try {
              await refreshRuntimeSnapshot(targetDevice.id);
            } catch {
              await invalidateCloudDevices();
            }
            return issueToggle(false);
          }

          if (isRuntimeRevisionConflictError(message)) {
            markDeviceNeedsRecoveryFromConflict(targetDevice.id, targetDevice.runtimeRevision);
          }

          throw error;
        }
      };

      await issueToggle(true);
    },
  };
}
