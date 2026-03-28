import { AddOneDevice } from "@/types/addone";

export const DEVICE_HEARTBEAT_INTERVAL_MS = 60_000;
export const DEVICE_CONNECTION_JITTER_MS = 15_000;
export const DEVICE_ONLINE_STALE_MS = DEVICE_HEARTBEAT_INTERVAL_MS;
export const DEVICE_OFFLINE_CONFIRMATION_MS = DEVICE_ONLINE_STALE_MS + DEVICE_CONNECTION_JITTER_MS;

type DeviceConnectionTimestamps = Pick<AddOneDevice, "lastSeenAt" | "lastSnapshotAt" | "lastSyncAt">;
type DeviceConnectionStateInput = Pick<AddOneDevice, "lastSeenAt" | "lastSnapshotAt" | "lastSyncAt"> & {
  accountRemovalState?: AddOneDevice["accountRemovalState"];
};

export function latestConnectionActivityAt(device: DeviceConnectionTimestamps) {
  const timestamps = [device.lastSeenAt, device.lastSyncAt, device.lastSnapshotAt]
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

export function connectionGraceState(
  device: DeviceConnectionStateInput,
  options?: {
    offlineConfirmationMs?: number;
    onlineStaleMs?: number;
  },
): "online" | "checking" | "offline" {
  if ((device.accountRemovalState ?? "active") !== "active") {
    return "offline";
  }

  const lastActivityAt = latestConnectionActivityAt(device);
  if (!lastActivityAt) {
    return "offline";
  }

  const onlineStaleMs = options?.onlineStaleMs ?? DEVICE_ONLINE_STALE_MS;
  const offlineConfirmationMs = options?.offlineConfirmationMs ?? DEVICE_OFFLINE_CONFIRMATION_MS;
  const activityAgeMs = Date.now() - lastActivityAt;

  if (activityAgeMs < onlineStaleMs) {
    return "online";
  }

  if (activityAgeMs < offlineConfirmationMs) {
    return "checking";
  }

  return "offline";
}
