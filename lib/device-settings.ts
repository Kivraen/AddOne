import { paletteById } from "@/constants/palettes";
import { getMergedPalette } from "@/lib/board";
import { AddOneDevice, BoardPalette, DeviceSettingsPatch } from "@/types/addone";

export type EditablePaletteRole = "off" | "on" | "weekSuccess" | "weekFail";

const SUPPORTED_CUSTOM_PALETTE_KEYS: Array<keyof BoardPalette> = [
  "dayOn",
  "socket",
  "socketEdge",
  "weekFail",
  "weekSuccess",
];

export interface DeviceSettingsDraft {
  autoBrightness: boolean;
  brightness: number;
  customPalette: Partial<BoardPalette>;
  habitName: string;
  paletteId: string;
  resetTime: string;
  timezone: string;
  weeklyTarget: number;
}

export interface DeviceSettingsDraftValidation {
  brightness?: string;
  habitName?: string;
  resetTime?: string;
  timezone?: string;
  isValid: boolean;
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function componentToHex(value: number) {
  return clampByte(value).toString(16).padStart(2, "0").toUpperCase();
}

function parseHex(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }

  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

export function hexToRgb(hex: string) {
  const parsed = parseHex(hex);
  if (!parsed) {
    return { blue: 0, green: 0, red: 0 };
  }

  return parsed;
}

export function normalizeHexColor(value: string) {
  const parsed = parseHex(value);
  if (!parsed) {
    return null;
  }

  return `#${componentToHex(parsed.red)}${componentToHex(parsed.green)}${componentToHex(parsed.blue)}`;
}

export function deriveBoardSocketColor(socketEdge: string) {
  const parsed = parseHex(socketEdge);
  if (!parsed) {
    return "#090909";
  }

  return `#${componentToHex(parsed.red * 0.62)}${componentToHex(parsed.green * 0.62)}${componentToHex(parsed.blue * 0.62)}`;
}

export function sanitizeCustomPalette(customPalette?: Partial<BoardPalette>) {
  const sanitized: Partial<BoardPalette> = {};
  if (!customPalette) {
    return sanitized;
  }

  for (const key of SUPPORTED_CUSTOM_PALETTE_KEYS) {
    const value = customPalette[key];
    if (typeof value !== "string") {
      continue;
    }

    const normalized = normalizeHexColor(value);
    if (normalized) {
      sanitized[key] = normalized;
    }
  }

  return sanitized;
}

export function createSettingsDraftFromDevice(device: AddOneDevice): DeviceSettingsDraft {
  return {
    autoBrightness: device.autoBrightness,
    brightness: device.brightness,
    customPalette: sanitizeCustomPalette(device.customPalette),
    habitName: device.name,
    paletteId: paletteById[device.paletteId] ? device.paletteId : "classic",
    resetTime: device.resetTime,
    timezone: device.timezone,
    weeklyTarget: device.weeklyTarget,
  };
}

export function normalizeDraft(draft: DeviceSettingsDraft): DeviceSettingsDraft {
  return {
    ...draft,
    brightness: Math.max(0, Math.min(100, Math.round(draft.brightness))),
    customPalette: sanitizeCustomPalette(draft.customPalette),
    habitName: draft.habitName,
    paletteId: paletteById[draft.paletteId] ? draft.paletteId : "classic",
    resetTime: draft.resetTime,
    timezone: draft.timezone,
    weeklyTarget: Math.max(1, Math.min(7, Math.round(draft.weeklyTarget))),
  };
}

export function validateSettingsDraft(draft: DeviceSettingsDraft): DeviceSettingsDraftValidation {
  const errors: Omit<DeviceSettingsDraftValidation, "isValid"> = {};
  if (!draft.habitName.trim()) {
    errors.habitName = "Enter a habit name.";
  }

  if (!draft.timezone.trim()) {
    errors.timezone = "Enter a timezone.";
  }

  if (!/^\d{2}:\d{2}$/.test(draft.resetTime)) {
    errors.resetTime = "Use 24-hour format like 00:00.";
  } else {
    const [hours, minutes] = draft.resetTime.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      errors.resetTime = "Use 24-hour format like 00:00.";
    }
  }

  if (!Number.isFinite(draft.brightness) || draft.brightness < 0 || draft.brightness > 100) {
    errors.brightness = "Choose a brightness between 0 and 100.";
  }

  return {
    ...errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function areCustomPalettesEqual(left?: Partial<BoardPalette>, right?: Partial<BoardPalette>) {
  const normalizedLeft = sanitizeCustomPalette(left);
  const normalizedRight = sanitizeCustomPalette(right);
  return SUPPORTED_CUSTOM_PALETTE_KEYS.every((key) => normalizedLeft[key] === normalizedRight[key]);
}

export function areSettingsDraftsEqual(left: DeviceSettingsDraft, right: DeviceSettingsDraft) {
  return (
    left.autoBrightness === right.autoBrightness &&
    left.brightness === right.brightness &&
    left.habitName === right.habitName &&
    left.paletteId === right.paletteId &&
    left.resetTime === right.resetTime &&
    left.timezone === right.timezone &&
    left.weeklyTarget === right.weeklyTarget &&
    areCustomPalettesEqual(left.customPalette, right.customPalette)
  );
}

export function buildSettingsPatchFromDraft(base: DeviceSettingsDraft, draft: DeviceSettingsDraft): DeviceSettingsPatch | null {
  const patch: DeviceSettingsPatch = {};

  if (draft.habitName.trim() !== base.habitName.trim()) {
    patch.name = draft.habitName.trim();
  }

  if (draft.weeklyTarget !== base.weeklyTarget) {
    patch.weekly_target = draft.weeklyTarget;
  }

  if (draft.timezone.trim() !== base.timezone.trim()) {
    patch.timezone = draft.timezone.trim();
  }

  if (draft.resetTime !== base.resetTime) {
    patch.day_reset_time = `${draft.resetTime}:00`;
  }

  if (draft.paletteId !== base.paletteId) {
    patch.palette_preset = draft.paletteId;
  }

  if (!areCustomPalettesEqual(base.customPalette, draft.customPalette)) {
    patch.palette_custom = sanitizeCustomPalette(draft.customPalette);
    if (patch.palette_preset === undefined) {
      patch.palette_preset = draft.paletteId;
    }
  }

  if (draft.autoBrightness !== base.autoBrightness) {
    patch.ambient_auto = draft.autoBrightness;
  }

  if (draft.brightness !== base.brightness) {
    patch.brightness = draft.brightness;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function buildDraftSummary(draft: DeviceSettingsDraft) {
  const palette = getMergedPalette(draft.paletteId, draft.customPalette);
  const isCustom = Object.keys(sanitizeCustomPalette(draft.customPalette)).length > 0;
  return {
    appearance: {
      brightness: draft.autoBrightness ? "Auto brightness" : `Brightness ${draft.brightness}%`,
      colors: [palette.socketEdge, palette.dayOn, palette.weekSuccess, palette.weekFail],
      paletteLabel: isCustom ? `${paletteById[draft.paletteId]?.name ?? "Classic"} + Custom` : paletteById[draft.paletteId]?.name ?? "Classic",
    },
    habit: `${draft.habitName.trim() || "Untitled"} · ${draft.weeklyTarget} days`,
    time: `${draft.timezone} · ${draft.resetTime}`,
  };
}

export function getDraftPalette(draft: DeviceSettingsDraft) {
  return getMergedPalette(draft.paletteId, draft.customPalette);
}

export function getEditablePaletteRoleLabel(role: EditablePaletteRole) {
  switch (role) {
    case "off":
      return "Off";
    case "on":
      return "On";
    case "weekSuccess":
      return "Week success";
    case "weekFail":
      return "Week miss";
  }
}

export function getEditablePaletteRoleColor(draft: DeviceSettingsDraft, role: EditablePaletteRole) {
  const palette = getDraftPalette(draft);
  switch (role) {
    case "off":
      return palette.socketEdge;
    case "on":
      return palette.dayOn;
    case "weekSuccess":
      return palette.weekSuccess;
    case "weekFail":
      return palette.weekFail;
  }
}

export function setEditablePaletteRoleColor(draft: DeviceSettingsDraft, role: EditablePaletteRole, value: string): DeviceSettingsDraft {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    return draft;
  }

  const nextDraft = normalizeDraft(draft);
  const preset = paletteById[nextDraft.paletteId] ?? paletteById.classic;
  const nextCustom = sanitizeCustomPalette(nextDraft.customPalette);

  if (role === "off") {
    const nextSocket = deriveBoardSocketColor(normalized);
    if (normalized === preset.socketEdge) {
      delete nextCustom.socketEdge;
    } else {
      nextCustom.socketEdge = normalized;
    }

    if (nextSocket === preset.socket) {
      delete nextCustom.socket;
    } else {
      nextCustom.socket = nextSocket;
    }
  }

  if (role === "on") {
    if (normalized === preset.dayOn) {
      delete nextCustom.dayOn;
    } else {
      nextCustom.dayOn = normalized;
    }
  }

  if (role === "weekSuccess") {
    if (normalized === preset.weekSuccess) {
      delete nextCustom.weekSuccess;
    } else {
      nextCustom.weekSuccess = normalized;
    }
  }

  if (role === "weekFail") {
    if (normalized === preset.weekFail) {
      delete nextCustom.weekFail;
    } else {
      nextCustom.weekFail = normalized;
    }
  }

  return {
    ...nextDraft,
    customPalette: nextCustom,
  };
}

export function resetEditablePaletteRoleToPreset(draft: DeviceSettingsDraft, role: EditablePaletteRole): DeviceSettingsDraft {
  return setEditablePaletteRoleColor(draft, role, getEditablePaletteRoleColor({ ...draft, customPalette: {} }, role));
}

export function rgbToHex(red: number, green: number, blue: number) {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
}

export function hexToHsv(hex: string) {
  const parsed = parseHex(hex);
  if (!parsed) {
    return { h: 0, s: 0, v: 1 };
  }

  const red = parsed.red / 255;
  const green = parsed.green / 255;
  const blue = parsed.blue / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      h = 60 * ((blue - red) / delta + 2);
    } else {
      h = 60 * ((red - green) / delta + 4);
    }
  }

  if (h < 0) {
    h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = v - chroma;
  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}
