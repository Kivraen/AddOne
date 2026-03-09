import { create } from "zustand";

import { boardPalettes } from "@/constants/palettes";
import { initialDevices, initialSharedBoards } from "@/lib/mock-data";
import { toggleHistoryCell, toggleToday } from "@/lib/board";
import { AddOneDevice, BoardPalette, RewardTrigger, RewardType, SharedBoard, SyncState } from "@/types/addone";

interface AddOneState {
  activeDeviceId: string;
  devices: AddOneDevice[];
  sharedBoards: SharedBoard[];
  activeDevice: () => AddOneDevice;
  activePalette: () => BoardPalette;
  setActiveDevice: (deviceId: string) => void;
  toggleToday: () => void;
  toggleHistoryCell: (row: number, col: number) => void;
  cycleSyncState: () => void;
  toggleReward: () => void;
  setRewardType: (value: RewardType) => void;
  setRewardTrigger: (value: RewardTrigger) => void;
  setHabitName: (value: string) => void;
  setPalette: (paletteId: string) => void;
  setResetTime: (value: string) => void;
  setTimezone: (value: string) => void;
  setWeeklyTarget: (value: number) => void;
  setWeekStart: (value: AddOneDevice["weekStart"]) => void;
  setReminderEnabled: (value: boolean) => void;
  setAutoBrightness: (value: boolean) => void;
}

function updateDevice(devices: AddOneDevice[], activeDeviceId: string, updater: (device: AddOneDevice) => AddOneDevice) {
  return devices.map((device) => (device.id === activeDeviceId ? updater(device) : device));
}

function nextSyncState(current: SyncState): SyncState {
  switch (current) {
    case "online":
      return "syncing";
    case "syncing":
      return "offline";
    default:
      return "online";
  }
}

function nextResetLabel(resetTime: string) {
  return resetTime === "00:00" ? "Resets at midnight" : `Resets at ${resetTime}`;
}

export const useAddOneStore = create<AddOneState>((set, get) => ({
  activeDeviceId: initialDevices[0].id,
  devices: initialDevices,
  sharedBoards: initialSharedBoards,
  activeDevice: () => get().devices.find((device) => device.id === get().activeDeviceId) ?? get().devices[0],
  activePalette: () => {
    const device = get().activeDevice();
    return boardPalettes.find((palette) => palette.id === device.paletteId) ?? boardPalettes[0];
  },
  setActiveDevice: (deviceId) => set({ activeDeviceId: deviceId }),
  toggleToday: () =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => {
        const updated = toggleToday(device);

        return {
          ...updated,
          lastSyncedLabel: device.syncState === "offline" ? "Device offline" : "Applying on device",
          syncState: device.syncState === "offline" ? "offline" : "syncing",
        };
      }),
    })),
  toggleHistoryCell: (row, col) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => toggleHistoryCell(device, row, col)),
    })),
  cycleSyncState: () =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => {
        const syncState = nextSyncState(device.syncState);

        return {
          ...device,
          syncState,
          lastSyncedLabel:
            syncState === "online"
              ? "Synced moments ago"
              : syncState === "syncing"
                ? "Pushing latest changes"
                : "Device offline",
        };
      }),
    })),
  toggleReward: () =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        rewardEnabled: !device.rewardEnabled,
      })),
    })),
  setRewardType: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        rewardType: value,
      })),
    })),
  setRewardTrigger: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        rewardTrigger: value,
      })),
    })),
  setHabitName: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        name: value.trim() || device.name,
      })),
    })),
  setPalette: (paletteId) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        paletteId,
      })),
    })),
  setResetTime: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        nextResetLabel: nextResetLabel(value),
        resetTime: value,
      })),
    })),
  setTimezone: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        timezone: value.trim() || device.timezone,
      })),
    })),
  setWeeklyTarget: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        weeklyTarget: value,
      })),
    })),
  setWeekStart: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        weekStart: value,
      })),
    })),
  setReminderEnabled: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        reminderEnabled: value,
      })),
    })),
  setAutoBrightness: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        autoBrightness: value,
      })),
    })),
}));
