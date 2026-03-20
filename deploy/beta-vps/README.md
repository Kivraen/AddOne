# AddOne Beta VPS Deployment

This is the fallback deployment shape if we decide to self-host more of beta ourselves.

Preferred beta setup stays:
- managed MQTT broker
- small hosted gateway service
- current hosted `AddOne` Supabase project as beta for now
- EAS internal app builds

Use this VPS stack only if we explicitly want the broker and gateway under our own server management.

This folder deploys the beta runtime on a single VPS with:
- `gateway-beta.addone.studio` -> HTTPS reverse-proxied realtime gateway
- `mqtt-beta.addone.studio` -> Mosquitto broker on `8883`

## Bootstrap mode: no DNS required

If we want to get off the laptop immediately and do not yet have beta DNS records, use the bootstrap stack:

- `docker-compose.bootstrap.yml`
- self-signed MQTT certificate
- device beta firmware connects to the VPS public IP on `8883`
- gateway health stays on `127.0.0.1:8787`

This is the fastest path to an always-on beta runtime.

### What bootstrap mode runs
- `realtime-gateway`
- `mosquitto`

### What bootstrap mode does not require
- no `gateway-beta.addone.studio`
- no `mqtt-beta.addone.studio`
- no public Caddy route yet

### Bootstrap env file

Copy:

```bash
cp .env.bootstrap.example .env
```

Then fill in:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_GATEWAY_PASSWORD`
- `MQTT_DEVICE_PASSWORD`

### Bootstrap certificate

Create a self-signed certificate on the VPS:

```bash
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -days 365 \
  -subj "/CN=72.62.200.12" \
  -addext "subjectAltName = IP:72.62.200.12"
```

The firmware beta profile already supports:
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = true`

So self-signed TLS is acceptable for this bootstrap phase.

### Bootstrap password file

Create `mosquitto/passwords.txt` on the VPS with:

```bash
docker run --rm -v "$PWD/mosquitto:/work" eclipse-mosquitto:2 \
  mosquitto_passwd -b -c /work/passwords.txt addone-beta-gateway your-gateway-password
docker run --rm -v "$PWD/mosquitto:/work" eclipse-mosquitto:2 \
  mosquitto_passwd -b /work/passwords.txt device-fleet-beta your-device-password
```

### Bootstrap start

```bash
docker compose -f docker-compose.bootstrap.yml up -d --build
```

### Bootstrap firmware beta config

Use:
- `kMqttBrokerHost = "72.62.200.12"`
- `kMqttBrokerPort = 8883`
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = true`

Once DNS is ready, we can move from the bootstrap stack to the fully branded domain-based stack below.

## What runs on the VPS
- `caddy`: HTTPS for the gateway
- `realtime-gateway`: bridges Supabase commands and MQTT
- `mosquitto`: beta MQTT broker

## DNS
Create `A` records for:
- `gateway-beta.addone.studio`
- `mqtt-beta.addone.studio`

Both should point to the VPS public IP.

## One-time server setup
1. Install Docker and Docker Compose plugin.
2. Copy this folder to the VPS.
3. Copy `.env.example` to `.env` and fill in real values.
4. Create `mosquitto/passwords.txt` from `mosquitto/passwords.example.txt`.
5. Obtain a certificate for `mqtt-beta.addone.studio`.

Example certificate command on the VPS:

```bash
sudo apt-get update
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d mqtt-beta.addone.studio
```

That creates:
- `/etc/letsencrypt/live/mqtt-beta.addone.studio/fullchain.pem`
- `/etc/letsencrypt/live/mqtt-beta.addone.studio/privkey.pem`

## Start

```bash
docker compose up -d --build
```

## Health checks
- Gateway:
  - `https://gateway-beta.addone.studio/health`
- Broker:
  - should accept MQTT client connections on `mqtt-beta.addone.studio:8883`

## Firmware beta config
Use:
- `kMqttBrokerHost = "mqtt-beta.addone.studio"`
- `kMqttBrokerPort = 8883`
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = true`

The current firmware beta profile uses encrypted transport but does not yet load a CA bundle, so insecure TLS is the practical beta setting for now.
