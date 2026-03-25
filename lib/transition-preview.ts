import { boardPalettes } from "@/constants/palettes";
import { AddOneDevice } from "@/types/addone";

export const transitionPreviewStyles = [
  { id: 0, label: "Random mix" },
  { id: 1, label: "Center bloom" },
  { id: 2, label: "Curtain open" },
  { id: 3, label: "Left sweep" },
  { id: 4, label: "Right sweep" },
  { id: 5, label: "Top drop" },
  { id: 6, label: "Bottom rise" },
  { id: 7, label: "Diagonal down" },
  { id: 8, label: "Diagonal up" },
  { id: 9, label: "Edge collapse" },
] as const;

function normalizeStyleIndex(styleIndex: number) {
  const count = transitionPreviewStyles.length;
  const normalized = Math.trunc(styleIndex);
  return ((normalized % count) + count) % count;
}

function isoWithoutMilliseconds(value: Date) {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function pickPreviewPalette(device: AddOneDevice) {
  const fallback = ["ice", "amber", "rose", "classic"];
  return fallback.find((paletteId) => paletteId !== device.paletteId) ?? boardPalettes[0]?.id ?? "classic";
}

function buildPreviewBoardDays(device: AddOneDevice) {
  const weeks = device.days.length || 21;
  const daysPerWeek = device.days[0]?.length || 7;

  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: daysPerWeek }, (_, dayIndex) => {
      const mirrored = !!device.days[weeks - 1 - weekIndex]?.[daysPerWeek - 1 - dayIndex];
      const stripe = weekIndex % 4 === 0 || weekIndex % 4 === 3;
      const checker = (weekIndex + dayIndex) % 2 === 0;
      const wedge = dayIndex <= ((weekIndex + 2) % daysPerWeek);

      if (weekIndex === 0) {
        return dayIndex !== 1;
      }

      if (weekIndex === weeks - 1) {
        return dayIndex >= 2;
      }

      return stripe ? !mirrored : checker || wedge;
    }),
  );
}

export function buildTransitionPreviewPayload(device: AddOneDevice, styleIndex: number) {
  const emittedAt = new Date();
  const expiresAt = new Date(emittedAt.getTime() + 60_000);
  const currentWeekStart = device.dateGrid?.[0]?.[0] ?? device.logicalToday;

  return {
    board_days: buildPreviewBoardDays(device),
    current_week_start: currentWeekStart,
    emitted_at: isoWithoutMilliseconds(emittedAt),
    expires_at: isoWithoutMilliseconds(expiresAt),
    palette_custom: {},
    palette_preset: pickPreviewPalette(device),
    source_device_id: "transition-preview",
    source_local_date: device.logicalToday,
    today_row: device.today.dayIndex,
    transition_style: normalizeStyleIndex(styleIndex),
    weekly_target: Math.max(1, Math.min(7, device.weeklyTarget)),
  };
}
