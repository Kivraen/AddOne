import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBrokerCredentialFingerprint,
  fetchDeviceCredentials,
  loadEnvFile,
  requireEnv,
} from "./password-sync-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const betaRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    credentialsFile: null,
    envFile: path.join(betaRoot, ".env"),
    intervalMs: null,
    once: false,
    output: null,
    skipRestart: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--credentials-file" && argv[index + 1]) {
      args.credentialsFile = path.resolve(argv[index + 1]);
      index += 1;
    } else if (value === "--env-file" && argv[index + 1]) {
      args.envFile = path.resolve(argv[index + 1]);
      index += 1;
    } else if (value === "--interval-ms" && argv[index + 1]) {
      args.intervalMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (value === "--once") {
      args.once = true;
    } else if (value === "--output" && argv[index + 1]) {
      args.output = path.resolve(argv[index + 1]);
      index += 1;
    } else if (value === "--skip-restart") {
      args.skipRestart = true;
    }
  }

  return args;
}

function log(message, details) {
  if (details === undefined) {
    console.log(`[broker-sync] ${message}`);
    return;
  }

  console.log(`[broker-sync] ${message}`, details);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

function parseIntervalMs(rawValue, fallback) {
  const value = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(value, 1_000);
}

function resolveContainerName(env) {
  const explicitName = env.MQTT_BROKER_CONTAINER_NAME?.trim();
  if (explicitName) {
    return explicitName;
  }

  const composeProjectName = env.COMPOSE_PROJECT_NAME?.trim();
  if (!composeProjectName) {
    return null;
  }

  return `${composeProjectName}-mosquitto-1`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...loadEnvFile(args.envFile),
    ...process.env,
  };

  const gatewayUsername = requireEnv(env, "MQTT_GATEWAY_USERNAME");
  const gatewayPassword = requireEnv(env, "MQTT_GATEWAY_PASSWORD");
  const outputPath = args.output ?? path.resolve(env.MQTT_PASSWORD_SYNC_OUTPUT_PATH?.trim() || "/work/mosquitto/passwords.txt");
  const intervalMs = args.intervalMs ?? parseIntervalMs(env.MQTT_PASSWORD_SYNC_INTERVAL_MS, 5_000);
  const mosquittoContainerName = args.skipRestart ? null : resolveContainerName(env);
  const renderScriptPath = path.join(__dirname, "render-passwords.mjs");

  if (!args.skipRestart && !mosquittoContainerName) {
    throw new Error("Missing MQTT_BROKER_CONTAINER_NAME or COMPOSE_PROJECT_NAME for broker restart automation.");
  }

  let activeFingerprint = null;
  let syncInFlight = false;

  async function runSync(reason) {
    if (syncInFlight) {
      return;
    }

    syncInFlight = true;
    try {
      const deviceCredentials = await fetchDeviceCredentials(env, {
        credentialsFile: args.credentialsFile,
      });
      const nextFingerprint = buildBrokerCredentialFingerprint({
        deviceCredentials,
        gatewayPassword,
        gatewayUsername,
      });

      if (activeFingerprint === nextFingerprint) {
        return;
      }

      log(`credential fingerprint changed (${reason}); refreshing broker password file`, {
        deviceCredentialCount: deviceCredentials.length,
      });

      const renderArgs = [renderScriptPath, "--output", outputPath];
      if (args.credentialsFile) {
        renderArgs.push("--credentials-file", args.credentialsFile);
      }

      await runCommand("node", renderArgs, { env });

      if (!args.skipRestart && mosquittoContainerName) {
        await runCommand("docker", ["restart", mosquittoContainerName], { env });
        log(`restarted ${mosquittoContainerName} to apply broker credential changes`);
      } else {
        log("rendered broker password file without container restart");
      }

      activeFingerprint = nextFingerprint;
    } catch (error) {
      log("credential sync failed", error instanceof Error ? error.message : String(error));
    } finally {
      syncInFlight = false;
    }
  }

  await runSync("startup");
  if (args.once) {
    return;
  }

  const timer = setInterval(() => {
    void runSync("poll");
  }, intervalMs);

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      clearInterval(timer);
      process.exit(0);
    });
  }
}

main().catch((error) => {
  console.error(`[broker-sync] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
