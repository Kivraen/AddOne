import { useEffect, useMemo } from "react";

import { useDeviceActions } from "@/hooks/use-devices";
import {
  DeviceSettingsDraft,
  areSettingsDraftsEqual,
  buildDraftSummary,
  buildSettingsPatchFromDraft,
  createSettingsDraftFromDevice,
  getDraftPalette,
  validateSettingsDraft,
} from "@/lib/device-settings";
import { useDeviceSettingsDraftStore } from "@/store/device-settings-draft-store";
import { usePaletteHistoryStore } from "@/store/palette-history-store";
import { AddOneDevice } from "@/types/addone";

function deviceSettingsSourceKey(device: AddOneDevice) {
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
  ].join(":");
}

export function useDeviceSettingsDraft(device: AddOneDevice) {
  const { applySettingsDraft, isSavingSettings } = useDeviceActions();
  const rememberAppliedPalette = usePaletteHistoryStore((state) => state.rememberAppliedPalette);
  const {
    baseDraft,
    clearDraft,
    draft,
    initializeFromDevice,
    markCommitted,
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
  const currentSourceKey = deviceSettingsSourceKey(device);

  useEffect(() => {
    if (!draft || !baseDraft) {
      initializeFromDevice(device, currentSourceKey);
      return;
    }

    syncFromDeviceIfClean(device, currentSourceKey);
  }, [baseDraft, currentSourceKey, device, draft, initializeFromDevice, syncFromDeviceIfClean]);

  const resolvedBaseDraft = baseDraft ?? createSettingsDraftFromDevice(device);
  const resolvedDraft = draft ?? resolvedBaseDraft;
  const validation = useMemo(() => validateSettingsDraft(resolvedDraft), [resolvedDraft]);
  const patch = useMemo(
    () => buildSettingsPatchFromDraft(resolvedBaseDraft, resolvedDraft),
    [resolvedBaseDraft, resolvedDraft],
  );
  const isDirty = !areSettingsDraftsEqual(resolvedBaseDraft, resolvedDraft);
  const previewPalette = useMemo(() => getDraftPalette(resolvedDraft), [resolvedDraft]);
  const summary = useMemo(() => buildDraftSummary(resolvedDraft), [resolvedDraft]);
  const canApply = device.isLive && validation.isValid && !!patch && !isSavingSettings;

  const apply = async () => {
    if (!patch) {
      return false;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      await applySettingsDraft(patch, device.id);
      markCommitted(currentSourceKey);
      if (patch.palette_custom !== undefined || patch.palette_preset !== undefined) {
        rememberAppliedPalette(resolvedDraft);
      }
      setStatusMessage("Applied on the device.");
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
    draft: resolvedDraft,
    isDirty,
    isSavingSettings,
    patch,
    previewPalette,
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
