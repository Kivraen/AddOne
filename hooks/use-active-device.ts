import { useDevices } from "@/hooks/use-devices";

export function useActiveDevice() {
  const { activeDevice } = useDevices();

  if (!activeDevice) {
    throw new Error("No active AddOne device is available.");
  }

  return activeDevice;
}
