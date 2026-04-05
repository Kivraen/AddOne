import { resolveHabitStartLocalDate } from "@/lib/board";
import { startOfWeek } from "@/lib/runtime-board-projection";
import {
  AddOneDevice,
  DeviceHistoryFreshnessState,
  PendingDeviceMirrorState,
} from "@/types/addone";

export interface DeviceHistoryView {
  currentWeekCompleted: number;
  currentWeekTarget: number;
  device: AddOneDevice;
  freshnessState: DeviceHistoryFreshnessState;
  habitWeeksTotal: number | null;
  isCurrentWeekSuccessful: boolean;
  recordedDaysTotal: number;
  successfulWeeksTotal: number;
  visibleFillPercentage: number;
}

function cloneDays(days: boolean[][]) {
  return days.map((week) => [...week]);
}

function cloneWeekTargets(weekTargets: number[] | null | undefined) {
  return Array.isArray(weekTargets) ? [...weekTargets] : weekTargets ?? null;
}

function weekTargetsMatch(left: number[] | null | undefined, right: number[] | null | undefined) {
  if (!Array.isArray(left) && !Array.isArray(right)) {
    return true;
  }

  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function daysMatch(left: boolean[][] | undefined, right: boolean[][] | undefined) {
  if (!left || !right) {
    return left === right;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let weekIndex = 0; weekIndex < left.length; weekIndex += 1) {
    if (left[weekIndex]?.length !== right[weekIndex]?.length) {
      return false;
    }

    for (let dayIndex = 0; dayIndex < left[weekIndex].length; dayIndex += 1) {
      if (left[weekIndex][dayIndex] !== right[weekIndex][dayIndex]) {
        return false;
      }
    }
  }

  return true;
}

function canApplyPendingMirror(device: AddOneDevice, pending?: PendingDeviceMirrorState | null) {
  if (!pending) {
    return false;
  }

  if (!pending.currentWeekStart) {
    return true;
  }

  return device.dateGrid?.[0]?.[0] === pending.currentWeekStart;
}

export function resolveWeekTarget(
  device: Pick<AddOneDevice, "weeklyTarget" | "weekTargets">,
  weekIndex: number,
) {
  return device.weekTargets?.[weekIndex] ?? device.weeklyTarget;
}

export const resolveDeviceWeekTarget = resolveWeekTarget;

export function currentWeekCompletedCount(device: Pick<AddOneDevice, "days" | "today">) {
  return device.days[device.today.weekIndex].slice(0, device.today.dayIndex + 1).filter(Boolean).length;
}

export function isCurrentWeekSuccessful(
  device: Pick<AddOneDevice, "days" | "today" | "weeklyTarget" | "weekTargets">,
) {
  return currentWeekCompletedCount(device) >= resolveWeekTarget(device, device.today.weekIndex);
}

export function applyPendingTodayState(device: AddOneDevice, pendingTodayState?: boolean): AddOneDevice {
  if (pendingTodayState === undefined) {
    return device;
  }

  const currentState = device.days[device.today.weekIndex]?.[device.today.dayIndex];
  if (currentState === undefined || currentState === pendingTodayState) {
    return device;
  }

  const days = cloneDays(device.days);
  days[device.today.weekIndex][device.today.dayIndex] = pendingTodayState;

  return {
    ...device,
    days,
  };
}

export function applyPendingMirrorState(device: AddOneDevice, pending?: PendingDeviceMirrorState | null): AddOneDevice {
  if (!canApplyPendingMirror(device, pending)) {
    return device;
  }

  const next: AddOneDevice = {
    ...device,
  };

  if (pending?.days && !daysMatch(device.days, pending.days)) {
    next.days = cloneDays(pending.days);
  }

  if (pending?.name !== undefined && pending.name !== device.name) {
    next.name = pending.name;
  }

  if (pending?.dailyMinimum !== undefined && pending.dailyMinimum !== device.dailyMinimum) {
    next.dailyMinimum = pending.dailyMinimum;
  }

  if (pending?.habitStartedOnLocal !== undefined && pending.habitStartedOnLocal !== device.habitStartedOnLocal) {
    next.habitStartedOnLocal = pending.habitStartedOnLocal;
  }

  if (pending?.recordedDaysTotal !== undefined && pending.recordedDaysTotal !== device.recordedDaysTotal) {
    next.recordedDaysTotal = pending.recordedDaysTotal;
  }

  if (
    pending?.successfulWeeksTotal !== undefined &&
    pending.successfulWeeksTotal !== device.successfulWeeksTotal
  ) {
    next.successfulWeeksTotal = pending.successfulWeeksTotal;
  }

  if (pending?.weeklyTarget !== undefined && pending.weeklyTarget !== device.weeklyTarget) {
    next.weeklyTarget = pending.weeklyTarget;
  }

  if (pending?.weekTargets !== undefined && !weekTargetsMatch(device.weekTargets, pending.weekTargets)) {
    next.weekTargets = cloneWeekTargets(pending.weekTargets);
  }

  return next;
}

export const overlayPendingDeviceMirror = applyPendingMirrorState;

export function deviceMatchesPendingMirrorState(device: AddOneDevice, pending?: PendingDeviceMirrorState | null) {
  if (!pending) {
    return true;
  }

  if (pending.currentWeekStart && device.dateGrid?.[0]?.[0] !== pending.currentWeekStart) {
    return false;
  }

  if (pending.days && !daysMatch(device.days, pending.days)) {
    return false;
  }

  if (pending.name !== undefined && device.name !== pending.name) {
    return false;
  }

  if (pending.dailyMinimum !== undefined && device.dailyMinimum !== pending.dailyMinimum) {
    return false;
  }

  if (
    pending.habitStartedOnLocal !== undefined &&
    device.habitStartedOnLocal !== pending.habitStartedOnLocal
  ) {
    return false;
  }

  if (
    pending.recordedDaysTotal !== undefined &&
    device.recordedDaysTotal !== pending.recordedDaysTotal
  ) {
    return false;
  }

  if (
    pending.successfulWeeksTotal !== undefined &&
    device.successfulWeeksTotal !== pending.successfulWeeksTotal
  ) {
    return false;
  }

  if (pending.weeklyTarget !== undefined && device.weeklyTarget !== pending.weeklyTarget) {
    return false;
  }

  if (pending.weekTargets !== undefined && !weekTargetsMatch(device.weekTargets, pending.weekTargets)) {
    return false;
  }

  return true;
}

export const deviceMatchesPendingMirror = deviceMatchesPendingMirrorState;

function visibleBoardFillPercentage(device: AddOneDevice) {
  const habitStartLocalDate = resolveHabitStartLocalDate(device);
  let visibleCompleted = 0;
  let visibleDays = 0;

  for (let weekIndex = 0; weekIndex < device.days.length; weekIndex += 1) {
    const isPastWeek = weekIndex > device.today.weekIndex;
    const isCurrentWeek = weekIndex === device.today.weekIndex;
    const visibleRows = isPastWeek ? 7 : isCurrentWeek ? device.today.dayIndex + 1 : 0;

    for (let dayIndex = 0; dayIndex < visibleRows; dayIndex += 1) {
      const localDate = device.dateGrid?.[weekIndex]?.[dayIndex];
      if (habitStartLocalDate && localDate && localDate < habitStartLocalDate) {
        continue;
      }

      visibleDays += 1;
      if (device.days[weekIndex]?.[dayIndex]) {
        visibleCompleted += 1;
      }
    }
  }

  return visibleDays === 0 ? 0 : Math.round((visibleCompleted / visibleDays) * 100);
}

function totalHabitWeeks(device: AddOneDevice) {
  const habitStartLocalDate = resolveHabitStartLocalDate(device);
  if (!habitStartLocalDate) {
    return null;
  }

  const habitStartWeek = startOfWeek(habitStartLocalDate, device.weekStart);
  const currentWeek = startOfWeek(device.logicalToday, device.weekStart);
  const daysBetween = Math.round(
    (new Date(`${currentWeek}T00:00:00.000Z`).getTime() -
      new Date(`${habitStartWeek}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
  const elapsedWeeks = Math.floor(Math.max(daysBetween, 0) / 7) + 1;
  return Math.max(elapsedWeeks, device.successfulWeeksTotal);
}

export function resolveDeviceHistoryView(
  device: AddOneDevice,
  options?: {
    pendingMirror?: PendingDeviceMirrorState | null;
    pendingTodayState?: boolean;
  },
): DeviceHistoryView {
  const mirroredDevice = applyPendingMirrorState(device, options?.pendingMirror);
  const projectedDevice = applyPendingTodayState(mirroredDevice, options?.pendingTodayState);
  const currentWeekCompleted = currentWeekCompletedCount(projectedDevice);
  const currentWeekTarget = resolveWeekTarget(projectedDevice, projectedDevice.today.weekIndex);
  let recordedDaysTotal = mirroredDevice.recordedDaysTotal;
  let successfulWeeksTotal = mirroredDevice.successfulWeeksTotal;

  const mirroredTodayState = mirroredDevice.days[mirroredDevice.today.weekIndex]?.[mirroredDevice.today.dayIndex];
  const projectedTodayState = projectedDevice.days[projectedDevice.today.weekIndex]?.[projectedDevice.today.dayIndex];
  if (
    options?.pendingTodayState !== undefined &&
    mirroredTodayState !== undefined &&
    projectedTodayState !== undefined &&
    mirroredTodayState !== projectedTodayState
  ) {
    recordedDaysTotal = Math.max(0, recordedDaysTotal + (projectedTodayState ? 1 : -1));
    const mirroredWeekSuccessful = isCurrentWeekSuccessful(mirroredDevice);
    const projectedWeekSuccessful = isCurrentWeekSuccessful(projectedDevice);
    if (mirroredWeekSuccessful !== projectedWeekSuccessful) {
      successfulWeeksTotal = Math.max(0, successfulWeeksTotal + (projectedWeekSuccessful ? 1 : -1));
    }
  }

  return {
    currentWeekCompleted,
    currentWeekTarget,
    device: projectedDevice,
    freshnessState: options?.pendingMirror ? "mirror_pending" : device.needsSnapshotRefresh ? "projected_stale" : "fully_settled",
    habitWeeksTotal: totalHabitWeeks(mirroredDevice),
    isCurrentWeekSuccessful: currentWeekCompleted >= currentWeekTarget,
    recordedDaysTotal,
    successfulWeeksTotal,
    visibleFillPercentage: visibleBoardFillPercentage(projectedDevice),
  };
}

export const buildDeviceHistoryView = resolveDeviceHistoryView;
