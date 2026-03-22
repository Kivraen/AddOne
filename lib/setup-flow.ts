import {
  DeviceApProvisioningInfo,
  SetupFlowFailureCode,
  SetupFlowFailureState,
  SetupFlowKind,
  SetupFlowProgressRow,
  SetupFlowStage,
} from "@/types/addone";

function defaultFailureCopy(code: SetupFlowFailureCode): Pick<SetupFlowFailureState, "message" | "retryable" | "title"> {
  switch (code) {
    case "ap_not_joined":
      return {
        message: "Open Settings, join the AddOne network, then come back here.",
        retryable: true,
        title: "Not connected yet",
      };
    case "wifi_join_failed":
      return {
        message: "That network did not connect. Check the password and try again.",
        retryable: true,
        title: "Couldn't connect",
      };
    case "scan_empty":
      return {
        message: "No nearby networks showed up. Rescan or type the name manually.",
        retryable: true,
        title: "No networks found",
      };
    case "cloud_claim_timeout":
      return {
        message: "The board did not finish connecting in time. Try the Wi‑Fi step again.",
        retryable: true,
        title: "Still waiting",
      };
    case "restore_failed":
      return {
        message: "The board connected, but recovery did not finish. Start recovery again.",
        retryable: true,
        title: "Recovery paused",
      };
    case "session_stale":
      return {
        message: "This setup session is no longer valid on this phone. Start a fresh one.",
        retryable: true,
        title: "Session expired",
      };
  }
}

export function buildSetupFailureState(
  code: SetupFlowFailureCode,
  overrides?: Partial<Pick<SetupFlowFailureState, "message" | "retryable" | "title">>,
): SetupFlowFailureState {
  const defaults = defaultFailureCopy(code);
  return {
    code,
    message: overrides?.message ?? defaults.message,
    retryable: overrides?.retryable ?? defaults.retryable,
    title: overrides?.title ?? defaults.title,
  };
}

export function failureCodeFromApInfo(info: DeviceApProvisioningInfo | null | undefined): SetupFlowFailureCode | null {
  if (!info) {
    return null;
  }

  if (info.failure_code) {
    return info.failure_code;
  }

  if (info.provisioning_state === "ready" && info.last_failure_reason) {
    return "wifi_join_failed";
  }

  return null;
}

export function buildSetupProgressRows(params: {
  completionLabel: string;
  flow: SetupFlowKind;
  restoreLabel: string;
  stage: SetupFlowStage;
}): SetupFlowProgressRow[] {
  const { completionLabel, restoreLabel, stage } = params;
  const restoreStage = stage === "restoring_board";
  const successStage = stage === "success";
  const reconnectStage = stage === "reconnecting_board";
  const restoreState = successStage ? "complete" : restoreStage ? "active" : "pending";
  const completionState = successStage ? "active" : "pending";

  return [
    { key: "submit", label: "Sending Wi‑Fi details", state: reconnectStage || restoreStage || successStage ? "complete" : "pending" },
    {
      key: "join",
      label: "Connecting to Wi‑Fi and cloud",
      state: successStage || restoreStage ? "complete" : reconnectStage ? "active" : "pending",
    },
    {
      key: "restore",
      label: restoreLabel,
      state: restoreState,
    },
    { key: "finish", label: completionLabel, state: completionState },
  ];
}

export function logSetupFlowEvent(flow: SetupFlowKind, event: string, details?: Record<string, unknown>) {
  console.log(`[setup-flow:${flow}] ${event}`, details ?? {});
}
