import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { normalizeMinimumGoalForSave } from "@/lib/habit-details";

interface DeviceHabitMetadataState {
  minimumGoalByDeviceId: Record<string, string>;
  clearMinimumGoal: (deviceId: string) => void;
  setMinimumGoal: (deviceId: string, value: string) => void;
}

export const useDeviceHabitMetadataStore = create<DeviceHabitMetadataState>()(
  persist(
    (set) => ({
      minimumGoalByDeviceId: {},
      clearMinimumGoal: (deviceId) =>
        set((state) => {
          const next = { ...state.minimumGoalByDeviceId };
          delete next[deviceId];
          return { minimumGoalByDeviceId: next };
        }),
      setMinimumGoal: (deviceId, value) =>
        set((state) => {
          const normalizedValue = normalizeMinimumGoalForSave(value);
          const next = { ...state.minimumGoalByDeviceId };

          if (normalizedValue) {
            next[deviceId] = normalizedValue;
          } else {
            delete next[deviceId];
          }

          return { minimumGoalByDeviceId: next };
        }),
    }),
    {
      name: "addone-device-habit-metadata",
      partialize: (state) => ({
        minimumGoalByDeviceId: state.minimumGoalByDeviceId,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
