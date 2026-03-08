import { useMutation } from "@tanstack/react-query";

import { fetchDeviceApProvisioningInfo, submitDeviceApProvisioning } from "@/lib/device-ap-client";
import { ApProvisioningRequest } from "@/types/addone";

export function useDeviceAp() {
  const infoMutation = useMutation({
    mutationFn: fetchDeviceApProvisioningInfo,
  });

  const provisioningMutation = useMutation({
    mutationFn: (request: ApProvisioningRequest) => submitDeviceApProvisioning(request),
  });

  return {
    apInfo: infoMutation.data ?? null,
    apInfoError: infoMutation.error instanceof Error ? infoMutation.error.message : null,
    checkAp: infoMutation.mutateAsync,
    isCheckingAp: infoMutation.isPending,
    isSubmittingProvisioning: provisioningMutation.isPending,
    provisioningError: provisioningMutation.error instanceof Error ? provisioningMutation.error.message : null,
    provisioningResponse: provisioningMutation.data ?? null,
    submitProvisioning: provisioningMutation.mutateAsync,
  };
}
