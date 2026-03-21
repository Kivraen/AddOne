import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";

import { useDevices } from "@/hooks/use-devices";

function normalizeRouteParam(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function useRouteDevice() {
  const params = useLocalSearchParams<{ deviceId?: string | string[] }>();
  const { activeDeviceId, devices, isLoading, setActiveDevice } = useDevices();
  const deviceId = normalizeRouteParam(params.deviceId);
  const device = useMemo(
    () => (deviceId ? devices.find((candidate) => candidate.id === deviceId) ?? null : null),
    [deviceId, devices],
  );

  useEffect(() => {
    if (!device?.id || activeDeviceId === device.id) {
      return;
    }

    setActiveDevice(device.id);
  }, [activeDeviceId, device?.id, setActiveDevice]);

  return {
    device,
    deviceId,
    isLoading,
    notFound: !isLoading && !!deviceId && !device,
  };
}
