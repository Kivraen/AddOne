# AddOne Beta VPS Deployment

This is the fallback deployment shape if we decide to self-host more of beta ourselves.

Preferred beta setup stays:
- managed MQTT broker
- small hosted gateway service
- dedicated beta Supabase project
- EAS internal app builds

Use this VPS stack only if we explicitly want the broker and gateway under our own server management.

This folder deploys the beta runtime on a single VPS with:
- `gateway-beta.addone.studio` -> HTTPS reverse-proxied realtime gateway
- `mqtt-beta.addone.studio` -> Mosquitto broker on `8883`

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
