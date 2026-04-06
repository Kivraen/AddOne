import { AddOneDevice } from "@/types/addone";

export function isDeviceControlReady(device: Pick<AddOneDevice, "accountRemovalState" | "isLive" | "recoveryState">) {
  return device.accountRemovalState === "active" && device.isLive && device.recoveryState === "ready";
}

export function isDeviceRecovering(device: Pick<AddOneDevice, "recoveryState">) {
  return device.recoveryState === "recovering";
}

export function needsDeviceRecovery(device: Pick<AddOneDevice, "recoveryState">) {
  return device.recoveryState === "needs_recovery";
}

export function preserveRecoveringDeviceDisplayState(
  device: AddOneDevice,
  stableDevice?: AddOneDevice | null,
) {
  if (!stableDevice || device.accountRemovalState !== "active" || device.recoveryState !== "recovering") {
    return device;
  }

  return {
    ...device,
    customPalette: stableDevice.customPalette,
    dailyMinimum: stableDevice.dailyMinimum,
    dateGrid: stableDevice.dateGrid,
    days: stableDevice.days,
    habitStartedOnLocal: stableDevice.habitStartedOnLocal,
    isProjectedBeyondSnapshot: stableDevice.isProjectedBeyondSnapshot,
    lastSnapshotAt: stableDevice.lastSnapshotAt,
    logicalToday: stableDevice.logicalToday,
    name: stableDevice.name,
    needsSnapshotRefresh: stableDevice.needsSnapshotRefresh,
    paletteId: stableDevice.paletteId,
    recordedDaysTotal: stableDevice.recordedDaysTotal,
    successfulWeeksTotal: stableDevice.successfulWeeksTotal,
    today: stableDevice.today,
    weekTargets: stableDevice.weekTargets,
    weeklyTarget: stableDevice.weeklyTarget,
  };
}
