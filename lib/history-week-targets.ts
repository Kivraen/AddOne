import { resolveHabitStartLocalDate } from "@/lib/board";
import { resolveDeviceWeekTarget } from "@/lib/device-history-view";
import { AddOneDevice } from "@/types/addone";

export function resolveEditorWeekTargets(device: AddOneDevice) {
  const weekCount = device.dateGrid?.length ?? device.days.length;
  return Array.from({ length: weekCount }, (_, weekIndex) => resolveDeviceWeekTarget(device, weekIndex));
}

export function preserveCurrentWeekTarget(device: AddOneDevice, weekTargets: number[] | null) {
  if (!Array.isArray(weekTargets) || weekTargets.length === 0) {
    return weekTargets;
  }

  const nextWeekTargets = [...weekTargets];
  nextWeekTargets[0] = resolveDeviceWeekTarget(device, 0);
  return nextWeekTargets;
}

export function applyBackdatedHabitStartTarget(
  device: AddOneDevice,
  habitStartedOnLocal: string,
  weeklyTarget: number,
  previousHabitStartLocalDateOverride?: string | null,
) {
  const previousHabitStartLocalDate = previousHabitStartLocalDateOverride ?? resolveHabitStartLocalDate(device);
  const nextDevice: AddOneDevice = {
    ...device,
    habitStartedOnLocal,
  };

  if (
    !previousHabitStartLocalDate ||
    habitStartedOnLocal >= previousHabitStartLocalDate ||
    !device.dateGrid
  ) {
    return nextDevice;
  }

  const nextWeekTargets = resolveEditorWeekTargets(device);

  for (let weekIndex = 1; weekIndex < device.dateGrid.length; weekIndex += 1) {
    const weekDates = device.dateGrid[weekIndex] ?? [];
    const hadVisibleHistoryInWeek = weekDates.some((localDate) => localDate >= previousHabitStartLocalDate);
    const hasVisibleHistoryInWeek = weekDates.some((localDate) => localDate >= habitStartedOnLocal);
    const exposesOnlyNewWeek = !hadVisibleHistoryInWeek && hasVisibleHistoryInWeek;

    if (exposesOnlyNewWeek) {
      nextWeekTargets[weekIndex] = weeklyTarget;
    }
  }

  return {
    ...nextDevice,
    weekTargets: preserveCurrentWeekTarget(device, nextWeekTargets),
  };
}

export function finalizeHistoryDraftWeekTargetsForSave(
  currentWeekSourceDevice: AddOneDevice,
  draftWeekTargets: number[] | null,
) {
  return preserveCurrentWeekTarget(currentWeekSourceDevice, draftWeekTargets);
}
