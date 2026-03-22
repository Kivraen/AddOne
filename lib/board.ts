import { paletteById } from "@/constants/palettes";
import { getLogicalToday } from "@/lib/runtime-board-projection";
import { AddOneDevice, BoardPalette, HighlightTarget, PixelCellState, SharedBoard } from "@/types/addone";

const BOARD_ROWS = 8;
const BOARD_COLS = 21;

export function getMergedPalette(paletteId: string, customPalette?: Partial<BoardPalette>): BoardPalette {
  return {
    ...paletteById[paletteId],
    ...customPalette,
  };
}

function emptyBoard(): PixelCellState[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLS }, () => "future" as PixelCellState));
}

function completedCount(days: boolean[], visibleDayCount: number): number {
  return days.slice(0, visibleDayCount).filter(Boolean).length;
}

function activeEraStartLocalDate(entity: AddOneDevice | SharedBoard) {
  if (!("historyEraStartedAt" in entity) || !entity.historyEraStartedAt) {
    return null;
  }

  return getLogicalToday(entity.timezone, entity.resetTime, new Date(entity.historyEraStartedAt));
}

export function buildBoardCells(entity: AddOneDevice | SharedBoard): PixelCellState[][] {
  const cells = emptyBoard();
  const { today, weeklyTarget, days } = entity;
  const eraStartLocalDate = activeEraStartLocalDate(entity);

  for (let col = 0; col < BOARD_COLS; col += 1) {
    const isPastWeek = col > today.weekIndex;
    const isCurrentWeek = col === today.weekIndex;
    const visibleDays = isPastWeek ? 7 : isCurrentWeek ? today.dayIndex + 1 : 0;
    let completed = 0;
    let visibleInEraDays = 0;

    for (let row = 0; row < 7; row += 1) {
      if (row >= visibleDays) {
        continue;
      }

      const localDate = entity.dateGrid?.[col]?.[row];
      if (eraStartLocalDate && localDate && localDate < eraStartLocalDate) {
        continue;
      }

      cells[row][col] = days[col][row] ? "done" : "socket";
      visibleInEraDays += 1;
      if (days[col][row]) {
        completed += 1;
      }
    }

    if (visibleInEraDays > 0) {
      if (completed >= weeklyTarget) {
        cells[7][col] = "weekSuccess";
      } else if (isPastWeek) {
        cells[7][col] = "weekFail";
      } else {
        cells[7][col] = "socket";
      }
    }
  }

  return cells;
}

export function getTodayHighlight(entity: AddOneDevice | SharedBoard): HighlightTarget {
  return {
    row: entity.today.dayIndex,
    col: entity.today.weekIndex,
  };
}

export function toggleHistoryCell(device: AddOneDevice, row: number, col: number): AddOneDevice {
  if (row > 6 || col < device.today.weekIndex) {
    return device;
  }

  if (col === device.today.weekIndex && row > device.today.dayIndex) {
    return device;
  }

  const days = device.days.map((week) => [...week]);
  days[col][row] = !days[col][row];

  return {
    ...device,
    days,
  };
}

export function toggleToday(device: AddOneDevice): AddOneDevice {
  const { dayIndex, weekIndex } = device.today;
  const days = device.days.map((week) => [...week]);
  days[weekIndex][dayIndex] = !days[weekIndex][dayIndex];

  return {
    ...device,
    days,
  };
}

export function targetStatusLabel(device: AddOneDevice | SharedBoard): string {
  const currentWeekDays = device.days[device.today.weekIndex];
  const completed = currentWeekDays.slice(0, device.today.dayIndex + 1).filter(Boolean).length;
  return `${completed}/${device.weeklyTarget} this week`;
}
