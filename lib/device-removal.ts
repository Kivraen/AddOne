import { AddOneDevice } from "@/types/addone";

export function isDevicePendingRemoval(device: Pick<AddOneDevice, "accountRemovalState">) {
  return device.accountRemovalState === "pending_device_reset";
}
