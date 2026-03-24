import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SerialPort } from "serialport";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(toolRoot, "..", "..");
const publicRoot = path.join(toolRoot, "public");

dotenv.config({ path: path.join(toolRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(toolRoot, ".env.local"), override: true, quiet: true });

const config = {
  ambientDeltaThreshold: parseFloatWithFallback(process.env.FACTORY_STATION_AMBIENT_DELTA_THRESHOLD, 0.15),
  host: "127.0.0.1",
  manifestPath: path.resolve(repoRoot, process.env.FACTORY_STATION_MANIFEST_PATH || "firmware/releases/factory-stable.json"),
  port: parseIntWithFallback(process.env.FACTORY_STATION_PORT, 8791),
  rtcRetentionSeconds: parseIntWithFallback(process.env.FACTORY_STATION_RTC_RETENTION_SECONDS, 30),
  rtcRetentionToleranceSeconds: parseIntWithFallback(process.env.FACTORY_STATION_RTC_RETENTION_TOLERANCE_SECONDS, 10),
  stationToken: optionalEnv("FACTORY_STATION_ACCESS_TOKEN") || crypto.randomBytes(24).toString("hex"),
  supabaseKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseUrl: optionalEnv("SUPABASE_URL"),
};

const state = {
  manifest: null,
  manifestError: null,
  activeRun: null,
  serial: {
    bootInfo: defaultBootInfo(),
    isOpen: false,
    lastOpenAt: null,
    lineBuffer: "",
    lines: [],
    path: "",
    pendingResponses: new Map(),
    port: null,
    qaEvents: [],
  },
};

const CHECK_DEFINITIONS = [
  { key: "boot_identity", label: "Boot identity", requiredForPrereg: true },
  { key: "fresh_boot_state", label: "Fresh boot state", requiredForPrereg: true },
  { key: "firmware_version", label: "Firmware version", requiredForPrereg: true },
  { key: "button", label: "Button input", requiredForPrereg: true },
  { key: "ambient", label: "Ambient sensor", requiredForPrereg: true },
  { key: "rtc", label: "RTC retention", requiredForPrereg: true },
  { key: "led_matrix", label: "LED matrix", requiredForPrereg: true },
  { key: "preregistration", label: "Backend preregistration", requiredForPrereg: false },
  { key: "ship_ready_reset", label: "Ship-ready reset", requiredForPrereg: false },
];

function parseIntWithFallback(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatWithFallback(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalEnv(name) {
  return process.env[name]?.trim() || "";
}

function normalizePortPath(portPath) {
  const trimmed = String(portPath || "").trim();
  if (!trimmed) {
    return "";
  }

  if (process.platform === "darwin" && trimmed.startsWith("/dev/tty.")) {
    const candidate = trimmed.replace("/dev/tty.", "/dev/cu.");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return trimmed;
}

function flashPortPath(portPath) {
  const trimmed = String(portPath || "").trim();
  if (!trimmed) {
    return "";
  }

  if (process.platform === "darwin" && trimmed.startsWith("/dev/cu.")) {
    const candidate = trimmed.replace("/dev/cu.", "/dev/tty.");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return trimmed;
}

function isIgnoredPort(port) {
  const label = `${port.path} ${port.manufacturer || ""} ${port.serialNumber || ""}`.toLowerCase();
  return label.includes("bluetooth") ||
    label.includes("incoming-port") ||
    label.includes("debug-console") ||
    label.includes("shokz");
}

function isLikelyUsbSerialPort(port) {
  const label = `${port.path} ${port.manufacturer || ""} ${port.serialNumber || ""}`.toLowerCase();
  return label.includes("usb") ||
    label.includes("uart") ||
    label.includes("wch") ||
    label.includes("cp210") ||
    label.includes("ch340") ||
    label.includes("ftdi") ||
    label.includes("silicon labs");
}

function comparePortPriority(left, right) {
  const leftScore = left.path.startsWith("/dev/cu.") ? 0 : 1;
  const rightScore = right.path.startsWith("/dev/cu.") ? 0 : 1;
  if (leftScore !== rightScore) {
    return leftScore - rightScore;
  }
  return left.path.localeCompare(right.path);
}

let supabase = null;

function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before using backend preregistration or run-record features.");
  }

  if (!supabase) {
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

function defaultBootInfo() {
  return {
    apSsid: "",
    authoritativeTime: null,
    factoryQaArmed: null,
    factoryQaAvailable: null,
    firmwareVersion: "",
    hardwareUid: "",
    lastState: "",
    pendingClaim: null,
    readyForTracking: null,
    resetEpoch: null,
  };
}

function appendSerialLine(line) {
  state.serial.lines.push({ line, at: new Date().toISOString() });
  if (state.serial.lines.length > 400) {
    state.serial.lines.splice(0, state.serial.lines.length - 400);
  }
}

function appendQaEvent(event) {
  state.serial.qaEvents.push({ ...event, receivedAt: new Date().toISOString() });
  if (state.serial.qaEvents.length > 100) {
    state.serial.qaEvents.splice(0, state.serial.qaEvents.length - 100);
  }
}

function checkStatus(activeRun, key) {
  const status = activeRun?.qaResults?.[key]?.status;
  return status === "passed" || status === "failed" ? status : "pending";
}

function summarizeLabels(labels) {
  if (!labels || labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function buildRunAssessment(activeRun) {
  if (!activeRun) {
    return null;
  }

  const checks = CHECK_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    requiredForPrereg: definition.requiredForPrereg,
    status: checkStatus(activeRun, definition.key),
  }));
  const blockingChecks = checks.filter((check) => check.status === "failed").map((check) => check.label);
  const preregRequiredChecks = checks.filter((check) => check.requiredForPrereg);
  const missingForPrereg = preregRequiredChecks.filter((check) => check.status === "pending").map((check) => check.label);
  const failedForPrereg = preregRequiredChecks.filter((check) => check.status === "failed").map((check) => check.label);
  const preregistrationPassed = checkStatus(activeRun, "preregistration") === "passed";
  const shipReadyPassed = checkStatus(activeRun, "ship_ready_reset") === "passed";
  const readyForPrereg = missingForPrereg.length === 0 && failedForPrereg.length === 0;
  const readyForShipReset = readyForPrereg && preregistrationPassed;

  let summary = "Start by flashing approved firmware.";
  let detail = "The QA matrix will fill in as checks are captured.";
  if (blockingChecks.length > 0) {
    summary = "Board is blocked.";
    detail = `Failed checks: ${summarizeLabels(blockingChecks)}.`;
  } else if (shipReadyPassed) {
    summary = "Board is ready to ship.";
    detail = "Every required QA check and the final reset verification passed.";
  } else if (!activeRun.hardwareUid) {
    summary = "Flash approved firmware.";
    detail = "Capture the boot banner to verify hardware identity and fresh boot state.";
  } else if (!readyForPrereg) {
    if (activeRun.bootInfo?.factoryQaAvailable !== true) {
      summary = "Reconnect USB serial.";
      detail = "The board should expose factory QA automatically after the flash boot banner appears.";
    } else {
      summary = "Finish required QA checks.";
      detail = missingForPrereg.length > 0 ? `Missing: ${summarizeLabels(missingForPrereg)}.` : "Required checks are still pending.";
    }
  } else if (!preregistrationPassed) {
    summary = "Ready for preregistration.";
    detail = "All required hardware checks have passed.";
  } else {
    summary = "Ready for final ship-ready reset.";
    detail = "Run the final reset verification before shipping.";
  }

  return {
    blockingChecks,
    checks,
    detail,
    failedForPrereg,
    missingForPrereg,
    preregistrationPassed,
    readyForPrereg,
    readyForShipReset,
    shipReadyPassed,
    summary,
  };
}

function deriveRunStatus(activeRun, assessment) {
  if (!activeRun) {
    return { shipBlockReason: null, status: "draft" };
  }
  if (assessment?.blockingChecks?.length) {
    return {
      shipBlockReason: `Failed checks: ${summarizeLabels(assessment.blockingChecks)}.`,
      status: "qa_failed",
    };
  }
  if (assessment?.shipReadyPassed) {
    return { shipBlockReason: null, status: "ship_ready" };
  }
  if (assessment?.preregistrationPassed) {
    return { shipBlockReason: null, status: "preregistered" };
  }
  if (assessment?.readyForPrereg) {
    return { shipBlockReason: null, status: "qa_passed" };
  }
  if (activeRun.hardwareUid) {
    return { shipBlockReason: null, status: "flashed" };
  }
  return { shipBlockReason: null, status: "draft" };
}

function buildBootChecks(bootInfo, release) {
  const checkedAt = new Date().toISOString();
  const expectedFirmware = release?.firmware_version || "";
  const hasIdentityEvidence = Boolean(bootInfo.hardwareUid) || Boolean(bootInfo.apSsid);
  const hasFreshStateEvidence =
    bootInfo.pendingClaim !== null ||
    bootInfo.readyForTracking !== null ||
    Boolean(bootInfo.lastState);
  const hasFirmwareEvidence = Boolean(bootInfo.firmwareVersion);
  const identityPassed = Boolean(bootInfo.hardwareUid) && Boolean(bootInfo.apSsid);
  const freshBootPassed =
    bootInfo.pendingClaim === false &&
    bootInfo.readyForTracking === false &&
    bootInfo.lastState === "SetupRecovery";
  const firmwarePassed = expectedFirmware
    ? bootInfo.firmwareVersion === expectedFirmware
    : Boolean(bootInfo.firmwareVersion);

  return {
    boot_identity: {
      apSsid: bootInfo.apSsid || null,
      checkedAt,
      hardwareUid: bootInfo.hardwareUid || null,
      status: !hasIdentityEvidence ? "pending" : identityPassed ? "passed" : "failed",
      reason: !hasIdentityEvidence
        ? "Waiting for the boot banner to expose the hardware UID and AP SSID."
        : identityPassed
          ? null
          : "Boot banner did not expose both the hardware UID and AP SSID.",
    },
    firmware_version: {
      checkedAt,
      expectedFirmwareVersion: expectedFirmware || null,
      observedFirmwareVersion: bootInfo.firmwareVersion || null,
      status: !hasFirmwareEvidence ? "pending" : firmwarePassed ? "passed" : "failed",
      reason: !hasFirmwareEvidence
        ? "Waiting for the boot banner to expose the firmware version."
        : firmwarePassed
          ? null
          : `Observed firmware '${bootInfo.firmwareVersion || "unknown"}' did not match expected '${expectedFirmware || "unknown"}'.`,
    },
    fresh_boot_state: {
      checkedAt,
      pendingClaim: bootInfo.pendingClaim,
      readyForTracking: bootInfo.readyForTracking,
      state: bootInfo.lastState || null,
      status: !hasFreshStateEvidence ? "pending" : freshBootPassed ? "passed" : "failed",
      reason: !hasFreshStateEvidence
        ? "Waiting for the boot banner to expose the startup state."
        : freshBootPassed
          ? null
          : "Board did not boot into a clean SetupRecovery state with no pending claim.",
    },
  };
}

function mergeBootInfo(baseBootInfo, patch = {}) {
  return {
    ...baseBootInfo,
    apSsid: patch.apSsid ?? baseBootInfo.apSsid,
    authoritativeTime: patch.authoritativeTime ?? baseBootInfo.authoritativeTime,
    factoryQaArmed: patch.factoryQaArmed ?? baseBootInfo.factoryQaArmed,
    factoryQaAvailable: patch.factoryQaAvailable ?? baseBootInfo.factoryQaAvailable,
    firmwareVersion: patch.firmwareVersion ?? baseBootInfo.firmwareVersion,
    hardwareUid: patch.hardwareUid ?? baseBootInfo.hardwareUid,
    lastState: patch.lastState ?? baseBootInfo.lastState,
    pendingClaim: patch.pendingClaim ?? baseBootInfo.pendingClaim,
    readyForTracking: patch.readyForTracking ?? baseBootInfo.readyForTracking,
    resetEpoch: patch.resetEpoch ?? baseBootInfo.resetEpoch,
  };
}

function bootInfoFromQaDeviceInfo(deviceInfo) {
  return {
    apSsid: typeof deviceInfo.ap_ssid === "string" ? deviceInfo.ap_ssid : undefined,
    factoryQaAvailable: true,
    firmwareVersion: typeof deviceInfo.firmware_version === "string" ? deviceInfo.firmware_version : undefined,
    hardwareUid: typeof deviceInfo.hardware_uid === "string" ? deviceInfo.hardware_uid : undefined,
    lastState: typeof deviceInfo.state === "string" ? deviceInfo.state : undefined,
    pendingClaim: typeof deviceInfo.pending_claim === "boolean" ? deviceInfo.pending_claim : undefined,
    readyForTracking: typeof deviceInfo.ready_for_tracking === "boolean" ? deviceInfo.ready_for_tracking : undefined,
    resetEpoch: Number.isFinite(deviceInfo.reset_epoch) ? Number(deviceInfo.reset_epoch) : undefined,
  };
}

async function enrichBootInfoViaQa(bootInfo) {
  let enriched = { ...bootInfo };

  let qaStatus = null;
  try {
    qaStatus = await sendQaCommand("qa_status", {}, 1500);
    enriched = mergeBootInfo(enriched, {
      factoryQaAvailable: typeof qaStatus.available === "boolean" ? qaStatus.available : undefined,
      lastState: typeof qaStatus.state === "string" && !enriched.lastState ? qaStatus.state : undefined,
    });
  } catch {
    return enriched;
  }

  if (qaStatus?.available !== true) {
    return enriched;
  }

  try {
    const deviceInfo = await sendQaCommand("device_info", {}, 2000);
    enriched = mergeBootInfo(enriched, bootInfoFromQaDeviceInfo(deviceInfo));
  } catch {
    return enriched;
  }

  return enriched;
}

async function persistActiveRunState(extraFields = {}) {
  if (!state.activeRun) {
    throw new Error("No active factory run.");
  }

  const assessment = buildRunAssessment(state.activeRun);
  const derived = deriveRunStatus(state.activeRun, assessment);
  state.activeRun.status = derived.status;

  await patchActiveRun({
    qa_results: state.activeRun.qaResults,
    ship_block_reason: derived.shipBlockReason,
    status: derived.status,
    ...extraFields,
  });

  return assessment;
}

async function syncBootChecks(bootInfo, release, extraFields = {}) {
  if (!state.activeRun) {
    return null;
  }

  state.serial.bootInfo = bootInfo;
  state.activeRun.bootInfo = bootInfo;
  state.activeRun.hardwareUid = bootInfo.hardwareUid || "";
  state.activeRun.qaResults = {
    ...state.activeRun.qaResults,
    ...buildBootChecks(bootInfo, release),
  };

  return await persistActiveRunState({
    firmware_version: bootInfo.firmwareVersion || release?.firmware_version || null,
    hardware_profile: release?.hardware_profile || null,
    hardware_uid: bootInfo.hardwareUid || null,
    ...extraFields,
  });
}

function parseBootLine(line) {
  const firmwareMatch = line.match(/^AddOne firmware (.+)$/);
  if (firmwareMatch) {
    state.serial.bootInfo.firmwareVersion = firmwareMatch[1].trim();
    return;
  }

  const hardwareMatch = line.match(/^Hardware UID:\s+(.+)$/);
  if (hardwareMatch) {
    state.serial.bootInfo.hardwareUid = hardwareMatch[1].trim();
    return;
  }

  const apSsidMatch = line.match(/^AP SSID:\s+(.+)$/);
  if (apSsidMatch) {
    state.serial.bootInfo.apSsid = apSsidMatch[1].trim();
    return;
  }

  const pendingClaimMatch = line.match(/^Pending claim present:\s+(yes|no)$/i);
  if (pendingClaimMatch) {
    state.serial.bootInfo.pendingClaim = pendingClaimMatch[1].toLowerCase() === "yes";
    return;
  }

  const readyMatch = line.match(/^Ready for tracking:\s+(yes|no)$/i);
  if (readyMatch) {
    state.serial.bootInfo.readyForTracking = readyMatch[1].toLowerCase() === "yes";
    return;
  }

  const authTimeMatch = line.match(/^Authoritative time available:\s+(yes|no)$/i);
  if (authTimeMatch) {
    state.serial.bootInfo.authoritativeTime = authTimeMatch[1].toLowerCase() === "yes";
    return;
  }

  const qaAvailableMatch = line.match(/^Factory QA available:\s+(yes|no)$/i);
  if (qaAvailableMatch) {
    state.serial.bootInfo.factoryQaAvailable = qaAvailableMatch[1].toLowerCase() === "yes";
    return;
  }

  const qaArmedMatch = line.match(/^Factory QA armed at boot:\s+(yes|no)$/i);
  if (qaArmedMatch) {
    state.serial.bootInfo.factoryQaArmed = qaArmedMatch[1].toLowerCase() === "yes";
    return;
  }

  const resetEpochMatch = line.match(/^Current reset epoch:\s+(\d+)$/);
  if (resetEpochMatch) {
    state.serial.bootInfo.resetEpoch = Number.parseInt(resetEpochMatch[1], 10);
    return;
  }

  const stateMatch = line.match(/^State ->\s+(.+)$/);
  if (stateMatch) {
    state.serial.bootInfo.lastState = stateMatch[1].trim();
  }
}

function handleSerialLine(line) {
  appendSerialLine(line);

  let parsed = null;
  if (line.startsWith("{")) {
    try {
      parsed = JSON.parse(line);
    } catch {
      parsed = null;
    }
  }

  if (parsed?.type === "qa_response" && parsed.id) {
    const pending = state.serial.pendingResponses.get(parsed.id);
    if (pending) {
      state.serial.pendingResponses.delete(parsed.id);
      pending.resolve(parsed);
      return;
    }
  }

  if (parsed?.type === "qa_event") {
    appendQaEvent(parsed);
    return;
  }

  parseBootLine(line);
}

function handleSerialChunk(chunk) {
  state.serial.lineBuffer += chunk.toString("utf8");
  while (true) {
    const newlineIndex = state.serial.lineBuffer.indexOf("\n");
    if (newlineIndex === -1) {
      break;
    }
    const line = state.serial.lineBuffer.slice(0, newlineIndex).replace(/\r/g, "").trim();
    state.serial.lineBuffer = state.serial.lineBuffer.slice(newlineIndex + 1);
    if (line.length > 0) {
      handleSerialLine(line);
    }
  }
}

async function closeSerial() {
  for (const pending of state.serial.pendingResponses.values()) {
    pending.reject(new Error("Serial connection closed."));
  }
  state.serial.pendingResponses.clear();

  const port = state.serial.port;
  state.serial.port = null;
  state.serial.isOpen = false;
  state.serial.path = "";
  state.serial.lineBuffer = "";

  if (!port || !port.isOpen) {
    return;
  }

  await new Promise((resolve) => {
    port.close(() => resolve());
  });
}

async function openSerial(portPath) {
  const normalizedPortPath = normalizePortPath(portPath);
  if (!normalizedPortPath) {
    throw new Error("Serial port path is required.");
  }

  if (state.serial.port && state.serial.isOpen && state.serial.path === normalizedPortPath) {
    return;
  }

  await closeSerial();

  const serialPort = new SerialPort({
    path: normalizedPortPath,
    baudRate: 115200,
    autoOpen: false,
  });

  serialPort.on("data", handleSerialChunk);
  serialPort.on("error", (error) => {
    appendSerialLine(`[serial-error] ${error.message}`);
  });
  serialPort.on("close", () => {
    state.serial.isOpen = false;
  });

  await new Promise((resolve, reject) => {
    serialPort.open((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  state.serial.port = serialPort;
  state.serial.isOpen = true;
  state.serial.lastOpenAt = new Date().toISOString();
  state.serial.path = normalizedPortPath;
}

async function waitForBootCapture(portPath, timeoutMs = 7000) {
  state.serial.bootInfo = defaultBootInfo();
  await openSerial(normalizePortPath(portPath));

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (state.serial.bootInfo.hardwareUid && state.serial.bootInfo.apSsid) {
      return state.serial.bootInfo;
    }
    await sleep(150);
  }

  return state.serial.bootInfo;
}

async function sendQaCommand(command, payload = {}, timeoutMs = 4000) {
  if (!state.serial.port || !state.serial.isOpen) {
    throw new Error("Serial connection is not open.");
  }

  const id = crypto.randomUUID();
  const body = JSON.stringify({ id, cmd: command, ...payload });
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      state.serial.pendingResponses.delete(id);
      reject(new Error(`Timed out waiting for QA response: ${command}`));
    }, timeoutMs);
    state.serial.pendingResponses.set(id, {
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
    });
  });

  await new Promise((resolve, reject) => {
    state.serial.port.write(`${body}\n`, (error) => {
      if (error) {
        state.serial.pendingResponses.delete(id);
        reject(error);
        return;
      }
      resolve();
    });
  });

  const response = await responsePromise;
  if (!response.ok) {
    throw new Error(response.error || `QA command failed: ${command}`);
  }

  return response.result ?? {};
}

async function listPorts() {
  const ports = await SerialPort.list();
  const normalized = ports
    .map((port) => ({
      manufacturer: port.manufacturer || "",
      path: normalizePortPath(port.path),
      serialNumber: port.serialNumber || "",
    }))
    .filter((port) => port.path && !isIgnoredPort(port));

  const likelyUsb = normalized.filter(isLikelyUsbSerialPort);
  const visiblePorts = likelyUsb.length > 0 ? likelyUsb : normalized;

  return Array.from(new Map(visiblePorts.map((port) => [port.path, port])).values())
    .sort(comparePortPriority);
}

async function runCommand(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().length > 0) {
          appendSerialLine(`[cmd] ${line}`);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().length > 0) {
          appendSerialLine(`[cmd] ${line}`);
        }
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stderr, stdout });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function sha256File(filePath) {
  const buffer = await fsp.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function loadManifest() {
  try {
    const raw = JSON.parse(await fsp.readFile(config.manifestPath, "utf8"));
    if (!Array.isArray(raw.releases) || raw.releases.length === 0) {
      throw new Error("Manifest must contain at least one release.");
    }

    const releases = [];
    for (const release of raw.releases) {
      const artifacts = {};
      for (const [name, artifact] of Object.entries(release.artifacts || {})) {
        const absolutePath = path.resolve(repoRoot, artifact.path);
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Missing artifact for ${release.id}: ${artifact.path}`);
        }
        const actualSha256 = await sha256File(absolutePath);
        if (artifact.sha256 && artifact.sha256 !== actualSha256) {
          throw new Error(`Checksum mismatch for ${artifact.path}`);
        }
        artifacts[name] = {
          ...artifact,
          actualSha256,
          absolutePath,
        };
      }

      releases.push({
        ...release,
        artifacts,
      });
    }

    const defaultReleaseId = raw.default_release_id || releases[0].id;
    state.manifest = {
      default_release_id: defaultReleaseId,
      releases,
      schema_version: raw.schema_version || 1,
    };
    state.manifestError = null;
  } catch (error) {
    state.manifest = null;
    state.manifestError = error instanceof Error ? error.message : "Failed to load factory manifest.";
  }
}

function resolveRelease(releaseId) {
  if (!state.manifest) {
    throw new Error(state.manifestError || "Factory manifest is not loaded.");
  }

  const release =
    state.manifest.releases.find((candidate) => candidate.id === releaseId) ||
    state.manifest.releases.find((candidate) => candidate.id === state.manifest.default_release_id);

  if (!release) {
    throw new Error("Approved release was not found in the manifest.");
  }

  return release;
}

async function startRun(payload) {
  const release = resolveRelease(payload.releaseId);
  await closeSerial();

  const insertPayload = {
    build_notes: payload.buildNotes?.trim() || null,
    firmware_release_id: release.id,
    firmware_version: release.firmware_version || null,
    hardware_profile: release.hardware_profile || null,
    order_number: payload.orderNumber?.trim() || null,
    recipient: payload.recipient?.trim() || null,
    status: "draft",
  };

  const { data, error } = await getSupabase()
    .from("factory_device_runs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  state.activeRun = {
    backendRowId: data.id,
    bootInfo: defaultBootInfo(),
    buildNotes: insertPayload.build_notes,
    hardwareUid: "",
    orderNumber: insertPayload.order_number,
    qaResults: {},
    recipient: insertPayload.recipient,
    releaseId: release.id,
    releaseLabel: release.label,
    selectedPortPath: normalizePortPath(payload.portPath),
    status: data.status,
  };

  state.serial.lines = [];
  state.serial.qaEvents = [];
  return state.activeRun;
}

async function patchActiveRun(fields) {
  if (!state.activeRun?.backendRowId) {
    throw new Error("No active factory run.");
  }

  const { error } = await getSupabase()
    .from("factory_device_runs")
    .update(fields)
    .eq("id", state.activeRun.backendRowId);

  if (error) {
    throw new Error(error.message);
  }
}

async function flashActiveRun(portPath) {
  if (!state.activeRun) {
    throw new Error("Start a factory run before flashing.");
  }

  const release = resolveRelease(state.activeRun.releaseId);
  const normalizedPortPath = normalizePortPath(portPath);
  const serialFlashPortPath = flashPortPath(normalizedPortPath);
  const flashSegments = release.flash_segments || [];
  if (flashSegments.length === 0) {
    throw new Error("Approved release does not define flash segments.");
  }

  const args = ["pkg", "exec", "-p", "tool-esptoolpy", "--", "esptool.py", "--chip", release.chip || "esp32"];
  args.push("--port", serialFlashPortPath);
  args.push("--baud", String(release.baud || 115200));
  args.push("--before", "default_reset", "--after", "hard_reset", "write_flash", "-z");

  for (const segment of flashSegments) {
    const artifact = release.artifacts[segment.artifact];
    if (!artifact) {
      throw new Error(`Release ${release.id} is missing artifact '${segment.artifact}'.`);
    }
    args.push(segment.offset, artifact.absolutePath);
  }

  await closeSerial();
  if (normalizedPortPath !== serialFlashPortPath) {
    await sleep(1000);
  }
  await runCommand(process.execPath, [path.join(toolRoot, "src", "flash-runner.mjs"), path.join(repoRoot, "firmware"), JSON.stringify(args)], {
    cwd: repoRoot,
  });
  await sleep(250);
  const bootInfo = await enrichBootInfoViaQa(await waitForBootCapture(normalizedPortPath));

  state.activeRun.selectedPortPath = normalizedPortPath;
  await syncBootChecks(bootInfo, release);

  return bootInfo;
}

async function recordCheck(name, payload) {
  if (!state.activeRun) {
    throw new Error("No active factory run.");
  }

  state.activeRun.qaResults = {
    ...state.activeRun.qaResults,
    [name]: payload,
  };
  await persistActiveRunState();
}

async function preregisterActiveRun() {
  if (!state.activeRun?.hardwareUid) {
    throw new Error("Flash the board and capture the hardware UID before preregistration.");
  }

  const assessment = buildRunAssessment(state.activeRun);
  if (assessment?.blockingChecks?.length) {
    throw new Error(`Board is blocked by failed checks: ${summarizeLabels(assessment.blockingChecks)}.`);
  }
  if (!assessment?.readyForPrereg) {
    throw new Error(`Finish the required QA checks before preregistration. Missing: ${summarizeLabels(assessment?.missingForPrereg || [])}.`);
  }

  const release = resolveRelease(state.activeRun.releaseId);
  const { data, error } = await getSupabase().rpc("preregister_factory_device_identity", {
    p_firmware_version: state.activeRun.bootInfo.firmwareVersion || release.firmware_version || null,
    p_hardware_profile: release.hardware_profile || null,
    p_hardware_uid: state.activeRun.hardwareUid,
    p_name: "AddOne",
  });

  if (error) {
    throw new Error(error.message);
  }

  state.activeRun.qaResults = {
    ...state.activeRun.qaResults,
    preregistration: {
      checkedAt: new Date().toISOString(),
      deviceId: data?.id || null,
      firmwareVersion: data?.firmware_version || null,
      hardwareUid: data?.hardware_uid || state.activeRun.hardwareUid,
      status: "passed",
    },
  };
  await persistActiveRunState({
    device_id: data?.id || null,
    preregistered_at: new Date().toISOString(),
  });

  return data;
}

async function reconnectSerialCapture() {
  if (!state.activeRun?.selectedPortPath) {
    throw new Error("No selected USB port for the active run.");
  }

  await closeSerial();
  await sleep(800);
  const bootInfo = await enrichBootInfoViaQa(await waitForBootCapture(state.activeRun.selectedPortPath));
  const release = resolveRelease(state.activeRun.releaseId);
  await syncBootChecks(bootInfo, release);
  return bootInfo;
}

async function runFinalFactoryReset() {
  if (!state.activeRun?.selectedPortPath) {
    throw new Error("No active flashed board.");
  }

  const assessment = buildRunAssessment(state.activeRun);
  const blockingChecks = (assessment?.blockingChecks || []).filter((label) => label !== "Ship-ready reset");
  if (blockingChecks.length) {
    throw new Error(`Board is blocked by failed checks: ${summarizeLabels(blockingChecks)}.`);
  }
  if (!assessment?.readyForShipReset) {
    const missing = assessment?.preregistrationPassed
      ? assessment?.missingForPrereg || []
      : [...(assessment?.missingForPrereg || []), "Backend preregistration"];
    throw new Error(`Finish all required QA steps before the final reset. Missing: ${summarizeLabels(missing)}.`);
  }

  const currentBootInfo = await enrichBootInfoViaQa(await waitForBootCapture(state.activeRun.selectedPortPath, 1500));
  const previousResetEpoch = currentBootInfo.resetEpoch;
  await sendQaCommand("factory_reset");
  await closeSerial();
  await sleep(2000);
  const bootInfo = await enrichBootInfoViaQa(await waitForBootCapture(state.activeRun.selectedPortPath, 9000));

  const shipReady =
    bootInfo.pendingClaim === false &&
    bootInfo.readyForTracking === false &&
    bootInfo.lastState === "SetupRecovery" &&
    Boolean(bootInfo.apSsid) &&
    typeof previousResetEpoch === "number" &&
    typeof bootInfo.resetEpoch === "number" &&
    bootInfo.resetEpoch > previousResetEpoch;

  state.serial.bootInfo = bootInfo;
  state.activeRun.bootInfo = bootInfo;
  state.activeRun.qaResults = {
    ...state.activeRun.qaResults,
    ship_ready_reset: {
      checkedAt: new Date().toISOString(),
      bootInfo,
      status: shipReady ? "passed" : "failed",
      reason: shipReady ? null : "Board did not return to clean setup state after factory reset.",
    },
  };

  if (!shipReady) {
    await persistActiveRunState({
      completed_at: null,
      ready_to_ship: false,
      ready_to_ship_at: null,
    });
    return { bootInfo, readyToShip: false };
  }

  await persistActiveRunState({
    completed_at: new Date().toISOString(),
    ready_to_ship: true,
    ready_to_ship_at: new Date().toISOString(),
  });

  return { bootInfo, readyToShip: true };
}

function currentReleaseSummary() {
  if (!state.manifest) {
    return null;
  }

  return state.manifest.releases.map((release) => ({
    firmware_version: release.firmware_version,
    hardware_profile: release.hardware_profile,
    id: release.id,
    label: release.label,
  }));
}

async function getStatePayload() {
  return {
    activeRun: state.activeRun,
    assessment: buildRunAssessment(state.activeRun),
    config: {
      ambientDeltaThreshold: config.ambientDeltaThreshold,
      rtcRetentionSeconds: config.rtcRetentionSeconds,
      rtcRetentionToleranceSeconds: config.rtcRetentionToleranceSeconds,
    },
    manifest: state.manifest
      ? {
          default_release_id: state.manifest.default_release_id,
          releases: currentReleaseSummary(),
          schema_version: state.manifest.schema_version,
        }
      : null,
    manifestError: state.manifestError,
    ports: await listPorts(),
    serial: {
      bootInfo: state.serial.bootInfo,
      isOpen: state.serial.isOpen,
      lastOpenAt: state.serial.lastOpenAt,
      lines: state.serial.lines,
      path: state.serial.path,
      qaEvents: state.serial.qaEvents,
    },
  };
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function isLoopbackAddress(remoteAddress = "") {
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function allowedOrigins() {
  return new Set([
    `http://${config.host}:${config.port}`,
    `http://localhost:${config.port}`,
    `http://127.0.0.1:${config.port}`,
    `http://[::1]:${config.port}`,
  ]);
}

function assertLocalRequest(request) {
  if (!isLoopbackAddress(request.socket.remoteAddress || "")) {
    throw new HttpError(403, "Factory Station only accepts localhost connections.");
  }
}

function assertAuthorizedApiRequest(request) {
  assertLocalRequest(request);
  const providedToken = String(request.headers["x-factory-station-token"] || "");
  if (providedToken !== config.stationToken) {
    throw new HttpError(401, "Factory Station API token missing or invalid.");
  }

  const origin = String(request.headers.origin || "");
  if (origin && !allowedOrigins().has(origin)) {
    throw new HttpError(403, "Factory Station API only accepts same-origin browser requests.");
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  sendJson(response, statusCode, {
    error: error instanceof Error ? error.message : "Unexpected error.",
  });
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  return "text/html; charset=utf-8";
}

async function serveStatic(response, requestPath) {
  const safePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(publicRoot, safePath);
  if (!filePath.startsWith(publicRoot) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (safePath === "index.html") {
    const bootstrapJson = JSON.stringify({
      apiToken: config.stationToken,
    });
    const html = (await fsp.readFile(filePath, "utf8")).replace(
      "/*__FACTORY_STATION_BOOTSTRAP__*/",
      `window.__FACTORY_STATION_BOOTSTRAP__ = ${bootstrapJson};`,
    );
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypeFor(filePath),
    });
    response.end(html);
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypeFor(filePath),
  });
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/state") {
    sendJson(response, 200, await getStatePayload());
    return;
  }

  if (request.method === "POST" && pathname === "/api/run/start") {
    const body = await readJson(request);
    sendJson(response, 200, { activeRun: await startRun(body) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/flash") {
    const body = await readJson(request);
    const bootInfo = await flashActiveRun(body.portPath || state.activeRun?.selectedPortPath || "");
    sendJson(response, 200, { bootInfo });
    return;
  }

  if (request.method === "POST" && pathname === "/api/serial/reconnect") {
    const bootInfo = await reconnectSerialCapture();
    sendJson(response, 200, { bootInfo });
    return;
  }

  if (request.method === "POST" && pathname === "/api/qa/command") {
    const body = await readJson(request);
    const result = await sendQaCommand(body.command, body.payload || {}, body.timeoutMs || 4000);
    sendJson(response, 200, { result });
    return;
  }

  if (request.method === "POST" && pathname === "/api/checks/record") {
    const body = await readJson(request);
    await recordCheck(body.name, body.payload || {});
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && pathname === "/api/preregister") {
    const device = await preregisterActiveRun();
    sendJson(response, 200, { device });
    return;
  }

  if (request.method === "POST" && pathname === "/api/final-reset") {
    const result = await runFinalFactoryReset();
    sendJson(response, 200, result);
    return;
  }

  response.writeHead(404);
  response.end("Not found");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const server = http.createServer(async (request, response) => {
  try {
    assertLocalRequest(request);
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      assertAuthorizedApiRequest(request);
      await handleApi(request, response, url.pathname);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendError(response, error);
  }
});

await loadManifest();
server.listen(config.port, config.host, () => {
  console.log(`[factory-station] http://${config.host}:${config.port}`);
  if (state.manifestError) {
    console.log(`[factory-station] manifest error: ${state.manifestError}`);
  }
});
