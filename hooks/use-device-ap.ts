import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { fetchDeviceApNetworks, fetchDeviceApProvisioningInfo, submitDeviceApProvisioning } from "@/lib/device-ap-client";
import { ApProvisioningRequest } from "@/types/addone";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDeviceAp() {
  const { mode } = useAuth();
  const infoMutation = useMutation({
    mutationFn: async () => {
      if (mode === "demo") {
        await sleep(150);
        return {
          device_ap_ssid: "AddOne-DEMO",
          firmware_version: "v2.demo",
          hardware_profile: "addone-v1",
          provisioning_state: "ready" as const,
          schema_version: 1 as const,
        };
      }

      return fetchDeviceApProvisioningInfo();
    },
  });

  const provisioningMutation = useMutation({
    mutationFn: async (request: ApProvisioningRequest) => {
      if (mode === "demo") {
        await sleep(150);
        return {
          accepted: Boolean(request.payload.wifi_ssid),
          message: request.payload.wifi_ssid ? "Demo provisioning accepted." : "Wi-Fi network is required.",
          next_step: "connect_to_cloud" as const,
          reboot_required: false,
          schema_version: 1 as const,
        };
      }

      return submitDeviceApProvisioning(request);
    },
  });

  const scanNetworksMutation = useMutation({
    mutationFn: async () => {
      if (mode === "demo") {
        await sleep(150);
        return {
          networks: [
            { authMode: "wpa2", rssi: -44, secure: true, ssid: "Studio Wi-Fi" },
            { authMode: "wpa2_wpa3", rssi: -58, secure: true, ssid: "Workshop" },
            { authMode: "open", rssi: -71, secure: false, ssid: "Guest Net" },
          ],
          schema_version: 1 as const,
        };
      }

      return fetchDeviceApNetworks();
    },
  });

  return {
    apInfo: infoMutation.data ?? null,
    apInfoError: infoMutation.error instanceof Error ? infoMutation.error.message : null,
    checkAp: infoMutation.mutateAsync,
    isScanningNetworks: scanNetworksMutation.isPending,
    isCheckingAp: infoMutation.isPending,
    isSubmittingProvisioning: provisioningMutation.isPending,
    networks: scanNetworksMutation.data?.networks ?? [],
    networksError: scanNetworksMutation.error instanceof Error ? scanNetworksMutation.error.message : null,
    provisioningError: provisioningMutation.error instanceof Error ? provisioningMutation.error.message : null,
    provisioningResponse: provisioningMutation.data ?? null,
    resetApInfo: infoMutation.reset,
    resetNetworks: scanNetworksMutation.reset,
    resetProvisioning: provisioningMutation.reset,
    scanNetworks: scanNetworksMutation.mutateAsync,
    submitProvisioning: provisioningMutation.mutateAsync,
  };
}
