import { create } from "zustand";

import { boardPalettes } from "@/constants/palettes";
import { initialDevices } from "@/lib/mock-data";
import { toggleHistoryCell, toggleToday } from "@/lib/board";
import { AddOneDevice, BoardPalette } from "@/types/addone";

interface AddOneState {
  activeDeviceId: string;
  devices: AddOneDevice[];
  activeDevice: () => AddOneDevice;
  activePalette: () => BoardPalette;
  setActiveDevice: (deviceId: string) => void;
  toggleToday: () => void;
  toggleHistoryCell: (row: number, col: number) => void;
  setPalette: (paletteId: string) => void;
  setResetTime: (value: string) => void;
  setTimezone: (value: string) => void;
  setWeeklyTarget: (value: number) => void;
  setAutoBrightness: (value: boolean) => void;
}

function updateDevice(devices: AddOneDevice[], activeDeviceId: string, updater: (device: AddOneDevice) => AddOneDevice) {
  return devices.map((device) => (device.id === activeDeviceId ? updater(device) : device));
}

function nextResetLabel(resetTime: string) {
  return resetTime === "00:00" ? "Resets at midnight" : `Resets at ${resetTime}`;
}

export const useAddOneStore = create<AddOneState>((set, get) => ({
  activeDeviceId: initialDevices[0].id,
  devices: initialDevices,
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
          syncState: device.syncState === "offline" ? "offline" : "syncing",
        };
      }),
    })),
  toggleHistoryCell: (row, col) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => toggleHistoryCell(device, row, col)),
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
  setAutoBrightness: (value) =>
    set((state) => ({
      devices: updateDevice(state.devices, state.activeDeviceId, (device) => ({
        ...device,
        autoBrightness: value,
      })),
    })),
}));
