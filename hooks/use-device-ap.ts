import { useMutation } from "@tanstack/react-query";

import { fetchDeviceApNetworks, fetchDeviceApProvisioningInfo, submitDeviceApProvisioning } from "@/lib/device-ap-client";
import { ApProvisioningRequest } from "@/types/addone";

export function useDeviceAp() {
  const infoMutation = useMutation({
    mutationFn: fetchDeviceApProvisioningInfo,
  });

  const provisioningMutation = useMutation({
    mutationFn: (request: ApProvisioningRequest) => submitDeviceApProvisioning(request),
  });

  const scanNetworksMutation = useMutation({
    mutationFn: fetchDeviceApNetworks,
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
    scanNetworks: scanNetworksMutation.mutateAsync,
    submitProvisioning: provisioningMutation.mutateAsync,
  };
}
