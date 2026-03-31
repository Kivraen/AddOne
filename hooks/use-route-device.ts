import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";

import { useDevices } from "@/hooks/use-devices";
import { useAppUiStore } from "@/store/app-ui-store";

function normalizeRouteParam(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function useRouteDevice() {
  const params = useLocalSearchParams<{ deviceId?: string | string[] }>();
  const { activeDeviceId, allDevices, devices, isLoading, setActiveDevice } = useDevices();
  const hiddenRemovingDeviceIds = useAppUiStore((state) => state.hiddenRemovingDeviceIds);
  const deviceId = normalizeRouteParam(params.deviceId);
  const visibleDevice = useMemo(
    () => (deviceId ? devices.find((candidate) => candidate.id === deviceId) ?? null : null),
    [deviceId, devices],
  );
  const hiddenRemovingDevice = useMemo(
    () => (deviceId && hiddenRemovingDeviceIds[deviceId] ? allDevices.find((candidate) => candidate.id === deviceId) ?? null : null),
    [allDevices, deviceId, hiddenRemovingDeviceIds],
  );
  const device = visibleDevice ?? hiddenRemovingDevice ?? null;

  useEffect(() => {
    if (!visibleDevice?.id || activeDeviceId === visibleDevice.id) {
      return;
    }

    setActiveDevice(visibleDevice.id);
  }, [activeDeviceId, setActiveDevice, visibleDevice?.id]);

  return {
    device,
    deviceId,
    isLoading,
    notFound: !isLoading && !!deviceId && !device,
  };
}
