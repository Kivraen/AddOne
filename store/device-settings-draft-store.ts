import { create } from "zustand";

import {
  areCustomPalettesEqual,
  buildResolvedPaletteCustom,
  DeviceSettingsDraft,
  EditablePaletteRole,
  areSettingsDraftsEqual,
  createSettingsDraftFromDevice,
  normalizeDraft,
  resetPaletteToPreset,
  resetEditablePaletteRoleToPreset,
  setEditablePaletteRoleColor,
} from "@/lib/device-settings";
import { AddOneDevice } from "@/types/addone";

interface DeviceSettingsDraftState {
  baseDraft: DeviceSettingsDraft | null;
  deviceId: string | null;
  draft: DeviceSettingsDraft | null;
  sourceKey: string | null;
  statusError: string | null;
  statusMessage: string | null;
  clearDraft: () => void;
  initializeFromDevice: (device: AddOneDevice, sourceKey: string, minimumGoal?: string) => void;
  markCommitted: (sourceKey?: string | null) => void;
  resetToBase: () => void;
  setColorRole: (role: EditablePaletteRole, color: string) => void;
  resetColorRole: (role: EditablePaletteRole) => void;
  resetPalette: () => void;
  setDraftPatch: (patch: Partial<DeviceSettingsDraft>) => void;
  setPalettePreset: (paletteId: string) => void;
  setStatusError: (value: string | null) => void;
  setStatusMessage: (value: string | null) => void;
  syncFromDeviceIfClean: (device: AddOneDevice, sourceKey: string, minimumGoal?: string) => void;
}

export const useDeviceSettingsDraftStore = create<DeviceSettingsDraftState>((set, get) => ({
  baseDraft: null,
  deviceId: null,
  draft: null,
  sourceKey: null,
  statusError: null,
  statusMessage: null,
  clearDraft: () =>
    set({
      baseDraft: null,
      deviceId: null,
      draft: null,
      sourceKey: null,
      statusError: null,
      statusMessage: null,
    }),
  initializeFromDevice: (device, sourceKey, minimumGoal = "") => {
    const nextDraft = createSettingsDraftFromDevice(device, minimumGoal);
    set({
      baseDraft: nextDraft,
      deviceId: device.id,
      draft: nextDraft,
      sourceKey,
      statusError: null,
      statusMessage: null,
    });
  },
  markCommitted: (sourceKey) =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      return {
        baseDraft: state.draft,
        sourceKey: sourceKey ?? state.sourceKey,
        statusError: null,
      };
    }),
  resetToBase: () =>
    set((state) => ({
      draft: state.baseDraft,
      statusError: null,
      statusMessage: null,
    })),
  resetColorRole: (role) =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      return {
        draft: resetEditablePaletteRoleToPreset(state.draft, role),
        statusError: null,
        statusMessage: null,
      };
    }),
  resetPalette: () =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      return {
        draft: resetPaletteToPreset(state.draft),
        statusError: null,
        statusMessage: null,
      };
    }),
  setColorRole: (role, color) =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      return {
        draft: setEditablePaletteRoleColor(state.draft, role, color),
        statusError: null,
        statusMessage: null,
      };
    }),
  setDraftPatch: (patch) =>
    set((state) => ({
      draft: state.draft ? normalizeDraft({ ...state.draft, ...patch }) : state.draft,
      statusError: null,
      statusMessage: null,
    })),
  setPalettePreset: (paletteId) =>
    set((state) => {
      if (!state.draft) {
        return {
          draft: state.draft,
          statusError: null,
          statusMessage: null,
        };
      }

      const nextCustomPalette = buildResolvedPaletteCustom(paletteId);

      if (state.draft.paletteId === paletteId) {
        if (areCustomPalettesEqual(state.draft.customPalette, nextCustomPalette)) {
          return {
            draft: state.draft,
            statusError: null,
            statusMessage: null,
          };
        }

        return {
          draft: {
            ...state.draft,
            customPalette: nextCustomPalette,
          },
          statusError: null,
          statusMessage: null,
        };
      }

      return {
        draft: {
          ...state.draft,
          customPalette: nextCustomPalette,
          paletteId,
        },
        statusError: null,
        statusMessage: null,
      };
    }),
  setStatusError: (value) =>
    set({
      statusError: value,
      statusMessage: value ? null : get().statusMessage,
    }),
  setStatusMessage: (value) =>
    set({
      statusError: value ? null : get().statusError,
      statusMessage: value,
    }),
  syncFromDeviceIfClean: (device, sourceKey, minimumGoal = "") => {
    const state = get();
    if (!state.baseDraft || !state.draft) {
      state.initializeFromDevice(device, sourceKey, minimumGoal);
      return;
    }

    if (state.deviceId !== device.id) {
      if (areSettingsDraftsEqual(state.baseDraft, state.draft)) {
        state.initializeFromDevice(device, sourceKey, minimumGoal);
      }
      return;
    }

    if (state.sourceKey === sourceKey) {
      return;
    }

    if (!areSettingsDraftsEqual(state.baseDraft, state.draft)) {
      return;
    }

    state.initializeFromDevice(device, sourceKey, minimumGoal);
  },
}));
