import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  applyDeviceSettingsFromApp,
  applyHistoryDraftFromApp,
  claimDevice,
  fetchDeviceCommandStatus,
  fetchOwnedDevices,
  fetchSharedBoards,
  requestRuntimeSnapshotFromApp,
  setDayStateFromApp,
  updateMembershipReminder,
} from "@/lib/supabase/addone-repository";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import { useAuth } from "@/hooks/use-auth";
import { useAddOneStore } from "@/store/addone-store";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, DeviceSettingsPatch, HistoryDraftUpdate, RewardTrigger, RewardType, SharedBoard } from "@/types/addone";

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
const SHARED_BOARD_SELF_HEAL_MS = 30_000;
const LIVE_WAIT_CACHE_POLL_MS = 100;
const LIVE_WAIT_REFRESH_MS = 1_500;

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
  if (patch.reward_enabled !== undefined && device.rewardEnabled !== patch.reward_enabled) {
    return false;
  }
  if (patch.reward_trigger !== undefined && device.rewardTrigger !== patch.reward_trigger) {
    return false;
  }
  if (patch.reward_type !== undefined && device.rewardType !== patch.reward_type) {
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

export function useDevices() {
  const { isAuthenticated, mode, status, user, userEmail } = useAuth();
  const demoDevices = useAddOneStore((state) => state.devices);
  const demoActiveDeviceId = useAddOneStore((state) => state.activeDeviceId);
  const setDemoActiveDevice = useAddOneStore((state) => state.setActiveDevice);
  const cloudActiveDeviceId = useAppUiStore((state) => state.activeDeviceId);
  const setCloudActiveDeviceId = useAppUiStore((state) => state.setActiveDeviceId);

  const devicesQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && !!user?.id,
    queryFn: () => fetchOwnedDevices({ userEmail, userId: user!.id }),
    queryKey: addOneQueryKeys.devices(user?.id),
    // Keep a light self-heal refetch even with realtime enabled.
    refetchInterval: mode === "cloud" && status === "signedIn" ? DEVICE_SNAPSHOT_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
  });

  const devices = mode === "demo" ? demoDevices : devicesQuery.data ?? [];
  const activeDeviceId = mode === "demo" ? demoActiveDeviceId : cloudActiveDeviceId;

  useEffect(() => {
    if (mode !== "cloud") {
      return;
    }

    if (devices.length === 0) {
      if (cloudActiveDeviceId !== null) {
        setCloudActiveDeviceId(null);
      }
      return;
    }

    if (!cloudActiveDeviceId || !devices.some((device) => device.id === cloudActiveDeviceId)) {
      setCloudActiveDeviceId(devices[0].id);
    }
  }, [cloudActiveDeviceId, devices, mode, setCloudActiveDeviceId]);

  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? devices[0] ?? null;

  return {
    activeDevice,
    activeDeviceId: activeDevice?.id ?? null,
    devices,
    isAuthenticated,
    isLoading: mode === "cloud" ? devicesQuery.isLoading : false,
    mode,
    setActiveDevice: mode === "demo" ? setDemoActiveDevice : setCloudActiveDeviceId,
  };
}

export function useSharedBoardsData() {
  const { mode, status, user } = useAuth();
  const demoSharedBoards = useAddOneStore((state) => state.sharedBoards);

  const sharedBoardsQuery = useQuery({
    enabled: mode === "cloud" && status === "signedIn" && !!user?.id,
    queryFn: () => fetchSharedBoards(user!.id),
    queryKey: addOneQueryKeys.sharedBoards(user?.id),
    refetchInterval: mode === "cloud" && status === "signedIn" ? SHARED_BOARD_SELF_HEAL_MS : false,
    refetchIntervalInBackground: true,
  });

  return {
    isLoading: mode === "cloud" ? sharedBoardsQuery.isLoading : false,
    sharedBoards: (mode === "demo" ? demoSharedBoards : sharedBoardsQuery.data ?? []) as SharedBoard[],
  };
}

export function useDeviceActions() {
  const { activeDevice, devices } = useDevices();
  const { mode, user, userEmail } = useAuth();
  const queryClient = useQueryClient();
  const clearPendingTodayState = useAppUiStore((state) => state.clearPendingTodayState);
  const setPendingTodayState = useAppUiStore((state) => state.setPendingTodayState);

  const demoActions = {
    setAutoBrightness: useAddOneStore((state) => state.setAutoBrightness),
    setHabitName: useAddOneStore((state) => state.setHabitName),
    setPalette: useAddOneStore((state) => state.setPalette),
    setResetTime: useAddOneStore((state) => state.setResetTime),
    setReminderEnabled: useAddOneStore((state) => state.setReminderEnabled),
    setRewardTrigger: useAddOneStore((state) => state.setRewardTrigger),
    setRewardType: useAddOneStore((state) => state.setRewardType),
    setTimezone: useAddOneStore((state) => state.setTimezone),
    setWeeklyTarget: useAddOneStore((state) => state.setWeeklyTarget),
    toggleHistoryCell: useAddOneStore((state) => state.toggleHistoryCell),
    toggleReward: useAddOneStore((state) => state.toggleReward),
    toggleToday: useAddOneStore((state) => state.toggleToday),
  };

  const loadLatestDevices = async () => {
    if (!user?.id) {
      return [] as AddOneDevice[];
    }

    return queryClient.fetchQuery({
      queryFn: () => fetchOwnedDevices({ userEmail, userId: user.id }),
      queryKey: addOneQueryKeys.devices(user.id),
    });
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

    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) });
    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharedBoards(user.id) });
  };

  const resolveDevice = (deviceId?: string | null) => devices.find((device) => device.id === deviceId) ?? activeDevice ?? null;

  const resolveFreshLiveDevice = async (deviceId?: string | null) => {
    const current = resolveDevice(deviceId);

    if (mode !== "cloud") {
      return requireLiveDevice(current);
    }

    const latestDevices = await loadLatestDevices();
    const latest = latestDevices.find((device) => device.id === (deviceId ?? current?.id)) ?? current;
    return requireLiveDevice(latest ?? null);
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
      timeoutMs?: number;
    },
    predicate: (device: AddOneDevice) => boolean,
  ) => {
    const timeoutMs = options.timeoutMs ?? 12_000;
    const startedAt = Date.now();
    let lastRefreshAt = 0;

    while (Date.now() - startedAt < timeoutMs) {
      const latestDevices = getCachedDevices();
      const next = latestDevices.find((device) => device.id === deviceId);
      if (next && (options.baseRevision === undefined || next.runtimeRevision > options.baseRevision) && predicate(next)) {
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
    if (
      finalMatch &&
      (options.baseRevision === undefined || finalMatch.runtimeRevision > options.baseRevision) &&
      predicate(finalMatch)
    ) {
      return finalMatch;
    }

    const failure = await readCommandFailure(options.commandId);
    if (failure) {
      throw new Error(failure);
    }

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

  const updateMembershipMutation = useMutation({
    mutationFn: updateMembershipReminder,
    onSuccess: invalidateCloudDevices,
  });

  const isBusy =
    claimMutation.isPending ||
    refreshRuntimeMutation.isPending ||
    setDayStateMutation.isPending ||
    historyDraftMutation.isPending ||
    applySettingsMutation.isPending ||
    updateMembershipMutation.isPending;

  const refreshRuntimeSnapshot = async (deviceId?: string) => {
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
        errorMessage: "The device did not publish a fresh runtime snapshot in time.",
      },
      (device) => (device.lastSnapshotAt ?? "") !== previousSnapshotAt || device.runtimeRevision > previousRevision,
    );
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
      },
      (device) => deviceMatchesSettingsPatch(device, patch),
    );
    void invalidateCloudDevices();
  };

  if (mode === "demo") {
    return {
      claimDevice: claimMutation.mutateAsync,
      commitHistoryDraft: async () => undefined,
      isApplyingToday: false,
      isBusy,
      isRefreshingRuntimeSnapshot: false,
      isSavingHistoryDraft: false,
      isSavingSettings: false,
      refreshRuntimeSnapshot: async () => undefined,
      setAutoBrightness: demoActions.setAutoBrightness,
      setHabitName: demoActions.setHabitName,
      setPalette: demoActions.setPalette,
      setReminderEnabled: demoActions.setReminderEnabled,
      setResetTime: demoActions.setResetTime,
      setRewardTrigger: demoActions.setRewardTrigger,
      setRewardType: demoActions.setRewardType,
      setTimezone: demoActions.setTimezone,
      setWeeklyTarget: demoActions.setWeeklyTarget,
      toggleHistoryCell: demoActions.toggleHistoryCell,
      toggleReward: demoActions.toggleReward,
      toggleToday: async (_deviceId?: string) => {
        demoActions.toggleToday();
      },
    };
  }

  return {
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
        },
        (device) => deviceMatchesHistory(device, updates),
      );
      void invalidateCloudDevices();
    },
    isApplyingToday: setDayStateMutation.isPending,
    isBusy,
    isRefreshingRuntimeSnapshot: refreshRuntimeMutation.isPending,
    isSavingHistoryDraft: historyDraftMutation.isPending,
    isSavingSettings: applySettingsMutation.isPending,
    refreshRuntimeSnapshot,
    setAutoBrightness: async (value: boolean) => {
      await applySettingsPatch({ ambient_auto: value });
    },
    setHabitName: async (value: string) => {
      const targetDevice = requireLiveDevice(activeDevice);
      await applySettingsPatch({ name: value.trim() || targetDevice.name });
    },
    setPalette: async (paletteId: string) => {
      await applySettingsPatch({ palette_preset: paletteId });
    },
    setReminderEnabled: async (value: boolean) => {
      if (!activeDevice || !user?.id) {
        return;
      }
      await updateMembershipMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reminder_enabled: value }, userId: user.id });
    },
    setResetTime: async (value: string) => {
      const normalized = /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
      await applySettingsPatch({ day_reset_time: normalized });
    },
    setRewardTrigger: async (value: RewardTrigger) => {
      await applySettingsPatch({ reward_trigger: value });
    },
    setRewardType: async (value: RewardType) => {
      await applySettingsPatch({ reward_type: value });
    },
    setTimezone: async (value: string) => {
      const targetDevice = requireLiveDevice(activeDevice);
      await applySettingsPatch({ timezone: value.trim() || targetDevice.timezone });
    },
    setWeeklyTarget: async (value: number) => {
      await applySettingsPatch({ weekly_target: value });
    },
    toggleHistoryCell: async () => undefined,
    toggleReward: async () => {
      const targetDevice = requireLiveDevice(activeDevice);
      await applySettingsPatch({ reward_enabled: !targetDevice.rewardEnabled });
    },
    toggleToday: async (deviceId?: string) => {
      const issueToggle = async (allowRetry: boolean) => {
        const targetDevice = await resolveFreshLiveDevice(deviceId);
        const localDate = targetDevice.dateGrid?.[targetDevice.today.weekIndex]?.[targetDevice.today.dayIndex];
        if (!localDate) {
          throw new Error("The device board is missing today's date.");
        }

        const desiredState = !targetDevice.days[targetDevice.today.weekIndex][targetDevice.today.dayIndex];
        const baseRevision = targetDevice.runtimeRevision;
        setPendingTodayState(targetDevice.id, desiredState);

        try {
          const result = await setDayStateMutation.mutateAsync({
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
            },
            (device) => getDayStateByLocalDate(device, localDate) === desiredState,
          );
          clearPendingTodayState(targetDevice.id);
          void invalidateCloudDevices();
        } catch (error) {
          clearPendingTodayState(targetDevice.id);
          const message = error instanceof Error ? error.message : "Failed to change today's state.";
          if (allowRetry && message.includes("Runtime revision conflict")) {
            await invalidateCloudDevices();
            return issueToggle(false);
          }

          throw error;
        }
      };

      await issueToggle(true);
    },
  };
}
