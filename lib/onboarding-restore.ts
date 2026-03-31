import { areCustomPalettesEqual, sanitizeCustomPalette } from "@/lib/device-settings";
import { AddOneDevice, DeviceSettingsPatch, HistoryDraftUpdate, OnboardingRestoreSource } from "@/types/addone";

export function captureOnboardingRestoreSource(device: AddOneDevice): OnboardingRestoreSource {
  return {
    boardId: device.boardId,
    capturedAt: new Date().toISOString(),
    dateGrid: device.dateGrid?.map((week) => [...week]),
    days: device.days.map((week) => [...week]),
    logicalToday: device.logicalToday,
    weekTargets: device.weekTargets ? [...device.weekTargets] : null,
    settings: {
      autoBrightness: device.autoBrightness,
      brightness: device.brightness,
      customPalette: sanitizeCustomPalette(device.customPalette),
      dailyMinimum: device.dailyMinimum,
      name: device.name,
      paletteId: device.paletteId,
      resetTime: device.resetTime,
      rewardEnabled: device.rewardEnabled,
      rewardTrigger: device.rewardTrigger,
      rewardType: device.rewardType,
      timezone: device.timezone,
      weeklyTarget: device.weeklyTarget,
    },
    sourceDeviceId: device.id,
    sourceDeviceName: device.name,
  };
}

export function buildRestoreSettingsPatch(source: OnboardingRestoreSource, device: AddOneDevice): DeviceSettingsPatch | null {
  const patch: DeviceSettingsPatch = {};

  if (source.settings.timezone.trim() !== device.timezone.trim()) {
    patch.timezone = source.settings.timezone.trim();
  }

  if (source.settings.resetTime !== device.resetTime) {
    patch.day_reset_time = `${source.settings.resetTime}:00`;
  }

  if (source.settings.paletteId !== device.paletteId) {
    patch.palette_preset = source.settings.paletteId;
  }

  if (source.settings.paletteId !== device.paletteId || !areCustomPalettesEqual(device.customPalette, source.settings.customPalette)) {
    patch.palette_custom = sanitizeCustomPalette(source.settings.customPalette);
    if (patch.palette_preset === undefined) {
      patch.palette_preset = source.settings.paletteId;
    }
  }

  if (source.settings.autoBrightness !== device.autoBrightness) {
    patch.ambient_auto = source.settings.autoBrightness;
  }

  if (source.settings.brightness !== device.brightness) {
    patch.brightness = source.settings.brightness;
  }

  if (source.settings.rewardEnabled !== device.rewardEnabled) {
    patch.reward_enabled = source.settings.rewardEnabled;
  }

  if (source.settings.rewardType !== device.rewardType) {
    patch.reward_type = source.settings.rewardType;
  }

  if (source.settings.rewardTrigger !== device.rewardTrigger) {
    patch.reward_trigger = source.settings.rewardTrigger;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function buildRestoreHistoryDraft(source: OnboardingRestoreSource): HistoryDraftUpdate[] {
  const updates: HistoryDraftUpdate[] = [];
  const dateGrid = source.dateGrid ?? [];

  for (let weekIndex = 0; weekIndex < dateGrid.length; weekIndex += 1) {
    const week = dateGrid[weekIndex] ?? [];
    for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
      const localDate = week[dayIndex];
      if (!localDate || localDate > source.logicalToday || !source.days[weekIndex]?.[dayIndex]) {
        continue;
      }

      updates.push({
        isDone: true,
        localDate,
      });
    }
  }

  return updates;
}
