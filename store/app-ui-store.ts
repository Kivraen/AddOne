import { create } from "zustand";

interface AppUiState {
  activeDeviceId: string | null;
  activeOnboardingClaimToken: string | null;
  activeOnboardingSessionId: string | null;
  clearOnboardingSession: () => void;
  setActiveOnboardingSession: (params: { claimToken?: string | null; sessionId: string | null }) => void;
  setActiveDeviceId: (deviceId: string | null) => void;
}

export const useAppUiStore = create<AppUiState>((set) => ({
  activeDeviceId: null,
  activeOnboardingClaimToken: null,
  activeOnboardingSessionId: null,
  clearOnboardingSession: () =>
    set({
      activeOnboardingClaimToken: null,
      activeOnboardingSessionId: null,
    }),
  setActiveOnboardingSession: ({ claimToken = null, sessionId }) =>
    set({
      activeOnboardingClaimToken: claimToken,
      activeOnboardingSessionId: sessionId,
    }),
  setActiveDeviceId: (deviceId) => set({ activeDeviceId: deviceId }),
}));
