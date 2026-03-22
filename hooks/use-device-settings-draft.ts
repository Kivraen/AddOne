import { useEffect, useMemo } from "react";

import { useDeviceActions } from "@/hooks/use-devices";
import {
  DeviceSettingsDraft,
  areSettingsDraftsEqual,
  buildDraftSummary,
  buildSettingsPatchFromDraft,
  createSettingsDraftFromDevice,
  getDraftPalette,
  normalizeDraft,
  validateSettingsDraft,
} from "@/lib/device-settings";
import { isDeviceControlReady } from "@/lib/device-recovery";
import { normalizeHabitNameForSave, normalizeMinimumGoalForSave } from "@/lib/habit-details";
import { useDeviceSettingsDraftStore } from "@/store/device-settings-draft-store";
import { usePaletteHistoryStore } from "@/store/palette-history-store";
import { AddOneDevice } from "@/types/addone";

function deviceSettingsSourceKey(device: AddOneDevice, minimumGoal: string) {
  return [
    device.id,
    device.runtimeRevision,
    device.lastSnapshotAt ?? "",
    device.paletteId,
    JSON.stringify(device.customPalette ?? {}),
    device.name,
    device.weeklyTarget,
    device.timezone,
    device.resetTime,
    device.autoBrightness,
    device.brightness,
    normalizeMinimumGoalForSave(minimumGoal),
  ].join(":");
}

export function useDeviceSettingsDraft(device: AddOneDevice) {
  const { applySettingsDraft, isSavingSettings, saveActiveHabitMetadata } = useDeviceActions();
  const rememberAppliedPalette = usePaletteHistoryStore((state) => state.rememberAppliedPalette);
  const {
    baseDraft,
    clearDraft,
    draft,
    initializeFromDevice,
    markCommitted,
    resetPalette,
    resetToBase,
    setColorRole,
    resetColorRole,
    setDraftPatch,
    setPalettePreset,
    setStatusError,
    setStatusMessage,
    sourceKey,
    statusError,
    statusMessage,
    syncFromDeviceIfClean,
  } = useDeviceSettingsDraftStore();
  const currentMinimumGoal = device.dailyMinimum;
  const currentSourceKey = deviceSettingsSourceKey(device, currentMinimumGoal);

  useEffect(() => {
    if (!draft || !baseDraft) {
      initializeFromDevice(device, currentSourceKey, currentMinimumGoal);
      return;
    }

    syncFromDeviceIfClean(device, currentSourceKey, currentMinimumGoal);
  }, [baseDraft, currentMinimumGoal, currentSourceKey, device, draft, initializeFromDevice, syncFromDeviceIfClean]);

  const resolvedBaseDraft = baseDraft ?? createSettingsDraftFromDevice(device, currentMinimumGoal);
  const resolvedDraft = draft ?? resolvedBaseDraft;
  const validation = useMemo(() => validateSettingsDraft(resolvedDraft), [resolvedDraft]);
  const patch = useMemo(
    () => buildSettingsPatchFromDraft(resolvedBaseDraft, resolvedDraft),
    [resolvedBaseDraft, resolvedDraft],
  );
  const minimumGoalDirty = normalizeMinimumGoalForSave(resolvedBaseDraft.minimumGoal) !== normalizeMinimumGoalForSave(resolvedDraft.minimumGoal);
  const habitMetadataDirty =
    minimumGoalDirty ||
    normalizeHabitNameForSave(resolvedBaseDraft.habitName) !== normalizeHabitNameForSave(resolvedDraft.habitName) ||
    resolvedBaseDraft.weeklyTarget !== resolvedDraft.weeklyTarget;
  const isDirty = !areSettingsDraftsEqual(resolvedBaseDraft, resolvedDraft);
  const previewPalette = useMemo(() => getDraftPalette(resolvedDraft), [resolvedDraft]);
  const summary = useMemo(() => buildDraftSummary(resolvedDraft), [resolvedDraft]);
  const canApply = validation.isValid && !isSavingSettings && (patch ? isDeviceControlReady(device) : habitMetadataDirty);

  const apply = async () => {
    if (!patch && !habitMetadataDirty) {
      return false;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      if (patch) {
        await applySettingsDraft(patch, device.id);
      }
      if (habitMetadataDirty) {
        await saveActiveHabitMetadata({
          dailyMinimum: resolvedDraft.minimumGoal,
          deviceId: device.id,
          habitName: normalizeHabitNameForSave(resolvedDraft.habitName),
          weeklyTarget: resolvedDraft.weeklyTarget,
        });
      }
      markCommitted(currentSourceKey);
      if (patch?.palette_custom !== undefined || patch?.palette_preset !== undefined) {
        rememberAppliedPalette(resolvedDraft);
      }
      return true;
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to apply settings.");
      return false;
    }
  };

  return {
    apply,
    baseDraft: resolvedBaseDraft,
    canApply,
    clearDraft,
    device,
    draft: normalizeDraft(resolvedDraft),
    isDirty,
    isSavingSettings,
    patch,
    previewPalette,
    resetPalette,
    resetColorRole,
    resetToBase,
    setColorRole,
    setDraftPatch,
    setPalettePreset,
    setStatusError,
    setStatusMessage,
    sourceKey: sourceKey ?? currentSourceKey,
    statusError,
    statusMessage,
    summary,
    validation,
  };
}

export type ResolvedDeviceSettingsDraft = DeviceSettingsDraft;
