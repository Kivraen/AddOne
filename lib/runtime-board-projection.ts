import type { WeekStart } from "@/types/addone";

export interface RuntimeSnapshotProjectionInput {
  boardDays: unknown;
  currentWeekStart: string;
  todayRow: number;
  weekTargets?: unknown;
}

export interface RuntimeBoardProjection {
  currentWeekStart: string;
  dateGrid: string[][];
  days: boolean[][];
  isProjectedBeyondSnapshot: boolean;
  logicalToday: string;
  needsSnapshotRefresh: boolean;
  today: {
    dayIndex: number;
    weekIndex: 0;
  };
  weekTargets: number[] | null;
}

function stripSeconds(value: string | null | undefined, fallback = "00:00") {
  if (!value) {
    return fallback;
  }

  return value.slice(0, 5);
}

function toUtcDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function toLocalDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(localDate: string, offset: number) {
  const next = toUtcDate(localDate);
  next.setUTCDate(next.getUTCDate() + offset);
  return toLocalDateString(next);
}

function diffDays(fromDate: string, toDate: string) {
  return Math.round((toUtcDate(toDate).getTime() - toUtcDate(fromDate).getTime()) / 86_400_000);
}

function parseFixedOffsetTimezone(timezone: string) {
  const match = timezone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, sign, hoursRaw, minutesRaw] = match;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes % 15 !== 0) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes > 14 * 60) {
    return null;
  }

  const offsetMinutes = sign === "+" ? totalMinutes : totalMinutes * -1;
  if (offsetMinutes < -12 * 60 || offsetMinutes > 14 * 60) {
    return null;
  }

  return offsetMinutes;
}

function getTimeZoneParts(timezone: string, date = new Date()) {
  const fixedOffset = parseFixedOffsetTimezone(timezone);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60_000);
    return {
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      month: shifted.getUTCMonth() + 1,
      year: shifted.getUTCFullYear(),
    };
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    year: Number(values.year),
  };
}

export function normalizeWeekStart(weekStart: WeekStart): Exclude<WeekStart, "locale"> {
  if (weekStart === "sunday") {
    return "sunday";
  }

  return "monday";
}

function getWeekStartOffset(weekStart: WeekStart): 0 | 1 {
  return normalizeWeekStart(weekStart) === "monday" ? 1 : 0;
}

export function getLogicalToday(timezone: string, resetTime: string, date = new Date()) {
  const parts = getTimeZoneParts(timezone, date);
  let localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const [resetHourRaw, resetMinuteRaw] = stripSeconds(resetTime).split(":");
  const resetHour = Number(resetHourRaw);
  const resetMinute = Number(resetMinuteRaw);

  if (parts.hour < resetHour || (parts.hour === resetHour && parts.minute < resetMinute)) {
    localDate = addDays(localDate, -1);
  }

  return localDate;
}

export function startOfWeek(localDate: string, weekStart: WeekStart) {
  const date = toUtcDate(localDate);
  const day = date.getUTCDay();
  const weekStartDay = getWeekStartOffset(weekStart);
  const delta = (day - weekStartDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() - delta);
  return toLocalDateString(date);
}

function buildDateGrid(currentWeekStart: string) {
  return Array.from({ length: 21 }, (_, weekIndex) => {
    const weekStartDate = addDays(currentWeekStart, weekIndex * -7);
    return Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStartDate, dayIndex));
  });
}

function parseSnapshotBoardDays(boardDays: unknown) {
  if (!Array.isArray(boardDays) || boardDays.length !== 21) {
    return null;
  }

  const days = boardDays.map((week) => {
    if (!Array.isArray(week) || week.length !== 7) {
      return null;
    }

    return week.map((day) => Boolean(day));
  });

  return days.every(Boolean) ? (days as boolean[][]) : null;
}

function normalizeWeeklyTarget(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.max(1, Math.min(7, Math.round(numeric)));
}

function parseSnapshotWeekTargets(weekTargets: unknown) {
  if (!Array.isArray(weekTargets) || weekTargets.length !== 21) {
    return null;
  }

  const parsed = weekTargets.map((value) => normalizeWeeklyTarget(value));
  return parsed.every((value) => value !== null) ? (parsed as number[]) : null;
}

function buildRecordedDateMap(snapshot: RuntimeSnapshotProjectionInput | null | undefined) {
  if (!snapshot || typeof snapshot.todayRow !== "number" || snapshot.todayRow < 0 || snapshot.todayRow > 6) {
    return new Map<string, boolean>();
  }

  const snapshotDays = parseSnapshotBoardDays(snapshot.boardDays);
  if (!snapshotDays) {
    return new Map<string, boolean>();
  }

  const snapshotDateGrid = buildDateGrid(snapshot.currentWeekStart);
  const recordedDates = new Map<string, boolean>();

  for (let weekIndex = 0; weekIndex < snapshotDateGrid.length; weekIndex += 1) {
    for (let dayIndex = 0; dayIndex < snapshotDateGrid[weekIndex].length; dayIndex += 1) {
      const localDate = snapshotDateGrid[weekIndex][dayIndex];
      recordedDates.set(localDate, snapshotDays[weekIndex][dayIndex]);
    }
  }

  return recordedDates;
}

function buildWeekTargetMap(snapshot: RuntimeSnapshotProjectionInput | null | undefined) {
  const snapshotWeekTargets = snapshot ? parseSnapshotWeekTargets(snapshot.weekTargets) : null;
  if (!snapshotWeekTargets || !snapshot) {
    return null;
  }

  const snapshotDateGrid = buildDateGrid(snapshot.currentWeekStart);
  const targets = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < snapshotDateGrid.length; weekIndex += 1) {
    const weekStart = snapshotDateGrid[weekIndex]?.[0];
    if (!weekStart) {
      continue;
    }

    targets.set(weekStart, snapshotWeekTargets[weekIndex]);
  }

  return targets;
}

function buildVisibleWeekTargetMap(currentWeekStart: string, weekTargets: unknown) {
  const parsedWeekTargets = parseSnapshotWeekTargets(weekTargets);
  if (!parsedWeekTargets) {
    return null;
  }

  const visibleDateGrid = buildDateGrid(currentWeekStart);
  const targets = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < visibleDateGrid.length; weekIndex += 1) {
    const weekStart = visibleDateGrid[weekIndex]?.[0];
    if (!weekStart) {
      continue;
    }

    targets.set(weekStart, parsedWeekTargets[weekIndex]);
  }

  return targets;
}

export function buildRuntimeBoardProjection(input: {
  fallbackWeeklyTarget: number;
  now?: Date;
  resetTime: string;
  snapshot?: RuntimeSnapshotProjectionInput | null;
  visibleWeekTargets?: unknown;
  timezone: string;
  weekStart: WeekStart;
}): RuntimeBoardProjection {
  const logicalToday = getLogicalToday(input.timezone, input.resetTime, input.now);
  const currentWeekStart = startOfWeek(logicalToday, normalizeWeekStart(input.weekStart));
  const todayDayIndex = diffDays(currentWeekStart, logicalToday);
  const dateGrid = buildDateGrid(currentWeekStart);
  const recordedDates = buildRecordedDateMap(input.snapshot);
  const weekTargetMap = buildVisibleWeekTargetMap(currentWeekStart, input.visibleWeekTargets) ?? buildWeekTargetMap(input.snapshot);
  const fallbackWeeklyTarget = Math.max(1, Math.min(7, Math.round(input.fallbackWeeklyTarget)));
  const days = dateGrid.map((week) => week.map((localDate) => recordedDates.get(localDate) ?? false));
  const weekTargets = weekTargetMap
    ? dateGrid.map((week, weekIndex) => (weekIndex === 0 ? fallbackWeeklyTarget : weekTargetMap.get(week[0] ?? "") ?? fallbackWeeklyTarget))
    : null;

  const snapshotExists = Boolean(input.snapshot);
  const isProjectedBeyondSnapshot =
    snapshotExists &&
    (input.snapshot!.currentWeekStart !== currentWeekStart || input.snapshot!.todayRow !== todayDayIndex);

  return {
    currentWeekStart,
    dateGrid,
    days,
    isProjectedBeyondSnapshot,
    logicalToday,
    needsSnapshotRefresh: isProjectedBeyondSnapshot,
    today: {
      dayIndex: todayDayIndex,
      weekIndex: 0,
    },
    weekTargets,
  };
}

export function formatWeekdayFromLocalDate(localDate: string, locale = "en-US") {
  return toUtcDate(localDate).toLocaleDateString(locale, {
    timeZone: "UTC",
    weekday: "long",
  });
}
