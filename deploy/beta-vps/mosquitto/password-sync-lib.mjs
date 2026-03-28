import { readFileSync } from "node:fs";

export function loadEnvFile(filePath) {
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

export function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeCredentialRow(row) {
  return {
    hardware_uid: typeof row?.hardware_uid === "string" ? row.hardware_uid : "",
    mqtt_password: typeof row?.mqtt_password === "string" ? row.mqtt_password : "",
    mqtt_username: typeof row?.mqtt_username === "string" ? row.mqtt_username : "",
  };
}

export function normalizeDeviceCredentials(rows) {
  return [...rows]
    .map(normalizeCredentialRow)
    .sort((left, right) => {
      const leftKey = `${left.mqtt_username}\u0000${left.hardware_uid}`;
      const rightKey = `${right.mqtt_username}\u0000${right.hardware_uid}`;
      return leftKey.localeCompare(rightKey);
    });
}

export function buildBrokerCredentialFingerprint({ deviceCredentials, gatewayPassword, gatewayUsername }) {
  return JSON.stringify({
    deviceCredentials: normalizeDeviceCredentials(deviceCredentials).map((credential) => ({
      mqtt_password: credential.mqtt_password,
      mqtt_username: credential.mqtt_username,
    })),
    gatewayPassword,
    gatewayUsername,
  });
}

export async function fetchDeviceCredentials(env, options = {}) {
  if (options.credentialsFile) {
    const raw = readFileSync(options.credentialsFile, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error("Fixture credentials file must contain a JSON array.");
    }

    return normalizeDeviceCredentials(data);
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

  return normalizeDeviceCredentials(data);
}
