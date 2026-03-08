import { useMemo } from "react";

import { buildApProvisioningRequest, validateApProvisioningDraft } from "@/lib/ap-provisioning";
import { useAppUiStore } from "@/store/app-ui-store";

interface UseApProvisioningParams {
  claimToken: string | null;
  hardwareProfileHint?: string | null;
  onboardingSessionId: string | null;
}

export function useApProvisioning({
  claimToken,
  hardwareProfileHint = null,
  onboardingSessionId,
}: UseApProvisioningParams) {
  const draft = useAppUiStore((state) => state.activeApProvisioningDraft);
  const clearDraft = useAppUiStore((state) => state.clearApProvisioningDraft);
  const setDraft = useAppUiStore((state) => state.setActiveApProvisioningDraft);

  const validation = useMemo(
    () =>
      validateApProvisioningDraft({
        claimToken,
        draft,
        onboardingSessionId,
      }),
    [claimToken, draft, onboardingSessionId],
  );

  const preparedRequest = useMemo(() => {
    if (!validation.isValid) {
      return null;
    }

    return buildApProvisioningRequest({
      claimToken,
      draft,
      hardwareProfileHint,
      onboardingSessionId,
    });
  }, [claimToken, draft, hardwareProfileHint, onboardingSessionId, validation.isValid]);

  return {
    clearDraft,
    draft,
    preparedRequest,
    setWifiPassword: (wifiPassword: string) => setDraft({ wifiPassword }),
    setWifiSsid: (wifiSsid: string) => setDraft({ wifiSsid }),
    validation,
  };
}
