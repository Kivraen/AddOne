import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvFile(filePath) {
  const env = {};
  try {
    const contents = readFileSync(filePath, "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      env[key] = value;
    }
  } catch {
    return env;
  }

  return env;
}

function parseArgs(argv) {
  const args = {
    command: "",
    envFile: "",
    hardwareUids: [],
    json: false,
    mode: "allowlist",
    releaseId: "",
    source: "operator",
    rolloutValue: null,
  };

  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    if (value === "--json") {
      args.json = true;
      continue;
    }

    const next = argv[index + 1];
    if (!next) {
      throw new Error(`Missing value for ${value}.`);
    }

    if (value === "--env-file") {
      args.envFile = path.resolve(repoRoot, next);
    } else if (value === "--hardware-uids") {
      args.hardwareUids = splitCsv(next);
    } else if (value === "--mode") {
      args.mode = next.trim();
    } else if (value === "--release") {
      args.releaseId = next.trim();
    } else if (value === "--source") {
      args.source = next.trim();
    } else if (value === "--value") {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error("--value must be an integer.");
      }
      args.rolloutValue = parsed;
    } else {
      throw new Error(`Unknown flag: ${value}`);
    }

    index += 1;
  }

  args.command = positionals[0] || "";
  return args;
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Accept-Profile": "public",
    "Content-Profile": "public",
    "Content-Type": "application/json",
  };
}

function buildInFilter(values) {
  return `(${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`).join(",")})`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return payload;
}

function getSingleRow(rows, missingMessage) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(missingMessage);
  }

  return rows[0];
}

class SupabaseOperatorClient {
  constructor(url, serviceRoleKey) {
    this.baseUrl = url.replace(/\/+$/, "");
    this.headers = buildHeaders(serviceRoleKey);
  }

  async rpc(name, body) {
    const payload = await fetchJson(`${this.baseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (Array.isArray(payload)) {
      return payload[0] ?? null;
    }

    return payload;
  }

  async query(table, params) {
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    return fetchJson(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  async fetchRelease(releaseId) {
    const rows = await this.query("firmware_releases", {
      select: [
        "release_id",
        "status",
        "firmware_version",
        "hardware_profile",
        "channel",
        "install_policy",
        "rollout_mode",
        "rollout_value",
        "previous_stable_release_id",
        "artifact_url",
        "artifact_sha256",
        "artifact_size_bytes",
        "minimum_app_version",
        "minimum_confirmed_firmware_version",
        "notes",
        "created_at",
        "updated_at",
      ].join(","),
      release_id: `eq.${releaseId}`,
      limit: 1,
    });

    return getSingleRow(rows, `Release not found: ${releaseId}`);
  }

  async fetchActiveRelease(channel, hardwareProfile) {
    const rows = await this.query("firmware_releases", {
      select: "release_id,status,firmware_version,updated_at",
      status: "eq.active",
      channel: `eq.${channel}`,
      hardware_profile: `eq.${hardwareProfile}`,
      limit: 1,
    });

    return rows[0] ?? null;
  }

  async fetchAllowlist(releaseId) {
    return this.query("firmware_release_rollout_allowlist", {
      select: "hardware_uid,created_at",
      release_id: `eq.${releaseId}`,
      order: "hardware_uid.asc",
    });
  }

  async fetchStatuses(releaseId) {
    return this.query("device_firmware_ota_statuses", {
      select: [
        "device_id",
        "current_state",
        "target_release_id",
        "confirmed_release_id",
        "reported_firmware_version",
        "last_failure_code",
        "last_failure_detail",
        "last_requested_at",
        "last_reported_at",
        "ota_started_at",
        "ota_completed_at",
        "install_request_id",
        "command_id",
        "updated_at",
      ].join(","),
      or: `(target_release_id.eq.${releaseId},confirmed_release_id.eq.${releaseId})`,
      order: "updated_at.desc",
    });
  }

  async fetchRequests(releaseId) {
    return this.query("device_firmware_update_requests", {
      select: "id,device_id,release_id,command_id,status,request_source,requested_at,completed_at,last_error,updated_at",
      release_id: `eq.${releaseId}`,
      order: "requested_at.desc",
    });
  }

  async fetchEvents(releaseId) {
    return this.query("device_firmware_ota_events", {
      select: "id,device_id,state,failure_code,failure_detail,firmware_version,reported_at",
      release_id: `eq.${releaseId}`,
      order: "reported_at.desc",
      limit: 20,
    });
  }

  async fetchDevicesByIds(deviceIds) {
    if (deviceIds.length === 0) {
      return [];
    }

    return this.query("devices", {
      select: "id,hardware_uid,firmware_version,firmware_channel,hardware_profile,last_seen_at",
      id: `in.${buildInFilter(deviceIds)}`,
    });
  }

  async fetchDevicesByHardwareUids(hardwareUids) {
    if (hardwareUids.length === 0) {
      return [];
    }

    return this.query("devices", {
      select: "id,hardware_uid,firmware_version,firmware_channel,hardware_profile,last_seen_at",
      hardware_uid: `in.${buildInFilter(hardwareUids)}`,
      order: "hardware_uid.asc",
    });
  }

  async fetchCommandStatuses(commandIds) {
    if (commandIds.length === 0) {
      return [];
    }

    return this.query("device_commands", {
      select: "id,status,delivered_at,applied_at,failed_at,last_error",
      id: `in.${buildInFilter(commandIds)}`,
    });
  }
}

function requireReleaseId(releaseId) {
  if (!releaseId) {
    throw new Error("--release is required.");
  }
}

function requireHardwareUids(hardwareUids) {
  if (!hardwareUids.length) {
    throw new Error("--hardware-uids is required.");
  }
}

function summarizeCounts(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const label = row?.[key] || "unknown";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, count]) => ({ label, count }));
}

function printResult(args, result) {
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  switch (args.command) {
    case "activate":
      console.log(`Activated ${result.release_id} (${result.firmware_version}).`);
      if (result.archived_release_id) {
        console.log(`Archived previous active release: ${result.archived_release_id}.`);
      }
      console.log(`Rollout mode: ${result.rollout_mode}${result.rollout_value ? ` (${result.rollout_value})` : ""}.`);
      console.log(`Allowlist count: ${result.allowlist_count}.`);
      break;
    case "target":
      console.log(`Retargeted ${result.release_id} to ${result.rollout_mode}${result.rollout_value ? ` (${result.rollout_value})` : ""}.`);
      console.log(`Allowlist count: ${result.allowlist_count}.`);
      break;
    case "request":
      console.log(`Queued ${result.requests.length} operator request(s) for ${result.release_id}.`);
      break;
    case "rollback":
      console.log(`Rolled back ${result.rollback.rolled_back_release_id} and reactivated ${result.rollback.rollback_target_release_id}.`);
      if (result.requests.length > 0) {
        console.log(`Queued ${result.requests.length} rollback request(s).`);
      }
      break;
    case "inspect":
      console.log(`Release ${result.release.release_id}: ${result.release.status} (${result.release.firmware_version})`);
      if (result.active_release) {
        console.log(`Current active release: ${result.active_release.release_id}`);
      }
      console.log(`Rollout mode: ${result.release.rollout_mode}${result.release.rollout_value ? ` (${result.release.rollout_value})` : ""}.`);
      console.log(`Allowlist count: ${result.allowlist.length}.`);
      if (result.current_state_counts.length > 0) {
        console.log("Current device states:");
        for (const entry of result.current_state_counts) {
          console.log(`- ${entry.label}: ${entry.count}`);
        }
      }
      break;
    default:
      console.log(JSON.stringify(result, null, 2));
  }
}

async function requestRelease(client, releaseId, hardwareUids, source) {
  requireReleaseId(releaseId);
  requireHardwareUids(hardwareUids);

  const devices = await client.fetchDevicesByHardwareUids(hardwareUids);
  const devicesByHardwareUid = new Map(devices.map((device) => [device.hardware_uid, device]));
  const missingHardwareUids = hardwareUids.filter((hardwareUid) => !devicesByHardwareUid.has(hardwareUid));
  if (missingHardwareUids.length > 0) {
    throw new Error(`Devices not found for hardware UID(s): ${missingHardwareUids.join(", ")}`);
  }

  const requests = [];
  for (const hardwareUid of hardwareUids) {
    const device = devicesByHardwareUid.get(hardwareUid);
    const response = await client.rpc("begin_firmware_update", {
      p_device_id: device.id,
      p_release_id: releaseId,
      p_request_source: source,
    });

    requests.push({
      hardware_uid: hardwareUid,
      device_id: device.id,
      request: response,
    });
  }

  return {
    release_id: releaseId,
    request_source: source,
    requests,
  };
}

async function inspectRelease(client, releaseId) {
  requireReleaseId(releaseId);

  const release = await client.fetchRelease(releaseId);
  const [allowlist, statuses, requests, events, activeRelease] = await Promise.all([
    client.fetchAllowlist(releaseId),
    client.fetchStatuses(releaseId),
    client.fetchRequests(releaseId),
    client.fetchEvents(releaseId),
    client.fetchActiveRelease(release.channel, release.hardware_profile),
  ]);

  const deviceIds = [
    ...new Set([
      ...statuses.map((row) => row.device_id),
      ...requests.map((row) => row.device_id),
      ...events.map((row) => row.device_id),
    ].filter(Boolean)),
  ];

  const commandIds = [...new Set(requests.map((row) => row.command_id).filter(Boolean))];

  const [devices, commands] = await Promise.all([
    client.fetchDevicesByIds(deviceIds),
    client.fetchCommandStatuses(commandIds),
  ]);

  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const commandsById = new Map(commands.map((command) => [command.id, command]));
  const latestRequestByDeviceId = new Map();

  for (const request of requests) {
    if (!latestRequestByDeviceId.has(request.device_id)) {
      latestRequestByDeviceId.set(request.device_id, request);
    }
  }

  const deviceSummaries = statuses.map((status) => {
    const device = devicesById.get(status.device_id) || {};
    const request = latestRequestByDeviceId.get(status.device_id) || null;
    const command = request?.command_id ? commandsById.get(request.command_id) || null : null;
    return {
      device_id: status.device_id,
      hardware_uid: device.hardware_uid || "",
      current_firmware_version: device.firmware_version || "",
      firmware_channel: device.firmware_channel || "",
      last_seen_at: device.last_seen_at || null,
      current_state: status.current_state || null,
      target_release_id: status.target_release_id || null,
      confirmed_release_id: status.confirmed_release_id || null,
      reported_firmware_version: status.reported_firmware_version || null,
      last_failure_code: status.last_failure_code || null,
      last_failure_detail: status.last_failure_detail || null,
      last_requested_at: status.last_requested_at || null,
      last_reported_at: status.last_reported_at || null,
      ota_started_at: status.ota_started_at || null,
      ota_completed_at: status.ota_completed_at || null,
      request_id: request?.id || null,
      request_status: request?.status || null,
      request_source: request?.request_source || null,
      request_last_error: request?.last_error || null,
      command_id: request?.command_id || null,
      command_status: command?.status || null,
      command_last_error: command?.last_error || null,
    };
  });

  return {
    release,
    active_release: activeRelease,
    allowlist,
    current_state_counts: summarizeCounts(deviceSummaries, "current_state"),
    request_status_counts: summarizeCounts(requests, "status"),
    devices: deviceSummaries,
    recent_events: events.map((event) => ({
      ...event,
      hardware_uid: devicesById.get(event.device_id)?.hardware_uid || "",
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === "help" || args.command === "--help") {
    console.log([
      "Usage:",
      "  node services/firmware-rollout-operator/index.mjs <command> [options]",
      "",
      "Commands:",
      "  activate --release <release_id>",
      "  target --release <release_id> [--mode allowlist|all|percentage] [--value <1-100>] [--hardware-uids <uid1,uid2>]",
      "  request --release <release_id> --hardware-uids <uid1,uid2> [--source operator|auto_rollout]",
      "  rollback --release <release_id> [--hardware-uids <uid1,uid2>]",
      "  inspect --release <release_id>",
      "",
      "Global options:",
      "  --env-file <path>",
      "  --json",
    ].join("\n"));
    return;
  }

  const env = {
    ...(args.envFile ? loadEnvFile(args.envFile) : {}),
    ...process.env,
  };

  const client = new SupabaseOperatorClient(
    requireEnv(env, "SUPABASE_URL"),
    requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
  );

  let result;
  if (args.command === "activate") {
    requireReleaseId(args.releaseId);
    result = await client.rpc("operator_activate_firmware_release", {
      p_release_id: args.releaseId,
    });
  } else if (args.command === "target") {
    requireReleaseId(args.releaseId);
    result = await client.rpc("operator_set_firmware_release_rollout", {
      p_release_id: args.releaseId,
      p_rollout_mode: args.mode,
      p_rollout_value: args.rolloutValue,
      p_hardware_uids: args.hardwareUids,
    });
  } else if (args.command === "request") {
    result = await requestRelease(client, args.releaseId, args.hardwareUids, args.source);
  } else if (args.command === "rollback") {
    requireReleaseId(args.releaseId);
    const rollback = await client.rpc("operator_rollback_firmware_release", {
      p_release_id: args.releaseId,
    });
    const requests = args.hardwareUids.length > 0
      ? (await requestRelease(client, rollback.rollback_target_release_id, args.hardwareUids, "operator")).requests
      : [];
    result = { rollback, requests };
  } else if (args.command === "inspect") {
    result = await inspectRelease(client, args.releaseId);
  } else {
    throw new Error(`Unknown command: ${args.command}`);
  }

  printResult(args, result);
}

main().catch((error) => {
  console.error(`[firmware-rollout-operator] ${error.message}`);
  process.exitCode = 1;
});
