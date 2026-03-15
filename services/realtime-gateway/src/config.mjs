function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function parseInteger(name, fallback) {
  const raw = optionalEnv(name, String(fallback));
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  queue: {
    pollIntervalMs: Math.max(parseInteger("COMMAND_QUEUE_POLL_INTERVAL_MS", 1500), 250),
  },
  relay: {
    port: Math.max(parseInteger("COMMAND_RELAY_PORT", 8787), 1),
  },
  mqtt: {
    brokerUrl: requireEnv("MQTT_BROKER_URL"),
    password: optionalEnv("MQTT_PASSWORD"),
    qos: Math.min(Math.max(parseInteger("MQTT_QOS", 1), 0), 2),
    topicPrefix: optionalEnv("MQTT_TOPIC_PREFIX", "addone"),
    username: optionalEnv("MQTT_USERNAME"),
  },
  supabase: {
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    url: requireEnv("SUPABASE_URL"),
  },
};
