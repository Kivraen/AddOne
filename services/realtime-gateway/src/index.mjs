import "dotenv/config";

import http from "node:http";
import mqtt from "mqtt";

import { config } from "./config.mjs";
import { createSupabaseAdmin, fetchQueuedCommandEnvelope, listQueuedCommandEnvelopes } from "./supabase-admin.mjs";
import { ackWildcard, commandTopic, dayStateEventWildcard, parseTopic, presenceWildcard, runtimeSnapshotWildcard } from "./topics.mjs";

const supabase = createSupabaseAdmin(config.supabase);

const mqttClient = mqtt.connect(config.mqtt.brokerUrl, {
  clientId: `addone-gateway-${Math.random().toString(16).slice(2, 10)}`,
  password: config.mqtt.password || undefined,
  username: config.mqtt.username || undefined,
});

const recentlyPublishedCommandIds = new Map();
let queueReplayInFlight = false;

function log(message, details) {
  if (details === undefined) {
    console.log(`[gateway] ${message}`);
    return;
  }

  console.log(`[gateway] ${message}`, details);
}

function prunePublishCache() {
  const cutoff = Date.now() - 10_000;
  for (const [commandId, publishedAt] of recentlyPublishedCommandIds.entries()) {
    if (publishedAt < cutoff) {
      recentlyPublishedCommandIds.delete(commandId);
    }
  }
}

function shouldRepublish(commandId) {
  prunePublishCache();
  const publishedAt = recentlyPublishedCommandIds.get(commandId);
  if (publishedAt && Date.now() - publishedAt < 2_000) {
    return false;
  }

  recentlyPublishedCommandIds.set(commandId, Date.now());
  return true;
}

async function publishCommandEnvelope(envelope) {
  if (!envelope?.hardwareUid || !envelope?.message?.id) {
    return;
  }

  if (!shouldRepublish(envelope.message.id)) {
    return;
  }

  const topic = commandTopic(config.mqtt.topicPrefix, envelope.hardwareUid);
  const payload = JSON.stringify(envelope.message);

  mqttClient.publish(topic, payload, { qos: config.mqtt.qos }, (error) => {
    if (error) {
      log(`failed to publish command ${envelope.message.id}`, error.message);
      return;
    }

    log(`published ${envelope.message.kind} -> ${envelope.hardwareUid}`);
  });
}

async function replayQueuedCommands() {
  if (queueReplayInFlight) {
    return;
  }

  queueReplayInFlight = true;
  try {
    const commands = await listQueuedCommandEnvelopes(supabase);
    for (const envelope of commands) {
      await publishCommandEnvelope(envelope);
    }
  } finally {
    queueReplayInFlight = false;
  }
}

async function handleDeviceCommandChange(payload) {
  const record = payload?.new;
  if (!record?.id || record.status !== "queued") {
    return;
  }

  const envelope = await fetchQueuedCommandEnvelope(supabase, record.id);
  if (!envelope) {
    return;
  }

  await publishCommandEnvelope(envelope);
}

async function handleAckMessage(hardwareUid, payload) {
  const body = JSON.parse(payload);
  const { command_id, device_auth_token, last_error = null, status } = body ?? {};

  if (!command_id || !device_auth_token || !status) {
    log(`ignored invalid ack from ${hardwareUid}`);
    return;
  }

  const { error } = await supabase.rpc("ack_device_command", {
    p_command_id: command_id,
    p_device_auth_token: device_auth_token,
    p_hardware_uid: hardwareUid,
    p_last_error: last_error,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function handlePresenceMessage(hardwareUid, payload) {
  const body = JSON.parse(payload);
  const { device_auth_token, firmware_version = null, hardware_profile = null, last_sync_at = null } = body ?? {};

  if (!device_auth_token) {
    log(`ignored invalid presence from ${hardwareUid}`);
    return;
  }

  const { error } = await supabase.rpc("device_heartbeat", {
    p_device_auth_token: device_auth_token,
    p_firmware_version: firmware_version,
    p_hardware_profile: hardware_profile,
    p_hardware_uid: hardwareUid,
    p_last_sync_at: last_sync_at,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function handleDayStateEventMessage(hardwareUid, payload) {
  const body = JSON.parse(payload);
  const {
    device_auth_token,
    device_event_id,
    effective_at = null,
    is_done,
    local_date,
  } = body ?? {};

  if (!device_auth_token || !device_event_id || !local_date || typeof is_done !== "boolean") {
    log(`ignored invalid day-state event from ${hardwareUid}`);
    return;
  }

  const { error } = await supabase.rpc("record_day_state_from_device", {
    p_device_auth_token: device_auth_token,
    p_device_event_id: device_event_id,
    p_effective_at: effective_at,
    p_hardware_uid: hardwareUid,
    p_is_done: is_done,
    p_local_date: local_date,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function handleRuntimeSnapshotMessage(hardwareUid, payload) {
  const body = JSON.parse(payload);
  const {
    board_days,
    current_week_start,
    device_auth_token,
    generated_at = null,
    revision,
    settings = {},
    today_row,
  } = body ?? {};

  if (!device_auth_token || !current_week_start || !Array.isArray(board_days) || !Number.isFinite(Number(revision)) || !Number.isFinite(Number(today_row))) {
    log(`ignored invalid runtime snapshot from ${hardwareUid}`);
    return;
  }

  const { error } = await supabase.rpc("upload_device_runtime_snapshot", {
    p_board_days: board_days,
    p_current_week_start: current_week_start,
    p_device_auth_token: device_auth_token,
    p_generated_at: generated_at,
    p_hardware_uid: hardwareUid,
    p_revision: Number(revision),
    p_settings: settings ?? {},
    p_today_row: Number(today_row),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function routeDeviceMessage(topic, message) {
  const parsedTopic = parseTopic(config.mqtt.topicPrefix, topic);
  if (!parsedTopic) {
    return;
  }

  const payload = message.toString("utf8");
  const { hardwareUid, route } = parsedTopic;

  if (route === "ack") {
    await handleAckMessage(hardwareUid, payload);
    return;
  }

  if (route === "presence") {
    await handlePresenceMessage(hardwareUid, payload);
    return;
  }

  if (route === "event/day-state") {
    await handleDayStateEventMessage(hardwareUid, payload);
    return;
  }

  if (route === "snapshot/runtime") {
    await handleRuntimeSnapshotMessage(hardwareUid, payload);
  }
}

function startSupabaseSubscription() {
  return supabase
    .channel("addone-realtime-gateway")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "device_commands",
      },
      (payload) => {
        void handleDeviceCommandChange(payload).catch((error) => {
          log("failed to process device command change", error.message);
        });
      },
    )
    .subscribe((status) => {
      log(`supabase realtime status: ${status}`);
    });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

const relayServer = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-origin": "*",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
});

mqttClient.on("connect", () => {
  log("mqtt connected");
  mqttClient.subscribe(
    [
      ackWildcard(config.mqtt.topicPrefix),
      dayStateEventWildcard(config.mqtt.topicPrefix),
      presenceWildcard(config.mqtt.topicPrefix),
      runtimeSnapshotWildcard(config.mqtt.topicPrefix),
    ],
    { qos: config.mqtt.qos },
    (error) => {
      if (error) {
        log("mqtt subscribe failed", error.message);
        return;
      }

      void replayQueuedCommands().catch((replayError) => {
        log("failed to replay queued commands", replayError.message);
      });
    },
  );
});

mqttClient.on("reconnect", () => {
  log("mqtt reconnecting");
});

mqttClient.on("error", (error) => {
  log("mqtt error", error.message);
});

mqttClient.on("message", (topic, payload) => {
  void routeDeviceMessage(topic, payload).catch((error) => {
    log(`failed to handle mqtt message on ${topic}`, error.message);
  });
});

const channel = startSupabaseSubscription();
relayServer.listen(config.relay.port, () => {
  log(`gateway health listening on :${config.relay.port}`);
});

const queueReplayTimer = setInterval(() => {
  void replayQueuedCommands().catch((error) => {
    log("failed to replay queued commands", error.message);
  });
}, config.queue.pollIntervalMs);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    log(`received ${signal}, shutting down`);
    try {
      clearInterval(queueReplayTimer);
      mqttClient.end(true);
      relayServer.close();
      await supabase.removeChannel(channel);
    } finally {
      process.exit(0);
    }
  });
}
