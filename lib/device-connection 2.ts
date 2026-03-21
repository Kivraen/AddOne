import { AddOneDevice } from "@/types/addone";

export const DEVICE_OFFLINE_CONFIRMATION_MS = 75_000;

type DeviceConnectionTimestamps = Pick<AddOneDevice, "lastSeenAt" | "lastSnapshotAt" | "lastSyncAt">;
type DeviceConnectionStateInput = Pick<AddOneDevice, "isLive" | "lastSeenAt" | "lastSnapshotAt" | "lastSyncAt">;

export function latestConnectionActivityAt(device: DeviceConnectionTimestamps) {
  const timestamps = [device.lastSeenAt, device.lastSyncAt, device.lastSnapshotAt]
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

export function connectionGraceState(
  device: DeviceConnectionStateInput,
  offlineConfirmationMs = DEVICE_OFFLINE_CONFIRMATION_MS,
): "online" | "checking" | "offline" {
  if (device.isLive) {
    return "online";
  }

  const lastActivityAt = latestConnectionActivityAt(device);
  if (lastActivityAt && Date.now() - lastActivityAt < offlineConfirmationMs) {
    return "checking";
  }

  return "offline";
}
