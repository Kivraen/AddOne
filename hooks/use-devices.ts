import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  claimDevice,
  fetchOwnedDevices,
  fetchSharedBoards,
  setDayStateFromApp,
  updateDevice,
  updateMembershipReminder,
} from "@/lib/supabase/addone-repository";
import { useAddOneStore } from "@/store/addone-store";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice, RewardTrigger, RewardType, SharedBoard, WeekStart } from "@/types/addone";

function makeClientEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  const { activeDevice } = useDevices();
  const { mode, user } = useAuth();
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

  const claimMutation = useMutation({
    mutationFn: claimDevice,
    onSuccess: invalidateCloudDevices,
  });

  const setDayStateMutation = useMutation({
    mutationFn: setDayStateFromApp,
    onSuccess: invalidateCloudDevices,
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
    claimMutation.isPending || setDayStateMutation.isPending || updateDeviceMutation.isPending || updateMembershipMutation.isPending;

  async function setDayStateFromCell(device: AddOneDevice, row: number, col: number) {
    if (col < 0 || row < 0 || row > 6 || col > device.today.weekIndex) {
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
      toggleHistoryCell: demoActions.toggleHistoryCell,
      toggleReward: demoActions.toggleReward,
      toggleToday: demoActions.toggleToday,
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
      if (!activeDevice) {
        return;
      }
      await setDayStateFromCell(activeDevice, row, col);
    },
    toggleReward: async () => {
      if (!activeDevice) {
        return;
      }
      await updateDeviceMutation.mutateAsync({ deviceId: activeDevice.id, patch: { reward_enabled: !activeDevice.rewardEnabled } });
    },
    toggleToday: async () => {
      if (!activeDevice) {
        return;
      }
      await setDayStateFromCell(activeDevice, activeDevice.today.dayIndex, activeDevice.today.weekIndex);
    },
  };
}
