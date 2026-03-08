import { runtimeConfig } from "@/lib/env";
import {
  ApProvisioningDraft,
  ApProvisioningRequest,
  ApProvisioningValidationResult,
} from "@/types/addone";

export const ADDONE_DEVICE_AP_INFO_PATH = "/api/v1/provisioning/info";
export const ADDONE_DEVICE_AP_SESSION_PATH = "/api/v1/provisioning/session";

function trimOrEmpty(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function maskProvisioningSecret(secret: string) {
  if (!secret) {
    return "Not set";
  }

  if (secret.length <= 2) {
    return "•".repeat(secret.length);
  }

  return `${"•".repeat(Math.max(secret.length - 2, 0))}${secret.slice(-2)}`;
}

export function buildDeviceApInfoUrl() {
  return `${runtimeConfig.deviceApBaseUrl}${ADDONE_DEVICE_AP_INFO_PATH}`;
}

export function buildDeviceApProvisioningEndpoint() {
  return `${runtimeConfig.deviceApBaseUrl}${ADDONE_DEVICE_AP_SESSION_PATH}`;
}

export function validateApProvisioningDraft(params: {
  claimToken: string | null;
  draft: ApProvisioningDraft;
  onboardingSessionId: string | null;
}): ApProvisioningValidationResult {
  const errors: ApProvisioningValidationResult["errors"] = {};

  if (!trimOrEmpty(params.onboardingSessionId)) {
    errors.onboardingSessionId = "Start a fresh setup session before provisioning the device.";
  }

  if (!trimOrEmpty(params.claimToken)) {
    errors.claimToken = "This app runtime no longer has the one-time claim token. Start a fresh session.";
  }

  if (!trimOrEmpty(params.draft.wifiSsid)) {
    errors.wifiSsid = "Enter the home Wi-Fi network name.";
  } else if (trimOrEmpty(params.draft.wifiSsid).length > 32) {
    errors.wifiSsid = "Wi-Fi names longer than 32 characters are not supported in v1.";
  }

  if (params.draft.wifiPassword.length > 63) {
    errors.wifiPassword = "Wi-Fi passwords longer than 63 characters are not supported in v1.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function buildApProvisioningRequest(params: {
  claimToken: string | null;
  draft: ApProvisioningDraft;
  hardwareProfileHint?: string | null;
  onboardingSessionId: string | null;
}): ApProvisioningRequest {
  const validation = validateApProvisioningDraft(params);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError ?? "The AP provisioning payload is incomplete.");
  }

  return {
    endpoint: buildDeviceApProvisioningEndpoint(),
    method: "POST",
    payload: {
      schema_version: 1,
      claim_token: trimOrEmpty(params.claimToken),
      hardware_profile_hint: params.hardwareProfileHint?.trim() || null,
      onboarding_session_id: trimOrEmpty(params.onboardingSessionId),
      wifi_password: params.draft.wifiPassword,
      wifi_ssid: trimOrEmpty(params.draft.wifiSsid),
    },
  };
}
