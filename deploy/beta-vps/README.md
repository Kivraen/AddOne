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

Current hosted beta reality on March 27, 2026:
- the live host is still `72.62.200.12`
- the broker is still presenting a self-signed certificate
- `gateway-beta.addone.studio` is not resolving publicly yet
- the current hosted baseline should therefore use the bootstrap compose path plus a pinned broker certificate in firmware until DNS-backed cutover is real

## Hardened beta assumptions

The launch-blocking transport hardening slice changes the expected broker posture:

- firmware must validate the broker certificate with `kMqttBrokerCaPem`
- firmware must validate the Supabase certificate with `kSupabaseRootCaPem`
- device MQTT credentials are per-device and rendered into the broker password file
- the fleet-shared `device-fleet-beta` credential is no longer the normal shipped path

Because of that, self-signed MQTT bootstrap with `setInsecure()` is now lab-only and should not be treated as the deploy target for beta validation.
The current hosted beta fallback is different: it still uses a self-signed broker certificate, but the hardened firmware must pin that certificate in `cloud_config.beta.h` instead of disabling verification.

## What runs on the VPS
- `caddy`: HTTPS for the gateway
- `realtime-gateway`: bridges Supabase commands and MQTT
- `mosquitto`: beta MQTT broker

## Current hosted bootstrap path

Use this path for the current VPS until public DNS and CA-signed broker hosting are actually live.

1. Copy `.env.bootstrap.example` to `.env` and fill in the real values.
2. Keep the broker certificate and key in `./certs/fullchain.pem` and `./certs/privkey.pem`.
3. Start or rebuild the hosted stack:

```bash
docker compose -f docker-compose.bootstrap.yml up -d --build
```

4. Render and install broker passwords from the transport-credential source of truth:

```bash
./sync-passwords.sh --compose-file ./docker-compose.bootstrap.yml
```

That command:
- calls `list_active_device_mqtt_credentials()` through `mosquitto/render-passwords.mjs`
- rewrites `mosquitto/passwords.txt`
- recreates or restarts the `mosquitto` service under the selected compose file

5. Flash the beta firmware profile with:
- the current Supabase CA chain in `kSupabaseRootCaPem`
- the current broker CA in `kMqttBrokerCaPem`
- `kMqttBrokerHost = "72.62.200.12"`
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = false`

6. After each credential issuance or revocation event, rerun:

```bash
./sync-passwords.sh --compose-file ./docker-compose.bootstrap.yml
```

7. Verify the fleet-shared bootstrap credential is gone:

```bash
rg -n "device-fleet-beta" ./mosquitto/passwords.txt
```

That command should return no matches once the hardened broker password file is installed.

## Later DNS-backed path

Use this only after `gateway-beta.addone.studio` and `mqtt-beta.addone.studio` are real and the broker is using a CA-signed certificate.

## DNS
Create `A` records for:
- `gateway-beta.addone.studio`
- `mqtt-beta.addone.studio`

Both should point to the VPS public IP.

## One-time server setup for the DNS-backed path
1. Install Docker and Docker Compose plugin.
2. Copy this folder to the VPS.
3. Copy `.env.example` to `.env` and fill in real values.
4. Render `mosquitto/passwords.txt` from live broker credentials.
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

## Start the DNS-backed path

```bash
./sync-passwords.sh --compose-file ./docker-compose.yml
docker compose up -d --build
```

## Health checks
- Gateway:
  - current hosted bootstrap path: `curl http://127.0.0.1:8787/health` from the VPS
  - later DNS-backed path: `https://gateway-beta.addone.studio/health`
- Broker:
  - current hosted bootstrap path: `openssl s_client -connect 72.62.200.12:8883 -servername 72.62.200.12`
  - later DNS-backed path: `mqtt-beta.addone.studio:8883`

## Firmware beta config
Use the current live host until DNS-backed cutover is real:
- `kMqttBrokerHost = "72.62.200.12"`
- `kMqttBrokerPort = 8883`
- `kSupabaseRootCaPem = R"PEM(...current Supabase CA chain...)PEM"`
- `kMqttBrokerCaPem = R"PEM(...current broker CA...)PEM"`
- `kMqttUseTls = true`
- `kMqttAllowInsecureTls = false`

Device MQTT usernames and passwords are no longer compiled into the beta header. The device fetches them through `issue_device_mqtt_credentials(...)` after authenticated HTTPS access is working.
