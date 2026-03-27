import { readFileSync } from "node:fs";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const betaRoot = path.resolve(__dirname, "..");

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
    credentialsFile: null,
    dryRun: false,
    envFile: path.join(betaRoot, ".env"),
    output: path.join(__dirname, "passwords.txt"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--credentials-file" && argv[index + 1]) {
      args.credentialsFile = path.resolve(argv[index + 1]);
      index += 1;
    } else if (value === "--env-file" && argv[index + 1]) {
      args.envFile = path.resolve(argv[index + 1]);
      index += 1;
    } else if (value === "--output" && argv[index + 1]) {
      args.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function fetchDeviceCredentials(env, args) {
  if (args.credentialsFile) {
    const raw = readFileSync(args.credentialsFile, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error("Fixture credentials file must contain a JSON array.");
    }

    return data;
  }

  const supabaseUrl = requireEnv(env, "SUPABASE_URL");
  const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/list_active_device_mqtt_credentials`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`Credential fetch failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Credential fetch returned a non-array payload.");
  }

  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...loadEnvFile(args.envFile),
    ...process.env,
  };

  const gatewayUsername = requireEnv(env, "MQTT_GATEWAY_USERNAME");
  const gatewayPassword = requireEnv(env, "MQTT_GATEWAY_PASSWORD");
  const deviceCredentials = await fetchDeviceCredentials(env, args);

  if (args.dryRun) {
    console.log(`[mosquitto-sync] gateway user: ${gatewayUsername}`);
    console.log(`[mosquitto-sync] device credential count: ${deviceCredentials.length}`);
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-mosquitto-"));
  const tempPasswordPath = path.join(tempDir, "passwords.txt");
  try {
    runOrThrow("docker", [
      "run",
      "--rm",
      "-v",
      `${tempDir}:/work`,
      "eclipse-mosquitto:2",
      "mosquitto_passwd",
      "-b",
      "-c",
      "/work/passwords.txt",
      gatewayUsername,
      gatewayPassword,
    ]);

    for (const credential of deviceCredentials) {
      if (!credential?.mqtt_username || !credential?.mqtt_password) {
        throw new Error("Encountered an incomplete device MQTT credential row.");
      }

      runOrThrow("docker", [
        "run",
        "--rm",
        "-v",
        `${tempDir}:/work`,
        "eclipse-mosquitto:2",
        "mosquitto_passwd",
        "-b",
        "/work/passwords.txt",
        credential.mqtt_username,
        credential.mqtt_password,
      ]);
    }

    await copyFile(tempPasswordPath, args.output);
    console.log(`[mosquitto-sync] wrote ${deviceCredentials.length + 1} broker accounts to ${args.output}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[mosquitto-sync] ${error.message}`);
  process.exitCode = 1;
});
