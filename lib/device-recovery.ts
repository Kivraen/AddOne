import { AddOneDevice } from "@/types/addone";

export function isDeviceControlReady(device: Pick<AddOneDevice, "isLive" | "recoveryState">) {
  return device.isLive && device.recoveryState === "ready";
}

export function isDeviceRecovering(device: Pick<AddOneDevice, "recoveryState">) {
  return device.recoveryState === "recovering";
}

export function needsDeviceRecovery(device: Pick<AddOneDevice, "recoveryState">) {
  return device.recoveryState === "needs_recovery";
}
