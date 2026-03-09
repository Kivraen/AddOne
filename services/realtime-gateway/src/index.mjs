import "dotenv/config";

import http from "node:http";
import mqtt from "mqtt";

import { config } from "./config.mjs";
import {
  createSupabaseAdmin,
  fetchQueuedCommandEnvelope,
  isApprovedDeviceOwner,
  listQueuedCommandEnvelopes,
  requestDayStateFromAppRelay,
  requestDayStatesBatchFromAppRelay,
} from "./supabase-admin.mjs";
import { ackWildcard, commandTopic, dayStateEventWildcard, parseTopic, presenceWildcard } from "./topics.mjs";

const supabase = createSupabaseAdmin(config.supabase);

const mqttClient = mqtt.connect(config.mqtt.brokerUrl, {
  clientId: `addone-gateway-${Math.random().toString(16).slice(2, 10)}`,
  password: config.mqtt.password || undefined,
  username: config.mqtt.username || undefined,
});

const recentlyPublishedCommandIds = new Map();

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

async function authenticateRelayRequest(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

async function replayQueuedCommands() {
  const commands = await listQueuedCommandEnvelopes(supabase);
  for (const envelope of commands) {
    await publishCommandEnvelope(envelope);
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
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

async function handleRelayPublish(request, response) {
  const user = await authenticateRelayRequest(request);
  if (!user) {
    sendJson(response, 401, { error: "Unauthorized." });
    return;
  }

  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
  }

  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body." });
    return;
  }

  const commandId = typeof body.command_id === "string" ? body.command_id.trim() : "";
  if (!commandId) {
    sendJson(response, 400, { error: "command_id is required." });
    return;
  }

  const envelope = await fetchQueuedCommandEnvelope(supabase, commandId);
  if (!envelope) {
    sendJson(response, 404, { error: "Queued command not found." });
    return;
  }

  const isOwner = await isApprovedDeviceOwner(supabase, envelope.deviceId, user.id);
  if (!isOwner) {
    sendJson(response, 403, { error: "Only the owner can publish this device command." });
    return;
  }

  await publishCommandEnvelope(envelope);
  sendJson(response, 202, {
    command_id: commandId,
    hardware_uid: envelope.hardwareUid,
    status: "published",
  });
}

async function readJsonBody(request, response) {
  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
  }

  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body." });
    return null;
  }
}

async function handleDayStateRequest(request, response) {
  const user = await authenticateRelayRequest(request);
  if (!user) {
    sendJson(response, 401, { error: "Unauthorized." });
    return;
  }

  const body = await readJsonBody(request, response);
  if (!body) {
    return;
  }

  const clientEventId = typeof body.client_event_id === "string" ? body.client_event_id.trim() : "";
  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  const localDate = typeof body.local_date === "string" ? body.local_date.trim() : "";
  const isDone = typeof body.is_done === "boolean" ? body.is_done : null;

  if (!clientEventId || !deviceId || !localDate || typeof isDone !== "boolean") {
    sendJson(response, 400, { error: "client_event_id, device_id, local_date, and is_done are required." });
    return;
  }

  const data = await requestDayStateFromAppRelay(supabase, {
    clientEventId,
    deviceId,
    isDone,
    localDate,
    userId: user.id,
  });

  const commandId = data?.command_id;
  if (typeof commandId === "string" && commandId) {
    const envelope = await fetchQueuedCommandEnvelope(supabase, commandId);
    if (envelope) {
      await publishCommandEnvelope(envelope);
    }
  }

  sendJson(response, 202, {
    command_id: data?.command_id ?? null,
    effective_at: data?.effective_at ?? null,
    status: data?.status ?? "queued",
  });
}

async function handleDayStateBatchRequest(request, response) {
  const user = await authenticateRelayRequest(request);
  if (!user) {
    sendJson(response, 401, { error: "Unauthorized." });
    return;
  }

  const body = await readJsonBody(request, response);
  if (!body) {
    return;
  }

  const batchEventId = typeof body.batch_event_id === "string" ? body.batch_event_id.trim() : "";
  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  const updates = Array.isArray(body.updates) ? body.updates : null;

  if (!batchEventId || !deviceId || !updates) {
    sendJson(response, 400, { error: "batch_event_id, device_id, and updates are required." });
    return;
  }

  const normalizedUpdates = updates
    .map((update) => ({
      is_done: typeof update?.is_done === "boolean" ? update.is_done : null,
      local_date: typeof update?.local_date === "string" ? update.local_date.trim() : "",
    }))
    .filter((update) => typeof update.is_done === "boolean" && update.local_date);

  if (normalizedUpdates.length === 0) {
    sendJson(response, 400, { error: "At least one valid update is required." });
    return;
  }

  const data = await requestDayStatesBatchFromAppRelay(supabase, {
    batchEventId,
    deviceId,
    updates: normalizedUpdates,
    userId: user.id,
  });

  const commandId = data?.command_id;
  if (typeof commandId === "string" && commandId) {
    const envelope = await fetchQueuedCommandEnvelope(supabase, commandId);
    if (envelope) {
      await publishCommandEnvelope(envelope);
    }
  }

  sendJson(response, 202, {
    batch_event_id: data?.batch_event_id ?? null,
    command_id: data?.command_id ?? null,
    effective_at: data?.effective_at ?? null,
    status: data?.status ?? "queued",
  });
}

const relayServer = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-origin": "*",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/commands/publish") {
    void handleRelayPublish(request, response).catch((error) => {
      log("relay publish failed", error.message);
      sendJson(response, 500, { error: "Failed to publish device command." });
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/day-state/request") {
    void handleDayStateRequest(request, response).catch((error) => {
      log("day-state relay failed", error.message);
      sendJson(response, 500, { error: "Failed to request device day-state update." });
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/day-states-batch/request") {
    void handleDayStateBatchRequest(request, response).catch((error) => {
      log("day-state batch relay failed", error.message);
      sendJson(response, 500, { error: "Failed to request device history update." });
    });
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
  log(`command relay listening on :${config.relay.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    log(`received ${signal}, shutting down`);
    try {
      mqttClient.end(true);
      relayServer.close();
      await supabase.removeChannel(channel);
    } finally {
      process.exit(0);
    }
  });
}
