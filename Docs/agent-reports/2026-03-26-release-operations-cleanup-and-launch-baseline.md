---
task_id: T-036
title: Release operations cleanup and launch baseline
date: 2026-03-26
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md
  - deploy/beta-vps/README.md
  - deploy/beta-vps/docker-compose.bootstrap.yml
  - deploy/beta-vps/docker-compose.yml
  - deploy/beta-vps/mosquitto/render-passwords.mjs
  - deploy/beta-vps/sync-passwords.sh
  - firmware/README.md
---

Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented with partial live verification on `codex/s4-release-operations-baseline`. The hosted migration is applied, the hosted broker password render/install flow is live, and one real device (`AO_B0CBD8CFABB0`) was reflashed onto the hardened HTTPS credential-issuance path and validated through a real hosted command/apply loop. The remaining blocker is device-side MQTT TLS acceptance: the same device still fails broker reconnect with `MQTT connect failed, state=-2`, while the hosted broker logs `ssl/tls alert bad certificate`. The second beta device (`AO_A4F00F767008`) is still on the legacy fleet credential and is now correctly denied by the hardened broker.

Changes made
- Repo files changed:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - [deploy/beta-vps/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/README.md)
  - [deploy/beta-vps/docker-compose.bootstrap.yml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/docker-compose.bootstrap.yml)
  - [deploy/beta-vps/docker-compose.yml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/docker-compose.yml)
  - [deploy/beta-vps/mosquitto/render-passwords.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/render-passwords.mjs)
  - [deploy/beta-vps/sync-passwords.sh](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/sync-passwords.sh)
  - [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- Local ignored firmware config changed:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.h`
  - installed the live Supabase CA chain
  - installed the live broker trust anchor
  - kept the hosted broker target at `72.62.200.12:8883`
- Operator-applied hosted files changed on the VPS:
  - `/opt/addone-beta-src/deploy/beta-vps/.env`
  - `/opt/addone-beta-src/deploy/beta-vps/mosquitto/passwords.txt`
  - `/opt/addone-beta-src/deploy/beta-vps/certs/fullchain.pem`
  - `/opt/addone-beta-src/deploy/beta-vps/certs/privkey.pem`
  - `/opt/addone-beta-src/deploy/beta-vps/certs/mqtt-ca.pem`
- Hosted rollout actions completed:
  - applied `20260326123000_transport_trust_and_device_identity_hardening.sql` to the linked Supabase beta project
  - synced the VPS deployment folder to the repo’s ACL-backed bootstrap compose
  - rendered broker passwords from `list_active_device_mqtt_credentials()`
  - replaced the broker’s legacy fleet-password file with gateway plus per-device accounts only
  - rebuilt the VPS gateway and broker stack
  - flashed the USB bench device (`/dev/cu.usbserial-10`, MAC `b0:cb:d8:cf:ab:b0`, hardware UID `AO_B0CBD8CFABB0`) with the hardened beta profile

Commands run
- `git switch -c codex/s4-release-operations-baseline 79dcfa3`
- `npx supabase migration list --linked`
- `npx supabase db push --linked --include-all --yes`
- `openssl s_client -connect 72.62.200.12:8883 -servername 72.62.200.12`
- `ssh root@72.62.200.12 ...` to inspect `/opt/addone-beta-src/deploy/beta-vps`, back it up, rewrite `.env`, sync the updated deployment files, regenerate broker cert material, render/install `passwords.txt`, and restart the bootstrap compose stack
- `node --check deploy/beta-vps/mosquitto/render-passwords.mjs`
- `bash -n deploy/beta-vps/sync-passwords.sh`
- `docker compose -f deploy/beta-vps/docker-compose.bootstrap.yml --env-file deploy/beta-vps/.env.bootstrap.example config --services`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-10`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- service-role REST queries against `sqhzaayqacmgxseiqihs.supabase.co` for:
  - `list_active_device_mqtt_credentials()`
  - `devices`
  - `device_runtime_snapshots`
  - `device_commands`

Evidence
- Hosted migration proof:
  - `npx supabase migration list --linked` now shows `20260326123000 | 20260326123000`, proving the hardening migration is present locally and remotely.
- Broker password render/install proof:
  - the live credential source now returns one row for `AO_B0CBD8CFABB0` through `list_active_device_mqtt_credentials()`
  - the VPS render/install flow wrote `mosquitto/passwords.txt` with `2` accounts
  - `grep -n "device-fleet-beta" /opt/addone-beta-src/deploy/beta-vps/mosquitto/passwords.txt` returns no matches
  - `curl -s http://127.0.0.1:8787/health` on the VPS returns `{"ok":true}`
  - `docker compose -f docker-compose.bootstrap.yml ps` shows both `addone-beta-mosquitto-1` and `addone-beta-realtime-gateway-1` up
- Real hardened-device proof:
  - serial output from the flashed USB device showed:
    - `Cloud RPC issue_device_mqtt_credentials -> HTTP 200`
    - response payload with `mqtt_username":"AO_B0CBD8CFABB0"`
    - `Provisioned device MQTT credentials for AO_B0CBD8CFABB0`
  - hosted REST evidence after reflashing shows:
    - `AO_B0CBD8CFABB0` `last_seen_at` and `last_sync_at` advancing through `2026-03-27T04:25:59.332805+00:00`
    - runtime snapshots for that device at revisions `90`, `91`, and `92`
    - hosted commands `a40d08d7-6ef7-4572-bae1-57076cbf23bd`, `7c680756-73b1-4ee2-ae49-6d604ac1de32`, and `d1be630e-d2ab-4039-8083-1dd27e2b59bf` moving through `delivered` to `applied` or `failed` with explicit timestamps and `last_error`
  - one concrete live validation loop on the hardened device:
    - command `d1be630e-d2ab-4039-8083-1dd27e2b59bf` was requested at `2026-03-27T04:22:43.526035+00:00`
    - the device applied it at `2026-03-27T04:23:19.127983+00:00`
    - the device then uploaded runtime snapshot revision `92` at `2026-03-27T04:24:51+00:00`
- Hardened broker enforcement proof:
  - the broker log now accepts the dedicated gateway account `addone-beta-gateway`
  - the broker log repeatedly rejects `AO_A4F00F767008` with `not authorised`, proving the fleet-shared bootstrap credential is no longer accepted
- Remaining MQTT reconnect blocker proof:
  - the flashed `AO_B0CBD8CFABB0` still logs repeated `MQTT connect failed, state=-2`
  - the broker log still shows repeated `ssl/tls alert bad certificate` from the same public source IP after the password-file rollout

Open risks / blockers
- The hosted migration is complete and the broker password flow is live, but the flashed hardened device still cannot complete MQTT TLS handshake against the hosted broker. This is now isolated to a device-side broker trust issue, not a missing migration or missing password row.
- `AO_A4F00F767008` is still running the old fleet credential. Under the hardened broker it is now correctly denied, so realtime for that device remains broken until it is reflashed or otherwise reprovisioned onto per-device MQTT credentials.
- The broker is still operating on the raw VPS IP instead of a finished DNS-backed beta hostname. The repo docs now quarantine that as the current hosted bootstrap path, but it remains an operator-owned prerequisite before broader rollout.
- The VPS helper flow is now Docker-only and repeatable, but the cert and key files under `/opt/addone-beta-src/deploy/beta-vps/certs/` are still operator-managed host state outside git.
- The second commanded toggle during validation (`707230a8-e447-42e4-a9a7-fcf81e37e3d5`) failed with `Runtime revision conflict.` That proves the conflict guard still works, but it also means the validation loop was not a clean pure-MQTT path.

Recommendation
Keep this branch as the real `T-036` baseline because the hosted migration, broker credential rollout, and one real hardened-device command loop are now durable and repeatable. Do one immediate focused follow-up before OTA work: resolve the ESP32 broker TLS acceptance for `AO_B0CBD8CFABB0`, then reflash or reprovision `AO_A4F00F767008` so the hosted broker is operating entirely on per-device MQTT credentials instead of a mixed fleet. Do not treat the hosted MQTT lane as launch-ready until a flashed hardened device connects to Mosquitto as `AO_B0CBD8CFABB0` without `state=-2` and without broker-side TLS alerts.
