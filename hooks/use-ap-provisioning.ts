import { useMemo, useState } from "react";

import { buildApProvisioningRequest, validateApProvisioningDraft } from "@/lib/ap-provisioning";
import { ApProvisioningDraft } from "@/types/addone";

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
  const [draft, setDraft] = useState<ApProvisioningDraft>({
    wifiPassword: "",
    wifiSsid: "",
  });

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
    clearDraft: () =>
      setDraft({
        wifiPassword: "",
        wifiSsid: "",
      }),
    draft,
    preparedRequest,
    setWifiPassword: (wifiPassword: string) =>
      setDraft((current) => ({
        ...current,
        wifiPassword,
      })),
    setWifiSsid: (wifiSsid: string) =>
      setDraft((current) => ({
        ...current,
        wifiSsid,
      })),
    validation,
  };
}
