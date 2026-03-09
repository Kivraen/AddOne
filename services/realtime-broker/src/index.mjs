import net from "node:net";

import aedesFactory from "aedes";

const port = Number.parseInt(process.env.MQTT_BROKER_PORT || "1883", 10);
const host = process.env.MQTT_BROKER_HOST || "0.0.0.0";

const aedes = aedesFactory();
const server = net.createServer(aedes.handle);

function log(message, details) {
  if (details === undefined) {
    console.log(`[broker] ${message}`);
    return;
  }

  console.log(`[broker] ${message}`, details);
}

aedes.on("clientReady", (client) => {
  log(`client connected: ${client?.id ?? "unknown"}`);
});

aedes.on("clientDisconnect", (client) => {
  log(`client disconnected: ${client?.id ?? "unknown"}`);
});

aedes.on("publish", (packet, client) => {
  if (!client || packet.topic.startsWith("$SYS/")) {
    return;
  }

  log(`publish ${packet.topic} <- ${client.id}`);
});

server.listen(port, host, () => {
  log(`listening on mqtt://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    log(`received ${signal}, shutting down`);
    server.close(() => {
      aedes.close(() => process.exit(0));
    });
  });
}
