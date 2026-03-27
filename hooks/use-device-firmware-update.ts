import Constants from "expo-constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  beginFirmwareUpdate,
  fetchDeviceCommandStatus,
  fetchDeviceFirmwareUpdateSummary,
} from "@/lib/supabase/addone-repository";
import {
  AddOneDevice,
  DeviceFirmwareProofScenario,
  DeviceFirmwareUpdateSummary,
} from "@/types/addone";

const FIRMWARE_UPDATE_SELF_HEAL_MS = 3_000;
const FIRMWARE_COMMAND_SETTLE_MS = 2_400;
const FIRMWARE_COMMAND_POLL_MS = 400;
const DEMO_RELEASE_ID = "fw-beta-20260327-05";
const DEMO_RELEASE_VERSION = "2.0.0-beta.3";

function appVersion() {
  return Constants.expoConfig?.version?.trim() || null;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function throwOnImmediateCommandFailure(commandId?: string | null) {
  if (!commandId) {
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < FIRMWARE_COMMAND_SETTLE_MS) {
    const command = await fetchDeviceCommandStatus(commandId);
    if (command.status === "failed" || command.status === "cancelled") {
      throw new Error(command.last_error ?? "The board rejected the firmware update request.");
    }

    await sleep(FIRMWARE_COMMAND_POLL_MS);
  }
}

function demoFirmwareSummary(
  device: AddOneDevice,
  scenario?: DeviceFirmwareProofScenario | null,
): DeviceFirmwareUpdateSummary {
  const currentTimestamp = nowIso();
  const baseSummary: DeviceFirmwareUpdateSummary = {
    availabilityReason: "up_to_date",
    availableRelease: null,
    canRequestUpdate: false,
    confirmedReleaseId: DEMO_RELEASE_ID,
    currentFirmwareChannel: "beta",
    currentFirmwareVersion: DEMO_RELEASE_VERSION,
    currentState: null,
    deviceId: device.id,
    lastFailureCode: null,
    lastFailureDetail: null,
    lastReportedAt: currentTimestamp,
    lastRequestedAt: null,
    otaCompletedAt: null,
    otaStartedAt: null,
    reportedFirmwareVersion: DEMO_RELEASE_VERSION,
    targetReleaseId: null,
    updateAvailable: false,
  };

  if (!scenario || scenario === "no-update") {
    return baseSummary;
  }

  if (scenario === "available") {
    return {
      ...baseSummary,
      availabilityReason: "user_confirmation_required",
      availableRelease: {
        firmwareVersion: DEMO_RELEASE_VERSION,
        installPolicy: "user_triggered",
        minimumAppVersion: null,
        minimumConfirmedFirmwareVersion: "2.0.0-beta.1",
        releaseId: DEMO_RELEASE_ID,
      },
      canRequestUpdate: true,
      confirmedReleaseId: "fw-beta-20260326-01",
      currentFirmwareVersion: "2.0.0-beta.1",
      reportedFirmwareVersion: "2.0.0-beta.1",
      updateAvailable: true,
    };
  }

  if (scenario === "in-progress") {
    return {
      ...baseSummary,
      availabilityReason: "in_progress_recheck",
      availableRelease: {
        firmwareVersion: DEMO_RELEASE_VERSION,
        installPolicy: "user_triggered",
        minimumAppVersion: null,
        minimumConfirmedFirmwareVersion: "2.0.0-beta.1",
        releaseId: DEMO_RELEASE_ID,
      },
      confirmedReleaseId: "fw-beta-20260326-01",
      currentFirmwareVersion: "2.0.0-beta.1",
      currentState: "verifying",
      lastRequestedAt: currentTimestamp,
      otaStartedAt: currentTimestamp,
      reportedFirmwareVersion: "2.0.0-beta.1",
      targetReleaseId: DEMO_RELEASE_ID,
      updateAvailable: false,
    };
  }

  if (scenario === "failed") {
    return {
      ...baseSummary,
      availabilityReason: "user_confirmation_required",
      availableRelease: {
        firmwareVersion: DEMO_RELEASE_VERSION,
        installPolicy: "user_triggered",
        minimumAppVersion: null,
        minimumConfirmedFirmwareVersion: "2.0.0-beta.1",
        releaseId: DEMO_RELEASE_ID,
      },
      canRequestUpdate: true,
      confirmedReleaseId: "fw-beta-20260326-01",
      currentFirmwareVersion: "2.0.0-beta.1",
      currentState: "failed_download",
      lastFailureCode: "network_timeout",
      lastFailureDetail: "The board dropped off Wi-Fi before the download finished. Reconnect it, then try again.",
      lastReportedAt: currentTimestamp,
      lastRequestedAt: currentTimestamp,
      otaCompletedAt: currentTimestamp,
      otaStartedAt: currentTimestamp,
      reportedFirmwareVersion: "2.0.0-beta.1",
      targetReleaseId: DEMO_RELEASE_ID,
      updateAvailable: true,
    };
  }

  return {
    ...baseSummary,
    currentState: "succeeded",
    lastReportedAt: currentTimestamp,
    lastRequestedAt: currentTimestamp,
    otaCompletedAt: currentTimestamp,
    otaStartedAt: currentTimestamp,
    reportedFirmwareVersion: DEMO_RELEASE_VERSION,
    targetReleaseId: DEMO_RELEASE_ID,
  };
}

export function useDeviceFirmwareUpdate(
  device: AddOneDevice,
  proofScenario?: DeviceFirmwareProofScenario | null,
) {
  const { mode, status } = useAuth();
  const queryClient = useQueryClient();
  const isProofScenario = proofScenario != null;
  const isCloudSignedIn = mode === "cloud" && status === "signedIn";

  const summaryQuery = useQuery({
    enabled: isProofScenario || mode === "demo" || isCloudSignedIn,
    queryFn: async () => {
      if (isProofScenario || mode === "demo") {
        return demoFirmwareSummary(device, proofScenario);
      }

      return fetchDeviceFirmwareUpdateSummary({
        appVersion: appVersion(),
        deviceId: device.id,
      });
    },
    queryKey: addOneQueryKeys.deviceFirmwareUpdate(device.id, proofScenario ?? null),
    refetchInterval: isProofScenario || !isCloudSignedIn ? false : FIRMWARE_UPDATE_SELF_HEAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const startUpdateMutation = useMutation({
    mutationFn: async () => {
      const summary = summaryQuery.data;
      const releaseId = summary?.availableRelease?.releaseId;

      if (!releaseId) {
        throw new Error("No eligible firmware release is available for this board.");
      }

      if (isProofScenario || mode === "demo") {
        return {
          command_id: "demo-command",
          command_status: "queued",
          release_id: releaseId,
          request_id: "demo-request",
          request_status: "requested",
          requested_at: nowIso(),
        };
      }

      const result = await beginFirmwareUpdate({
        deviceId: device.id,
        releaseId,
      });
      await throwOnImmediateCommandFailure(result.command_id);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: addOneQueryKeys.deviceFirmwareUpdate(device.id, proofScenario ?? null),
      });
      await queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "addone" && query.queryKey[1] === "devices",
      });
    },
  });

  return {
    error: summaryQuery.error,
    isLoading: summaryQuery.isLoading,
    isRefreshing: summaryQuery.isFetching,
    isStartingUpdate: startUpdateMutation.isPending,
    refresh: summaryQuery.refetch,
    startUpdate: startUpdateMutation.mutateAsync,
    summary:
      summaryQuery.data ??
      (isProofScenario || mode === "demo" ? demoFirmwareSummary(device, proofScenario) : null),
  };
}
