import type { WeekStart } from "@/types/addone";

export interface RuntimeSnapshotProjectionInput {
  boardDays: unknown;
  currentWeekStart: string;
  todayRow: number;
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

function getTimeZoneParts(timezone: string, date = new Date()) {
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

export function buildRuntimeBoardProjection(input: {
  now?: Date;
  resetTime: string;
  snapshot?: RuntimeSnapshotProjectionInput | null;
  timezone: string;
  weekStart: WeekStart;
}): RuntimeBoardProjection {
  const logicalToday = getLogicalToday(input.timezone, input.resetTime, input.now);
  const currentWeekStart = startOfWeek(logicalToday, normalizeWeekStart(input.weekStart));
  const todayDayIndex = diffDays(currentWeekStart, logicalToday);
  const dateGrid = buildDateGrid(currentWeekStart);
  const recordedDates = buildRecordedDateMap(input.snapshot);
  const days = dateGrid.map((week) => week.map((localDate) => recordedDates.get(localDate) ?? false));

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
  };
}

export function formatWeekdayFromLocalDate(localDate: string, locale = "en-US") {
  return toUtcDate(localDate).toLocaleDateString(locale, {
    timeZone: "UTC",
    weekday: "long",
  });
}
