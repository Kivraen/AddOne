import { create } from "zustand";

import { PendingDeviceMirrorState } from "@/types/addone";

interface DeviceHistorySyncState {
  clearPendingMirror: (deviceId: string) => void;
  pendingMirrorByDevice: Record<string, PendingDeviceMirrorState | undefined>;
  setPendingMirror: (deviceId: string, pending: PendingDeviceMirrorState) => void;
}

function clonePendingMirrorState(pending: PendingDeviceMirrorState): PendingDeviceMirrorState {
  return {
    ...pending,
    days: pending.days ? pending.days.map((week) => [...week]) : undefined,
    weekTargets: Array.isArray(pending.weekTargets) ? [...pending.weekTargets] : pending.weekTargets,
  };
}

export const useDeviceHistorySyncStore = create<DeviceHistorySyncState>()((set) => ({
  clearPendingMirror: (deviceId) =>
    set((state) => {
      if (!(deviceId in state.pendingMirrorByDevice)) {
        return state;
      }

      const next = { ...state.pendingMirrorByDevice };
      delete next[deviceId];
      return { pendingMirrorByDevice: next };
    }),
  pendingMirrorByDevice: {},
  setPendingMirror: (deviceId, pending) =>
    set((state) => ({
      pendingMirrorByDevice: {
        ...state.pendingMirrorByDevice,
        [deviceId]: clonePendingMirrorState(pending),
      },
    })),
}));
