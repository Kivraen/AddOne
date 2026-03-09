import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import { nudgeCommandRelay, requestDayStateViaRelay, requestDayStatesBatchViaRelay } from "@/lib/command-relay";
import {
  claimDevice,
  fetchOwnedDevices,
  fetchSharedBoards,
  setDayStateFromApp,
  setDayStatesBatchFromApp,
  updateDevice,
  updateMembershipReminder,
} from "@/lib/supabase/addone-repository";
import { useAddOneStore } from "@/store/addone-store";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, RewardTrigger, RewardType, SharedBoard, SyncState, WeekStart } from "@/types/addone";

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
    `${((Math.floor(Math.random() * 4) + 8).toString(16))}${randomHexSegment(3)}`,
    randomHexSegment(12),
  ].join("-");
}

function optimisticSyncState(device: AddOneDevice): SyncState {
  return device.syncState === "offline" || device.syncState === "queued" ? "queued" : "syncing";
}

function optimisticSyncLabel(state: SyncState, queueCount: number) {
  if (state === "queued") {
    return `${queueCount} action${queueCount === 1 ? "" : "s"} queued`;
  }

  if (state === "syncing") {
    return "Applying on device";
  }

  return "Synced moments ago";
}

function isNetworkFailure(error: unknown) {
  return error instanceof Error && /network request failed|failed to fetch|networkerror/i.test(error.message);
}

function applyOptimisticDayState(device: AddOneDevice, localDate: string, isDone: boolean): AddOneDevice {
  if (!device.dateGrid) {
    return device;
  }

  let targetWeek = -1;
  let targetDay = -1;

  for (let weekIndex = 0; weekIndex < device.dateGrid.length; weekIndex += 1) {
    const dayIndex = device.dateGrid[weekIndex]?.indexOf(localDate) ?? -1;
    if (dayIndex >= 0) {
      targetWeek = weekIndex;
      targetDay = dayIndex;
      break;
    }
  }

  if (targetWeek < 0 || targetDay < 0) {
    return device;
  }

  const nextDays = device.days.map((week) => [...week]);
  nextDays[targetWeek][targetDay] = isDone;

  const nextSyncState = optimisticSyncState(device);
  const nextQueueCount = nextSyncState === "queued" ? Math.max(device.queueCount + 1, 1) : 0;

  return {
    ...device,
    days: nextDays,
    lastSyncedLabel: optimisticSyncLabel(nextSyncState, nextQueueCount),
    queueCount: nextQueueCount,
    syncState: nextSyncState,
  };
}

function applyOptimisticDayStates(
  device: AddOneDevice,
  updates: Array<{ isDone: boolean; localDate: string }>,
): AddOneDevice {
  return updates.reduce(
    (currentDevice, update) => applyOptimisticDayState(currentDevice, update.localDate, update.isDone),
    device,
  );
}

function applyOptimisticDevicePatch(
  devices: AddOneDevice[] | undefined,
  deviceId: string,
  updater: (device: AddOneDevice) => AddOneDevice,
) {
  if (!devices) {
    return devices;
  }

  return devices.map((device) => (device.id === deviceId ? updater(device) : device));
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
  });

  return {
    isLoading: mode === "cloud" ? sharedBoardsQuery.isLoading : false,
    sharedBoards: (mode === "demo" ? demoSharedBoards : sharedBoardsQuery.data ?? []) as SharedBoard[],
  };
}

export function useDeviceActions() {
  const { activeDevice, devices } = useDevices();
  const { mode, session, user } = useAuth();
  const queryClient = useQueryClient();

  const demoActions = {
    cycleSyncState: useAddOneStore((state) => state.cycleSyncState),
    setAutoBrightness: useAddOneStore((state) => state.setAutoBrightness),
    setHabitName: useAddOneStore((state) => state.setHabitName),
    setPalette: useAddOneStore((state) => state.setPalette),
    setResetTime: useAddOneStore((state) => state.setResetTime),
    setReminderEnabled: useAddOneStore((state) => state.setReminderEnabled),
    setRewardTrigger: useAddOneStore((state) => state.setRewardTrigger),
    setRewardType: useAddOneStore((state) => state.setRewardType),
    setTimezone: useAddOneStore((state) => state.setTimezone),
    setWeekStart: useAddOneStore((state) => state.setWeekStart),
    setWeeklyTarget: useAddOneStore((state) => state.setWeeklyTarget),
    toggleHistoryCell: useAddOneStore((state) => state.toggleHistoryCell),
    toggleReward: useAddOneStore((state) => state.toggleReward),
    toggleToday: useAddOneStore((state) => state.toggleToday),
  };

  const invalidateCloudDevices = async () => {
    if (!user?.id) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) });
    await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharedBoards(user.id) });
  };

  const updateOptimisticDevices = (deviceId: string, updater: (device: AddOneDevice) => AddOneDevice) => {
    if (!user?.id) {
      return undefined;
    }

    const queryKey = addOneQueryKeys.devices(user.id);
    const previousDevices = queryClient.getQueryData<AddOneDevice[]>(queryKey);
    queryClient.setQueryData<AddOneDevice[] | undefined>(queryKey, (current) => applyOptimisticDevicePatch(current, deviceId, updater));
    return { previousDevices, queryKey };
  };

  const resolveDevice = (deviceId?: string | null) => devices.find((device) => device.id === deviceId) ?? activeDevice ?? null;

  const claimMutation = useMutation({
    mutationFn: claimDevice,
    onSuccess: invalidateCloudDevices,
  });

  const setDayStateMutation = useMutation({
    mutationFn: async (variables: Parameters<typeof setDayStateFromApp>[0]) => {
      try {
        const result = await setDayStateFromApp(variables);
        void nudgeCommandRelay(result.command_id, session?.access_token);
        return result;
      } catch (error) {
        if (!isNetworkFailure(error) || !session?.access_token) {
          throw error;
        }

        return requestDayStateViaRelay(variables, session.access_token);
      }
    },
    onMutate: async (variables) => {
      if (!user?.id) {
        return undefined;
      }

      await queryClient.cancelQueries({ queryKey: addOneQueryKeys.devices(user.id) });
      return updateOptimisticDevices(variables.deviceId, (device) =>
        applyOptimisticDayState(device, variables.localDate, variables.isDone),
      );
    },
    onError: (_error, _variables, context) => {
      if (!context?.queryKey) {
        return;
      }

      queryClient.setQueryData(context.queryKey, context.previousDevices);
    },
  });

  const setDayStatesBatchMutation = useMutation({
    mutationFn: async (variables: Parameters<typeof setDayStatesBatchFromApp>[0]) => {
      try {
        const result = await setDayStatesBatchFromApp(variables);
        void nudgeCommandRelay(result.command_id, session?.access_token);
        return result;
      } catch (error) {
        if (!isNetworkFailure(error) || !session?.access_token) {
          throw error;
        }

        return requestDayStatesBatchViaRelay(variables, session.access_token);
      }
    },
    onMutate: async (variables) => {
      if (!user?.id) {
        return undefined;
      }

      await queryClient.cancelQueries({ queryKey: addOneQueryKeys.devices(user.id) });
      return updateOptimisticDevices(variables.deviceId, (device) => applyOptimisticDayStates(device, variables.updates));
    },
    onError: (_error, _variables, context) => {
      if (!context?.queryKey) {
        return;
      }

      queryClient.setQueryData(context.queryKey, context.previousDevices);
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ deviceId, patch }: { deviceId: string; patch: Parameters<typeof updateDevice>[1] }) => updateDevice(deviceId, patch),
    onSuccess: invalidateCloudDevices,
  });

  const updateMembershipMutation = useMutation({
    mutationFn: updateMembershipReminder,
    onSuccess: invalidateCloudDevices,
  });

  const isBusy =
    claimMutation.isPending ||
    setDayStateMutation.isPending ||
    setDayStatesBatchMutation.isPending ||
    updateDeviceMutation.isPending ||
    updateMembershipMutation.isPending;

  async function setDayStateFromCell(device: AddOneDevice, row: number, col: number) {
    if (col < 0 || row < 0 || row > 6 || col < device.today.weekIndex) {
      return;
    }

    if (col === device.today.weekIndex && row > device.today.dayIndex) {
      return;
    }

    const localDate = device.dateGrid?.[col]?.[row];
    if (!localDate) {
      return;
    }

      await setDayStateMutation.mutateAsync({
        clientEventId: makeClientEventId(),
        deviceId: device.id,
        isDone: !device.days[col][row],
        localDate,
      });
  }

  if (mode === "demo") {
    return {
      claimDevice: claimMutation.mutateAsync,
      cycleSyncState: demoActions.cycleSyncState,
      isBusy,
      setAutoBrightness: demoActions.setAutoBrightness,
      setHabitName: demoActions.setHabitName,
      setPalette: demoActions.setPalette,
      setResetTime: demoActions.setResetTime,
      setReminderEnabled: demoActions.setReminderEnabled,
      setRewardTrigger: demoActions.setRewardTrigger,
      setRewardType: demoActions.setRewardType,
      setTimezone: demoActions.setTimezone,
      setWeekStart: demoActions.setWeekStart,
      setWeeklyTarget: demoActions.setWeeklyTarget,
      commitHistoryBatch: async () => undefined,
      toggleHistoryCell: demoActions.toggleHistoryCell,
      toggleReward: demoActions.toggleReward,
      toggleToday: async (_deviceId?: string) => {
        demoActions.toggleToday();
      },
    };
  }

  return {
    claimDevice: claimMutation.mutateAsync,
    cycleSyncState: invalidateCloudDevices,
    isBusy,
    setAutoBrightness: async (value: boolean) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { ambient_auto: value } });
    },
    setHabitName: async (value: string) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { name: value.trim() || activeDevice.name } });
    },
    setPalette: async (paletteId: string) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { palette_preset: paletteId } });
    },
    setResetTime: async (value: string) => {
      if (!activeDevice) {
        return;
      }
      const normalized = /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { day_reset_time: normalized } });
    },
    setReminderEnabled: async (value: boolean) => {
      if (!activeDevice || !user?.id) {
        return;
      }
      await updateMembershipMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reminder_enabled: value }, userId: user.id });
    },
    setRewardTrigger: async (value: RewardTrigger) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reward_trigger: value } });
    },
    setRewardType: async (value: RewardType) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reward_type: value } });
    },
    setTimezone: async (value: string) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { timezone: value.trim() || activeDevice.timezone } });
    },
    setWeekStart: async (value: WeekStart) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { week_start: value } });
    },
    setWeeklyTarget: async (value: number) => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { weekly_target: value } });
    },
    toggleHistoryCell: async (row: number, col: number) => {
      const targetDevice = resolveDevice(activeDevice?.id);
      if (!targetDevice) {
        return;
      }
      await setDayStateFromCell(targetDevice, row, col);
    },
    toggleReward: async () => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reward_enabled: !activeDevice.rewardEnabled } });
    },
    toggleToday: async (deviceId?: string) => {
      const targetDevice = resolveDevice(deviceId);
      if (!targetDevice) {
        return;
      }
      await setDayStateFromCell(targetDevice, targetDevice.today.dayIndex, targetDevice.today.weekIndex);
    },
    commitHistoryBatch: async (updates: Array<{ isDone: boolean; localDate: string }>, deviceId?: string) => {
      const targetDevice = resolveDevice(deviceId);
      if (!targetDevice || updates.length === 0) {
        return;
      }

      await setDayStatesBatchMutation.mutateAsync({
        batchEventId: makeClientEventId(),
        deviceId: targetDevice.id,
        updates,
      });
    },
  };
}
