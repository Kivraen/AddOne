# AddOne Beta Environment

Last locked: April 4, 2026

This document defines the first always-on hosted environment for AddOne.

Goal:
- remove laptop dependency from normal device/app testing
- keep development and beta separated
- preserve the current device-authoritative runtime model

## Environment Split

### Development
Use development for day-to-day building and hardware debugging.

Components:
- local Expo dev server
- local MQTT broker
- local realtime gateway
- development Supabase project
- development firmware config

### Beta
Use beta for pre-launch validation on real phones and real hardware without the laptop in the loop.

Components:
- hosted beta Supabase project
- hosted MQTT broker
- hosted realtime gateway
- installable beta app build
- beta firmware config

Current decision:
- until a separate beta project exists, the existing hosted Supabase project `AddOne` (`sqhzaayqacmgxseiqihs`) is the beta backend
- the separate beta Supabase split is deferred because the current Supabase account hit the free-project limit
- local development should still prefer local app/gateway/broker, but the hosted AddOne Supabase project is now the beta source of truth

## Hosted Beta Shape

Recommended beta shape:
- managed MQTT broker
- one small hosted gateway service
- dedicated beta Supabase project
- EAS internal distribution app build

Current hosted beta reality on March 27, 2026:
- the current beta backend is still the hosted `AddOne` Supabase project `sqhzaayqacmgxseiqihs`
- the current hosted broker should now be addressed as `mqtt-beta.addone.studio:8883`, which resolves to `72.62.200.12`
- that broker currently uses a beta-only MQTT CA plus a server certificate whose SAN covers both `72.62.200.12` and `mqtt-beta.addone.studio`
- hardened beta firmware should now prefer `kMqttBrokerHost = "mqtt-beta.addone.studio"` and keep the current broker CA PEM pinned in `cloud_config.beta.h`
- the raw IP plus `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` override remains a supported fallback if DNS regresses, but it is no longer the preferred path
- `gateway-beta.addone.studio` now resolves publicly, but `https://gateway-beta.addone.studio/health` currently returns `HTTP 404`, so gateway health should remain an on-host VPS check until the HTTPS path is repaired

Recommended hostname targets:
- MQTT: provider hostname by default, custom domain optional later
- Gateway: `gateway-beta.addone.studio` if we want a branded endpoint
- App environment: dedicated beta Supabase URL and anon key

## Repo Configuration

### App
- use `.env.development.example` for local development values
- use `.env.beta.example` as the beta template
- local beta preview can use ignored `.env.beta`
- `APP_VARIANT=development` keeps the normal dev app identity
- `APP_VARIANT=beta` builds `AddOne Beta`
- `eas.json` owns the `development` and `beta` build profiles

### Gateway
- use `services/realtime-gateway/.env.development.example` for local runs
- use `services/realtime-gateway/.env.beta.example` for hosted beta
- deploy `services/realtime-gateway` as a long-running Node service
- the included Dockerfile is the default portable deployment shape
- the simplest default is a small hosted service such as Railway or Render
- the VPS single-host deployment in [deploy/beta-vps](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps) is the fallback path if we later want to self-host more of the stack

### Firmware
- local development profile:
  - PlatformIO env: `addone-esp32dev`
  - ignored config header: `firmware/include/cloud_config.local.h`
- beta profile:
  - PlatformIO env: `addone-esp32dev-beta`
  - ignored config header: `firmware/include/cloud_config.beta.h`
  - firmware now requires `kSupabaseRootCaPem` and `kMqttBrokerCaPem` for the shipped HTTPS + MQTT path
  - device MQTT usernames and passwords are no longer compiled into the beta header; they are issued per-device after authenticated cloud access and persisted locally
  - broker hostname should use a CA-signed endpoint; custom MQTT domain is still optional, but self-signed bootstrap is no longer the normal shipped path
  - beta devices intended for OTA validation must be flashed with the tracked dual-slot layout in [firmware/partitions/addone_ota.csv](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/partitions/addone_ota.csv)
  - field OTA will target only the application image; bootloader and partition-layout changes remain factory or USB operations
  - OTA registry records now live in Supabase `firmware_releases` plus `firmware_release_rollout_allowlist`; install requests are persisted in `device_firmware_update_requests`, not only in MQTT traffic
  - the first real OTA artifact path now uses the hosted project-domain storage bucket `firmware-artifacts`, for example:
    - rolled-back beta.2 validation artifact:
      - `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin`
    - rolled-back beta.3 validation retries:
      - `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-03/firmware-9b6857af3439fcfb.bin`
      - `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-04/firmware-4b56ab655fc7a18e.bin`
    - current active beta.3 validation artifact:
      - `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-05/firmware-2c84953dc3c58d26.bin`
  - the OTA control-plane migration is now applied on the hosted beta project, and the live REST schema now exposes `devices.firmware_channel`, `firmware_releases`, and `check_device_firmware_release(...)`
  - the owner-facing firmware card in the beta app now also depends on `get_device_firmware_update_summary(...)` plus `begin_firmware_update(...)`
  - the beta operator rollout path now uses [services/firmware-rollout-operator/index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/firmware-rollout-operator/index.mjs) for release activation, rollout targeting, operator-triggered install requests, rollback, and rollout inspection
  - that owner-facing summary currently assumes beta user devices on the shipped OTA path already use `addone-dual-ota-v1`; per-device partition layout is still not projected into an owner-readable device field
  - the original `addone_sync` OTA crash on `AO_B0CBD8CFABB0` is fixed by increasing the sync-task stack headroom in firmware
  - the rolled-back release `fw-beta-20260326-02` should stay non-active because it reproduced the stack-canary failure on real hardware
  - current March 27, 2026 OTA validation status on `AO_B0CBD8CFABB0`:
    - `fw-beta-20260327-03` is rolled back because the staged image reached `downloaded`, `verifying`, `staged`, and `rebooting`, then fell back to `2.0.0-beta.1` before `pending_confirm`
    - `fw-beta-20260327-04` is rolled back because the later no-serial retry hit `failed_download` with `reset_reason=ESP_RST_TASK_WDT`
    - the remaining artifact-stream gap was fixed by keeping availability-gated reads, restoring the smaller OTA chunk buffer, moving sync-task startup until after initial state resolution, and then shortening the per-read TLS timeout back to `1000 ms`
    - the clean no-serial real-hardware proof now exists on `fw-beta-20260327-05`:
      - backend-visible `downloaded`, `verifying`, `staged`, `rebooting`, `pending_confirm`, and `succeeded`
      - backend-visible provisional boot on `2.0.0-beta.3`
      - device stable on `2.0.0-beta.3` after the local confirmation window

## Required Beta Secrets / Values

### Beta app
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Current beta backend values live locally in:
- ignored `/.env.beta`

### Beta gateway
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TOPIC_PREFIX`

### Beta firmware
- Supabase project URL
- Supabase anon/publishable key
- Supabase CA PEM
- MQTT broker host
- MQTT broker port
- MQTT TLS verification name when the broker is still reached by raw IP
- MQTT broker CA PEM
- one per-device MQTT username and password issued after authenticated claim or on the first post-migration secure sync
- current hosted beta prefers the live MQTT hostname plus its pinned broker CA PEM; the raw IP path remains only as a fallback

## Hosted Backend Worker Workflow

Use this workflow by default for hosted beta work from this machine. Do not assume backend work is blocked unless a real command fails.

### Supabase schema work

- create or edit migrations in:
  - `supabase/migrations/`
- apply them to the linked hosted project with:
  - `npx supabase db push --linked`
- inspect migration state with:
  - `npx supabase migration list`
- use local debug or reset only when the task actually requires it:
  - `npx supabase start --debug`
  - `npx supabase db reset`

### Hosted beta queries and RPCs

- source the standard env file first:

```bash
set -a
source .codex-tmp/realtime-gateway.env
set +a
```

- after that, use `curl` against:
  - `$SUPABASE_URL/rest/v1/...`
  - `$SUPABASE_URL/rest/v1/rpc/...`
- common hosted checks already used in `S4` include:
  - `devices`
  - `device_commands`
  - `device_firmware_ota_events`
  - `device_firmware_ota_statuses`
  - `device_firmware_update_requests`
  - `firmware_releases`
  - `firmware_release_rollout_allowlist`
  - `device_mqtt_credentials`
  - `device_memberships`
  - rollout and OTA RPCs such as `begin_firmware_update(...)`, `get_device_firmware_update_summary(...)`, and `queue_device_command(...)`

### Beta VPS operations

- beta VPS access is part of the normal project workflow from this machine:
  - `ssh root@72.62.200.12`
- deploy or broker files live under:
  - `deploy/beta-vps/`
- do not claim the VPS path is blocked unless SSH or the required remote command actually fails

## Beta Bring-Up Sequence
1. Treat the current hosted Supabase project `AddOne` as beta.
2. Apply the transport hardening migration set so `issue_device_mqtt_credentials(...)` and broker sync support exist.
3. Ensure `device_runtime_snapshots` is added to `supabase_realtime`.
4. If the current hosted broker is still the raw VPS host, use `deploy/beta-vps/.env.bootstrap.example` plus `docker-compose.bootstrap.yml` instead of pretending the DNS-backed path already exists.
5. Install the current broker certificate chain, private key, and broker CA under `deploy/beta-vps/certs/`.
6. Render and install the broker password file from active device MQTT credentials and the dedicated gateway account with `deploy/beta-vps/sync-passwords.sh --compose-file ./docker-compose.bootstrap.yml`.
7. Deploy or rebuild the realtime gateway and broker with the selected compose file.
8. Prefer `mqtt-beta.addone.studio` for firmware MQTT now that DNS resolves. Keep gateway validation on-host until `https://gateway-beta.addone.studio/health` is healthy.
9. Create a beta app build with EAS internal distribution.
10. Flash the beta firmware profile with the current Supabase CA chain and current broker CA PEM in `cloud_config.beta.h`.
11. Only if MQTT DNS regresses back to a raw IP target, set `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` to the DNS SAN carried by the broker certificate before flashing.
12. Apply the OTA control-plane migration so `firmware_releases`, `device_firmware_update_requests`, and `device_firmware_ota_statuses` exist before OTA validation, then verify the hosted schema exposes `devices.firmware_channel`, `check_device_firmware_release(...)`, and `get_device_firmware_update_summary(...)` before flashing a bench OTA candidate.
13. Load release-registry rows that match the immutable HTTPS artifact metadata in [ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json).
14. Validate onboarding, today toggle, edit/save, settings, Wi-Fi recovery, reconnect, and the OTA control-plane RPCs without the laptop.

## Beta Firmware Rollout Operator Flow

Use the rollout tool from the repo root against the hosted beta env:

```bash
node services/firmware-rollout-operator/index.mjs inspect --release <release_id> --env-file .codex-tmp/realtime-gateway.env --json
node services/firmware-rollout-operator/index.mjs target --release <release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs activate --release <release_id> --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs request --release <release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs rollback --release <bad_release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
```

Operator notes:
- `target` replaces the stored rollout allowlist for that release when the mode stays `allowlist`.
- `activate` only works when the target release already points `previous_stable_release_id` at the current active beta release.
- `rollback` marks the bad release `rolled_back`, re-activates its previous stable release, and can queue the explicit rollback request for affected devices in the same command.
- `inspect` is the default rollout-state check before and after any activation or rollback change.
- Remaining manual step in this slice: artifact upload plus initial draft release-row creation still happen outside this operator tool.

## Beta Validation Checklist
- app installs without Expo Go
- sign-in works against beta
- device fetches per-device MQTT credentials over validated HTTPS
- `list_active_device_mqtt_credentials()` returns rows for flashed hardened devices
- device connects to hosted broker with its own broker account
- broker password file no longer contains `device-fleet-beta`
- gateway mirrors runtime snapshots into beta Supabase
- app receives live snapshot updates
- device and app recover cleanly after Wi-Fi loss/rejoin
- no normal device control path depends on the laptop being powered on
- no shipped firmware path relies on `setInsecure()` or fleet-shared MQTT credentials
- OTA beta validation must use immutable HTTPS firmware artifacts plus the locked release envelope in [firmware/releases/ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json)
- the published artifact URL returns `HTTP 200` over CA-validated HTTPS and the downloaded bytes match the recorded SHA-256 before a release row is inserted
- `check_device_firmware_release(...)` returns a real decision row for the beta device
- `begin_firmware_update(...)` creates a persisted install request plus one queued `begin_firmware_update` command
- `get_device_firmware_update_summary(...)` returns the owner-facing firmware card state for an authenticated owner without exposing the device auth token
- `report_device_ota_progress(...)` writes both `device_firmware_ota_events` and `device_firmware_ota_statuses`
- the original March 27, 2026 stack-canary loop is cleared; `fw-beta-20260327-05` reached `downloaded`, `verifying`, `staged`, `rebooting`, provisional `2.0.0-beta.3` boot, `pending_confirm`, and `succeeded` on real hardware
- avoid reset-toggling serial monitors during provisional OTA boots; the accepted March 27 proof run kept serial detached during the real OTA request and still completed a clean backend-visible `pending_confirm -> succeeded` pass

## Internal Release-Candidate Validation Status

Validation date:
- March 27, 2026

Exact matrix used on the accepted `T-043` baseline:
- installable app path:
  - `eas build:list --platform ios --limit 10 --json --non-interactive`
  - `eas build:list --platform android --limit 10 --json --non-interactive`
  - config audit in [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json) and [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
- active OTA release and artifact:
  - `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
  - `curl -I https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-05/firmware-2c84953dc3c58d26.bin`
- live beta cohort:
  - read-only `devices`, `device_firmware_ota_statuses`, `device_firmware_update_requests`, `device_commands`, and `device_runtime_snapshots` queries for `AO_B0CBD8CFABB0` and `AO_A4F00F767008`
  - read-only `get_device_firmware_update_summary(...)` RPC checks for both devices
  - read-only `list_active_device_mqtt_credentials()` verification that both devices still have issued per-device broker accounts
- public operator surface:
  - `curl -I https://gateway-beta.addone.studio/health`

Current result:
- passed:
  - `fw-beta-20260327-05` remains the active beta release and its immutable artifact still returns `HTTP 200`
  - `AO_B0CBD8CFABB0` remains on `2.0.0-beta.3` with backend-visible `succeeded` OTA state on `fw-beta-20260327-05`
  - both beta boards still have per-device MQTT credential rows and recent `last_seen_at` heartbeats in the hosted beta backend
- failed and blocking:
  - `AO_A4F00F767008` is still on `2.0.0-beta.1` and still rejects `begin_firmware_update` with `Unsupported command kind.`
  - no finished installable build exists for the accepted March 27, 2026 release-candidate baseline; the latest finished iOS internal build is from March 18, 2026, the latest finished iOS store build is from March 20, 2026, and there are still no finished Android builds
- non-blocking operational risk:
  - `https://gateway-beta.addone.studio/health` still is not a usable public health target because it returns `HTTP 404`; keep on-host checks until that route is repaired

Auth note for the next iOS RC build:
- the app’s sign-in surface now assumes a 6-digit email code flow with neutral AddOne copy
- before the next store-facing RC build, make sure the hosted Supabase auth email template uses `{{ .Token }}` as the primary action instead of `{{ .ConfirmationURL }}`, removes any `confirm your email` wording, and avoids localhost-facing fallback copy in the delivered email
