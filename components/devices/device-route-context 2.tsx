import { createContext, PropsWithChildren, useContext } from "react";

import { AddOneDevice } from "@/types/addone";

const DeviceRouteContext = createContext<AddOneDevice | null>(null);

export function DeviceRouteProvider({
  children,
  device,
}: PropsWithChildren<{ device: AddOneDevice }>) {
  return <DeviceRouteContext.Provider value={device}>{children}</DeviceRouteContext.Provider>;
}

export function useRoutedDevice() {
  const device = useContext(DeviceRouteContext);

  if (!device) {
    throw new Error("No routed AddOne device is available.");
  }

  return device;
}
