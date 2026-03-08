import { create } from "zustand";

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
  clearApProvisioningDraft: () => void;
  clearOnboardingSession: () => void;
  setActiveApProvisioningDraft: (patch: Partial<ApProvisioningDraft>) => void;
  setActiveOnboardingSession: (params: { claimToken?: string | null; sessionId: string | null }) => void;
  setActiveDeviceId: (deviceId: string | null) => void;
}

export const useAppUiStore = create<AppUiState>((set) => ({
  activeDeviceId: null,
  activeApProvisioningDraft: EMPTY_AP_PROVISIONING_DRAFT,
  activeOnboardingClaimToken: null,
  activeOnboardingSessionId: null,
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
}));
