import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DeviceRecoveryState, OnboardingRestoreSource } from "@/types/addone";

type PendingTodayState = {
  isDone: boolean;
  phase: "requesting" | "confirmed";
};

export type ConnectivityIssuePhase = "checking" | "confirmed";

interface AppUiState {
  activeDeviceId: string | null;
  activeOnboardingClaimToken: string | null;
  activeOnboardingRestoreSource: OnboardingRestoreSource | null;
  activeOnboardingSessionId: string | null;
  connectivityIssueByDevice: Record<
      string,
      | {
    lastSeenAt: string | null;
    lastSnapshotAt: string | null;
    lastSyncAt: string | null;
    markedAt: number;
    phase: ConnectivityIssuePhase;
      }
    | undefined
  >;
  hiddenRemovingDeviceIds: Record<string, true | undefined>;
  pendingBoardEditorOpen: boolean;
  pendingTodayStateByDevice: Record<string, PendingTodayState | undefined>;
  recoveryNeededRevisionByDevice: Record<string, number | undefined>;
  clearBoardEditorOpen: () => void;
  clearConnectivityIssue: (deviceId: string) => void;
  clearHiddenRemovingDevice: (deviceId: string) => void;
  clearOnboardingSession: () => void;
  clearPendingTodayState: (deviceId: string) => void;
  markPendingTodayStateConfirmed: (deviceId: string) => void;
  clearRuntimeConflictRecovery: (deviceId: string) => void;
  hideRemovingDevice: (deviceId: string) => void;
  markConnectivityIssue: (
    deviceId: string,
    params: {
      lastSeenAt: string | null;
      lastSnapshotAt: string | null;
      lastSyncAt: string | null;
      phase?: ConnectivityIssuePhase;
    },
  ) => void;
  markRuntimeConflictRecovery: (deviceId: string, params: { recoveryState?: DeviceRecoveryState; runtimeRevision: number }) => void;
  requestBoardEditorOpen: () => void;
  setActiveOnboardingRestoreSource: (source: OnboardingRestoreSource | null) => void;
  setActiveOnboardingSession: (params: { claimToken?: string | null; sessionId: string | null }) => void;
  setActiveDeviceId: (deviceId: string | null) => void;
  setPendingTodayState: (deviceId: string, isDone: boolean) => void;
}

const PERSISTED_APP_UI_STATE = {
  activeDeviceId: null,
  activeOnboardingClaimToken: null,
  activeOnboardingRestoreSource: null,
  activeOnboardingSessionId: null,
  recoveryNeededRevisionByDevice: {} as Record<string, number | undefined>,
};

export const useAppUiStore = create<AppUiState>()(
  persist(
    (set) => ({
      ...PERSISTED_APP_UI_STATE,
      connectivityIssueByDevice: {},
      hiddenRemovingDeviceIds: {},
      pendingBoardEditorOpen: false,
      pendingTodayStateByDevice: {},
      clearBoardEditorOpen: () =>
        set({
          pendingBoardEditorOpen: false,
        }),
      clearConnectivityIssue: (deviceId) =>
        set((state) => {
          if (!(deviceId in state.connectivityIssueByDevice)) {
            return state;
          }

          const next = { ...state.connectivityIssueByDevice };
          delete next[deviceId];
          return { connectivityIssueByDevice: next };
        }),
      clearHiddenRemovingDevice: (deviceId) =>
        set((state) => {
          if (!(deviceId in state.hiddenRemovingDeviceIds)) {
            return state;
          }

          const next = { ...state.hiddenRemovingDeviceIds };
          delete next[deviceId];
          return { hiddenRemovingDeviceIds: next };
        }),
      clearOnboardingSession: () =>
        set((state) => {
          const onboardingAlreadyClear =
            state.activeOnboardingClaimToken === null &&
            state.activeOnboardingRestoreSource === null &&
            state.activeOnboardingSessionId === null;

          if (onboardingAlreadyClear) {
            return state;
          }

          return {
            activeOnboardingClaimToken: null,
            activeOnboardingRestoreSource: null,
            activeOnboardingSessionId: null,
          };
        }),
      clearPendingTodayState: (deviceId) =>
        set((state) => {
          const next = { ...state.pendingTodayStateByDevice };
          delete next[deviceId];
          return { pendingTodayStateByDevice: next };
        }),
      clearRuntimeConflictRecovery: (deviceId) =>
        set((state) => {
          if (!(deviceId in state.recoveryNeededRevisionByDevice)) {
            return state;
          }

          const next = { ...state.recoveryNeededRevisionByDevice };
          delete next[deviceId];
          return { recoveryNeededRevisionByDevice: next };
        }),
      markConnectivityIssue: (deviceId, params) =>
        set((state) => ({
          connectivityIssueByDevice: {
            ...state.connectivityIssueByDevice,
            [deviceId]: {
              lastSeenAt: params.lastSeenAt,
              lastSnapshotAt: params.lastSnapshotAt,
              lastSyncAt: params.lastSyncAt,
              markedAt: Date.now(),
              phase: params.phase ?? "checking",
            },
          },
        })),
      markPendingTodayStateConfirmed: (deviceId) =>
        set((state) => {
          const current = state.pendingTodayStateByDevice[deviceId];
          if (!current || current.phase === "confirmed") {
            return state;
          }

          return {
            pendingTodayStateByDevice: {
              ...state.pendingTodayStateByDevice,
              [deviceId]: {
                ...current,
                phase: "confirmed",
              },
            },
          };
        }),
      markRuntimeConflictRecovery: (deviceId, params) =>
        set((state) => {
          const nextRevision = Math.max(0, params.runtimeRevision);
          if (state.recoveryNeededRevisionByDevice[deviceId] === nextRevision) {
            return state;
          }

          return {
            recoveryNeededRevisionByDevice: {
              ...state.recoveryNeededRevisionByDevice,
              [deviceId]: nextRevision,
            },
          };
        }),
      hideRemovingDevice: (deviceId) =>
        set((state) => {
          if (state.hiddenRemovingDeviceIds[deviceId]) {
            return state;
          }

          return {
            hiddenRemovingDeviceIds: {
              ...state.hiddenRemovingDeviceIds,
              [deviceId]: true,
            },
          };
        }),
      requestBoardEditorOpen: () =>
        set({
          pendingBoardEditorOpen: true,
        }),
      setActiveOnboardingRestoreSource: (source) =>
        set((state) => {
          if (state.activeOnboardingRestoreSource === source) {
            return state;
          }

          return {
            activeOnboardingRestoreSource: source,
          };
        }),
      setActiveOnboardingSession: ({ claimToken = null, sessionId }) =>
        set((state) => {
          if (state.activeOnboardingClaimToken === claimToken && state.activeOnboardingSessionId === sessionId) {
            return state;
          }

          return {
            activeOnboardingClaimToken: claimToken,
            activeOnboardingSessionId: sessionId,
          };
        }),
      setActiveDeviceId: (deviceId) => set({ activeDeviceId: deviceId }),
      setPendingTodayState: (deviceId, isDone) =>
        set((state) => ({
          pendingTodayStateByDevice: {
            ...state.pendingTodayStateByDevice,
            [deviceId]: {
              isDone,
              phase: "requesting",
            },
          },
        })),
    }),
    {
      name: "addone-app-ui",
      partialize: (state) => ({
        activeDeviceId: state.activeDeviceId,
        activeOnboardingClaimToken: state.activeOnboardingClaimToken,
        activeOnboardingRestoreSource: state.activeOnboardingRestoreSource,
        activeOnboardingSessionId: state.activeOnboardingSessionId,
        recoveryNeededRevisionByDevice: state.recoveryNeededRevisionByDevice,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export async function resetPersistedAppUiState() {
  useAppUiStore.setState({
    ...PERSISTED_APP_UI_STATE,
    connectivityIssueByDevice: {},
    hiddenRemovingDeviceIds: {},
    pendingBoardEditorOpen: false,
    pendingTodayStateByDevice: {},
    recoveryNeededRevisionByDevice: {},
  });
  await useAppUiStore.persist.clearStorage();
}
