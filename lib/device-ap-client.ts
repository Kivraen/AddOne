import {
  ApProvisioningRequest,
  DeviceApProvisioningInfo,
  DeviceApProvisioningResponse,
} from "@/types/addone";
import { buildDeviceApInfoUrl } from "@/lib/ap-provisioning";
import { runtimeConfig } from "@/lib/env";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProvisioningState(value: unknown): value is DeviceApProvisioningInfo["provisioning_state"] {
  return value === "ready" || value === "busy" || value === "provisioned";
}

function isProvisioningNextStep(value: unknown): value is DeviceApProvisioningResponse["next_step"] {
  return value === "connect_to_cloud" || value === "retry";
}

async function fetchDeviceJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, runtimeConfig.deviceApTimeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const rawText = await response.text();
    const data = rawText ? (JSON.parse(rawText) as unknown) : null;

    if (!response.ok) {
      const message =
        isRecord(data) && typeof data.message === "string"
          ? data.message
          : `AddOne AP returned ${response.status}.`;

      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timed out waiting for the AddOne AP. Confirm the phone is joined to the device Wi-Fi.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProvisioningInfo(data: unknown): DeviceApProvisioningInfo {
  if (!isRecord(data)) {
    throw new Error("The AddOne AP returned an invalid device info response.");
  }

  if (data.schema_version !== 1) {
    throw new Error("The AddOne AP returned an unsupported provisioning schema.");
  }

  if (typeof data.device_ap_ssid !== "string" || !isProvisioningState(data.provisioning_state)) {
    throw new Error("The AddOne AP device info response is missing required fields.");
  }

  return {
    device_ap_ssid: data.device_ap_ssid,
    firmware_version: typeof data.firmware_version === "string" ? data.firmware_version : null,
    hardware_profile: typeof data.hardware_profile === "string" ? data.hardware_profile : null,
    provisioning_state: data.provisioning_state,
    schema_version: 1,
  };
}

function mapProvisioningResponse(data: unknown): DeviceApProvisioningResponse {
  if (!isRecord(data)) {
    throw new Error("The AddOne AP returned an invalid provisioning response.");
  }

  if (data.schema_version !== 1) {
    throw new Error("The AddOne AP returned an unsupported provisioning schema.");
  }

  if (typeof data.accepted !== "boolean" || typeof data.reboot_required !== "boolean" || !isProvisioningNextStep(data.next_step)) {
    throw new Error("The AddOne AP provisioning response is missing required fields.");
  }

  return {
    accepted: data.accepted,
    message: typeof data.message === "string" ? data.message : null,
    next_step: data.next_step,
    reboot_required: data.reboot_required,
    schema_version: 1,
  };
}

export async function fetchDeviceApProvisioningInfo() {
  const data = await fetchDeviceJson<unknown>(buildDeviceApInfoUrl(), {
    method: "GET",
  });

  return mapProvisioningInfo(data);
}

export async function submitDeviceApProvisioning(request: ApProvisioningRequest) {
  const data = await fetchDeviceJson<unknown>(request.endpoint, {
    body: JSON.stringify(request.payload),
    method: request.method,
  });

  return mapProvisioningResponse(data);
}
