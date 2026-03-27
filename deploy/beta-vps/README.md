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

## Hardened beta assumptions

The launch-blocking transport hardening slice changes the expected broker posture:

- firmware must validate the broker certificate with `kMqttBrokerCaPem`
- firmware must validate the Supabase certificate with `kSupabaseRootCaPem`
- device MQTT credentials are per-device and rendered into the broker password file
- the fleet-shared `device-fleet-beta` credential is no longer the normal shipped path

Because of that, self-signed MQTT bootstrap with `setInsecure()` is now lab-only and should not be treated as the deploy target for beta validation.

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
node ./mosquitto/render-passwords.mjs --env-file ./.env
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
- `kSupabaseRootCaPem = R"PEM(...root CA...)PEM"`
- `kMqttBrokerCaPem = R"PEM(...root CA...)PEM"`
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = false`

Device MQTT usernames and passwords are no longer compiled into the beta header. The device fetches them through `issue_device_mqtt_credentials(...)` after authenticated HTTPS access is working.
