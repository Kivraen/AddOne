import { mkdtemp, copyFile, chmod, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchDeviceCredentials, loadEnvFile, requireEnv } from "./password-sync-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const betaRoot = path.resolve(__dirname, "..");

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

function hasLocalMosquittoPasswd() {
  const result = spawnSync("mosquitto_passwd", ["-h"], {
    encoding: "utf8",
    stdio: "ignore",
  });

  if (result.error?.code === "ENOENT") {
    return false;
  }

  return true;
}

function runMosquittoPasswd(tempDir, tempPasswordPath, username, password, createFile) {
  const passwdArgs = ["-b"];
  if (createFile) {
    passwdArgs.push("-c");
  }

  passwdArgs.push(tempPasswordPath, username, password);

  if (hasLocalMosquittoPasswd()) {
    runOrThrow("mosquitto_passwd", passwdArgs);
    return;
  }

  runOrThrow("docker", [
    "run",
    "--rm",
    "-v",
    `${tempDir}:/work`,
    "eclipse-mosquitto:2",
    "mosquitto_passwd",
    ...passwdArgs.map((value) => (value === tempPasswordPath ? "/work/passwords.txt" : value)),
  ]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...loadEnvFile(args.envFile),
    ...process.env,
  };

  const gatewayUsername = requireEnv(env, "MQTT_GATEWAY_USERNAME");
  const gatewayPassword = requireEnv(env, "MQTT_GATEWAY_PASSWORD");
  const deviceCredentials = await fetchDeviceCredentials(env, {
    credentialsFile: args.credentialsFile,
  });

  if (args.dryRun) {
    console.log(`[mosquitto-sync] gateway user: ${gatewayUsername}`);
    console.log(`[mosquitto-sync] device credential count: ${deviceCredentials.length}`);
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-mosquitto-"));
  const tempPasswordPath = path.join(tempDir, "passwords.txt");
  try {
    runMosquittoPasswd(tempDir, tempPasswordPath, gatewayUsername, gatewayPassword, true);

    for (const credential of deviceCredentials) {
      if (!credential?.mqtt_username || !credential?.mqtt_password) {
        throw new Error("Encountered an incomplete device MQTT credential row.");
      }

      runMosquittoPasswd(tempDir, tempPasswordPath, credential.mqtt_username, credential.mqtt_password, false);
    }

    await copyFile(tempPasswordPath, args.output);
    await chmod(args.output, 0o644);
    console.log(`[mosquitto-sync] wrote ${deviceCredentials.length + 1} broker accounts to ${args.output}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[mosquitto-sync] ${error.message}`);
  process.exitCode = 1;
});
