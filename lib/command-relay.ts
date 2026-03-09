import { runtimeConfig } from "@/lib/env";

export function hasCommandRelay() {
  return runtimeConfig.commandRelayUrl.length > 0;
}

async function relayJson(path: string, accessToken: string | null | undefined, body: object) {
  if (!hasCommandRelay() || !accessToken) {
    throw new Error("Command relay is unavailable.");
  }

  const response = await fetch(`${runtimeConfig.commandRelayUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json?.error === "string" ? json.error : "Command relay request failed.");
  }

  return json;
}

export async function nudgeCommandRelay(commandId: string, accessToken: string | null | undefined) {
  if (!hasCommandRelay() || !accessToken || !commandId) {
    return;
  }

  try {
    await fetch(`${runtimeConfig.commandRelayUrl}/v1/commands/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command_id: commandId,
      }),
    });
  } catch {
    // Relay nudges are best-effort; the realtime subscription remains the fallback.
  }
}

export async function requestDayStateViaRelay(
  params: {
    clientEventId: string;
    deviceId: string;
    isDone: boolean;
    localDate: string;
  },
  accessToken: string | null | undefined,
) {
  return relayJson("/v1/day-state/request", accessToken, {
    client_event_id: params.clientEventId,
    device_id: params.deviceId,
    is_done: params.isDone,
    local_date: params.localDate,
  }) as Promise<{ command_id: string; effective_at: string; status: string }>;
}

export async function requestDayStatesBatchViaRelay(
  params: {
    batchEventId: string;
    deviceId: string;
    updates: Array<{ isDone: boolean; localDate: string }>;
  },
  accessToken: string | null | undefined,
) {
  return relayJson("/v1/day-states-batch/request", accessToken, {
    batch_event_id: params.batchEventId,
    device_id: params.deviceId,
    updates: params.updates.map((update) => ({
      is_done: update.isDone,
      local_date: update.localDate,
    })),
  }) as Promise<{ batch_event_id: string; command_id: string; effective_at: string; status: string }>;
}
