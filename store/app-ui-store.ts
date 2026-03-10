import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ApProvisioningDraft } from "@/types/addone";

const EMPTY_AP_PROVISIONING_DRAFT: ApProvisioningDraft = {
  wifiPassword: "",
  wifiSsid: "",
};

interface AppUiState {
  activeDeviceId: string | null;
  activeApProvisioningDraft: ApProvisioningDraft;
  activeOnboardingClaimToken: string | null;
  activeOnboardingSessionId: string | null;
  pendingTodayStateByDevice: Record<string, boolean | undefined>;
  clearApProvisioningDraft: () => void;
  clearOnboardingSession: () => void;
  clearPendingTodayState: (deviceId: string) => void;
  setActiveApProvisioningDraft: (patch: Partial<ApProvisioningDraft>) => void;
  setActiveOnboardingSession: (params: { claimToken?: string | null; sessionId: string | null }) => void;
  setActiveDeviceId: (deviceId: string | null) => void;
  setPendingTodayState: (deviceId: string, isDone: boolean) => void;
}

export const useAppUiStore = create<AppUiState>()(
  persist(
    (set) => ({
      activeDeviceId: null,
      activeApProvisioningDraft: EMPTY_AP_PROVISIONING_DRAFT,
      activeOnboardingClaimToken: null,
      activeOnboardingSessionId: null,
      pendingTodayStateByDevice: {},
      clearApProvisioningDraft: () =>
        set({
          activeApProvisioningDraft: EMPTY_AP_PROVISIONING_DRAFT,
        }),
      clearOnboardingSession: () =>
        set({
          activeApProvisioningDraft: EMPTY_AP_PROVISIONING_DRAFT,
          activeOnboardingClaimToken: null,
          activeOnboardingSessionId: null,
        }),
      clearPendingTodayState: (deviceId) =>
        set((state) => {
          const next = { ...state.pendingTodayStateByDevice };
          delete next[deviceId];
          return { pendingTodayStateByDevice: next };
        }),
      setActiveApProvisioningDraft: (patch) =>
        set((state) => ({
          activeApProvisioningDraft: {
            ...state.activeApProvisioningDraft,
            ...patch,
          },
        })),
      setActiveOnboardingSession: ({ claimToken = null, sessionId }) =>
        set({
          activeOnboardingClaimToken: claimToken,
          activeOnboardingSessionId: sessionId,
        }),
      setActiveDeviceId: (deviceId) => set({ activeDeviceId: deviceId }),
      setPendingTodayState: (deviceId, isDone) =>
        set((state) => ({
          pendingTodayStateByDevice: {
            ...state.pendingTodayStateByDevice,
            [deviceId]: isDone,
          },
        })),
    }),
    {
      name: "addone-app-ui",
      partialize: (state) => ({
        activeApProvisioningDraft: state.activeApProvisioningDraft,
        activeDeviceId: state.activeDeviceId,
        activeOnboardingClaimToken: state.activeOnboardingClaimToken,
        activeOnboardingSessionId: state.activeOnboardingSessionId,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
