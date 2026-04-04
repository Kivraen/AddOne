import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DeviceSettingsDraft, EditablePaletteRole, getEditablePaletteRoleColor } from "@/lib/device-settings";

const QUICK_COLOR_ROLES: EditablePaletteRole[] = ["off", "on", "weekSuccess", "weekFail"];
const MAX_HISTORY_PER_ROLE = 12;

type AppliedColorsByRole = Record<EditablePaletteRole, string[]>;

const EMPTY_APPLIED_COLORS_BY_ROLE: AppliedColorsByRole = {
  off: [],
  on: [],
  weekFail: [],
  weekSuccess: [],
};

function pushRecentColor(history: string[], color: string) {
  return [color, ...history.filter((entry) => entry !== color)].slice(0, MAX_HISTORY_PER_ROLE);
}

interface PaletteHistoryState {
  appliedColorsByRole: AppliedColorsByRole;
  rememberAppliedPalette: (draft: DeviceSettingsDraft) => void;
}

export const usePaletteHistoryStore = create<PaletteHistoryState>()(
  persist(
    (set) => ({
      appliedColorsByRole: EMPTY_APPLIED_COLORS_BY_ROLE,
      rememberAppliedPalette: (draft) =>
        set((state) => {
          const next = { ...state.appliedColorsByRole };

          for (const role of QUICK_COLOR_ROLES) {
            const color = getEditablePaletteRoleColor(draft, role).toUpperCase();
            next[role] = pushRecentColor(next[role] ?? [], color);
          }

          return { appliedColorsByRole: next };
        }),
    }),
    {
      name: "addone-palette-history",
      partialize: (state) => ({
        appliedColorsByRole: state.appliedColorsByRole,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
