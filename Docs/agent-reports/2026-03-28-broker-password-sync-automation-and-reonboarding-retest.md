Stage
S4: Beta Hardening And Durable Release Memory

Status
Release-blocker fix implemented on `codex/s4-mqtt-broker-sync-automation`.

The hosted beta stack now refreshes broker credentials automatically through a dedicated `broker-password-sync` sidecar. The full different-account re-onboarding retest on `AO_B0CBD8CFABB0` passed, the board reconnected to MQTT automatically after claim, and Home control worked again without the earlier polling-only regression.

The manual VPS recovery step is gone for normal operation. `deploy/beta-vps/sync-passwords.sh` remains only as a fallback/manual recovery tool.

Changes made
- Implemented shared broker-sync helpers in `deploy/beta-vps/mosquitto/password-sync-lib.mjs` to load env, fetch `list_active_device_mqtt_credentials()`, normalize rows, and fingerprint the active broker credential set.
- Refactored `deploy/beta-vps/mosquitto/render-passwords.mjs` to use the shared helper and to render passwords either with local `mosquitto_passwd` or a temporary `eclipse-mosquitto:2` container fallback.
- Added `deploy/beta-vps/mosquitto/watch-passwords.mjs`, a long-running poller that compares the live credential fingerprint, rewrites `mosquitto/passwords.txt` on change, and restarts the Mosquitto container automatically.
- Added `deploy/beta-vps/broker-password-sync.Dockerfile` and wired `broker-password-sync` into both `deploy/beta-vps/docker-compose.bootstrap.yml` and `deploy/beta-vps/docker-compose.yml`.
- Added `MQTT_PASSWORD_SYNC_INTERVAL_MS` to both beta env examples and updated VPS docs to describe the new steady-state automation path.
- Documented the branch result in this report without changing coordinator-owned plan or stage-register documents.

Exact automation path implemented
- Supabase remains the source of truth through `rpc/list_active_device_mqtt_credentials`.
- `broker-password-sync` polls that RPC every `MQTT_PASSWORD_SYNC_INTERVAL_MS`.
- When the credential fingerprint changes, the sidecar runs `node mosquitto/render-passwords.mjs --output /work/mosquitto/passwords.txt`.
- `render-passwords.mjs` rewrites the broker password file with the gateway account plus every active device MQTT credential.
- The sidecar then runs `docker restart ${COMPOSE_PROJECT_NAME}-mosquitto-1`.
- Devices and the gateway reconnect against the refreshed broker state without a manual VPS `sync-passwords.sh` run.

Exact files changed
- `Docs/AddOne_Beta_Environment.md`
- `Docs/agent-reports/2026-03-28-broker-password-sync-automation-and-reonboarding-retest.md`
- `deploy/beta-vps/.env.bootstrap.example`
- `deploy/beta-vps/.env.example`
- `deploy/beta-vps/README.md`
- `deploy/beta-vps/broker-password-sync.Dockerfile`
- `deploy/beta-vps/docker-compose.bootstrap.yml`
- `deploy/beta-vps/docker-compose.yml`
- `deploy/beta-vps/mosquitto/passwords.example.txt`
- `deploy/beta-vps/mosquitto/password-sync-lib.mjs`
- `deploy/beta-vps/mosquitto/render-passwords.mjs`
- `deploy/beta-vps/mosquitto/watch-passwords.mjs`

Commands run
- `git status --short`
- `git diff --stat`
- `node --check deploy/beta-vps/mosquitto/password-sync-lib.mjs`
- `node --check deploy/beta-vps/mosquitto/render-passwords.mjs`
- `node --check deploy/beta-vps/mosquitto/watch-passwords.mjs`
- `cp deploy/beta-vps/.env.bootstrap.example deploy/beta-vps/.env`
- `docker compose -f deploy/beta-vps/docker-compose.bootstrap.yml config`
- `docker compose -f deploy/beta-vps/docker-compose.yml config`
- `rm deploy/beta-vps/.env`
- `node deploy/beta-vps/mosquitto/watch-passwords.mjs --once --skip-restart --env-file deploy/beta-vps/.env.bootstrap.example --credentials-file /var/folders/2w/c40t6wx97h13jnvmxsv1tzjm0000gn/T/addone-broker-sync-fixture.json --output /var/folders/2w/c40t6wx97h13jnvmxsv1tzjm0000gn/T/addone-broker-sync-passwords.txt`
- `docker build -f deploy/beta-vps/broker-password-sync.Dockerfile deploy/beta-vps`
- `tar -cf - deploy/beta-vps/.env.bootstrap.example deploy/beta-vps/.env.example deploy/beta-vps/README.md deploy/beta-vps/broker-password-sync.Dockerfile deploy/beta-vps/docker-compose.bootstrap.yml deploy/beta-vps/docker-compose.yml deploy/beta-vps/mosquitto/passwords.example.txt deploy/beta-vps/mosquitto/password-sync-lib.mjs deploy/beta-vps/mosquitto/render-passwords.mjs deploy/beta-vps/mosquitto/watch-passwords.mjs | ssh root@72.62.200.12 "cd /opt/addone-beta-src && tar -xf -"`
- `ssh root@72.62.200.12 "cd /opt/addone-beta-src/deploy/beta-vps && docker compose -f docker-compose.bootstrap.yml up -d --build broker-password-sync"`
- `ssh root@72.62.200.12 "docker logs --since 15m addone-beta-broker-password-sync-1"`
- `ssh root@72.62.200.12 "docker logs --since 15m addone-beta-mosquitto-1"`
- `ssh root@72.62.200.12 "docker ps --format '{{.Names}} {{.Status}}' | grep 'addone-beta-'"` 
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`
- multiple `node --input-type=module -e '...'` service-role queries against `devices`, `device_memberships`, `device_mqtt_credentials`, `device_onboarding_sessions`, `device_commands`, and `device_runtime_snapshots`

Evidence
- Live credential-change proof on the hosted beta stack:
  - The sidecar logs showed `credential fingerprint changed (poll)` twice after a live revoke/reissue exercise on offline device `AO_A4F00F767008`.
  - The first poll rewrote the broker file with `deviceCredentialCount: 1`, wrote `2 broker accounts`, and restarted `addone-beta-mosquitto-1`.
  - The second poll rewrote the broker file with `deviceCredentialCount: 2`, wrote `3 broker accounts`, and restarted `addone-beta-mosquitto-1`.
  - Mosquitto logs immediately showed `addone-beta-gateway` reconnecting and `addone-AO_B0CBD8CFABB0` reconnecting successfully over TLS after each automated restart.
- Live different-account re-onboarding proof on the same board:
  - Serial showed `Boot-time factory reset requested` and the board returned to `SetupRecovery` with AP `AddOne-ABB0`.
  - Serial then showed Wi-Fi provisioning accepted for onboarding session `070d1735-f684-41ba-97de-b7e459741032`.
  - Serial showed `Cloud RPC redeem_device_onboarding_claim -> HTTP 200` for new user `2a173566-0f57-4a05-a52c-7d7b02602c8a`.
  - `device_memberships` now shows new owner row `155362d0-6004-4670-a798-6ba470858ff5` for that user with `approved_at = 2026-03-28T14:14:04.837441+00:00`, while prior owner row `81d2cbc3-44de-469e-b3f9-88254ab39191` is now `status = revoked`.
  - Serial showed `Cloud RPC issue_device_mqtt_credentials -> HTTP 200` and `Provisioned device MQTT credentials for AO_B0CBD8CFABB0`.
  - Serial then showed `MQTT connected, subscribed to addone/device/AO_B0CBD8CFABB0/command`.
  - Mosquitto logs showed a fresh connection from `107.131.130.90` as `addone-AO_B0CBD8CFABB0` at `1774707249` after the re-onboarding flow.
- Live post-re-onboarding control proof from the app:
  - Serial showed `MQTT command queued: a2ad083f-aa39-4e76-930e-bf307c0c2917 (set_day_state)`.
  - Serial showed `Applied cloud day state 2026-03-28 -> done`, `Acked command a2ad083f-aa39-4e76-930e-bf307c0c2917 as applied`, and `Uploaded runtime snapshot revision 2`.
  - `device_commands` row `a2ad083f-aa39-4e76-930e-bf307c0c2917` is `status = applied`, with `requested_at = 2026-03-28T14:15:07.125304+00:00`, `delivered_at = 2026-03-28T14:15:07.809589+00:00`, and `applied_at = 2026-03-28T14:15:07.809589+00:00`.
  - The live device row now reports `last_snapshot_at = 2026-03-28T14:15:40+00:00` and `last_runtime_revision = 3`.
- Important nuance for this exact retest:
  - The target device credential row for `AO_B0CBD8CFABB0` stayed on the same secret value (`b652939ebfe063e01cde3969de19aac383edf5a5e6cb1201`) before and after the new-account claim.
  - Because that specific re-onboarding reused the same device secret, the sidecar did not need to refresh Mosquitto during the user-visible claim itself.
  - The automation path was still proven live by the separate revoke/reissue exercise on the same hosted stack, and the re-onboarded board still proved automatic MQTT reconnect plus successful command delivery afterward.

Open risks / blockers
- `deploy/beta-vps/mosquitto/render-passwords.mjs` currently writes `passwords.txt` with permissive host-side ownership and mode, so Mosquitto logs warnings about future stricter file-permission enforcement. This is not blocking current beta validation, but it should be cleaned up before relying on a future broker version that refuses those files.
- The exact stale-password regression only manifests when the Supabase credential source of truth actually changes. This retest changed ownership and proved MQTT reconnect/control on the same board, but the target device secret itself was reused on this specific claim.
- The remote VPS checkout stayed dirty on `main`, so deployment was done by copying only the scoped beta-VPS files instead of updating the whole remote repo.

Recommendation
Keep this branch as the S4 broker-sync fix branch and proceed with normal beta validation. The manual VPS password-refresh step is no longer required in normal operation.

Before final release signoff, do one narrow cleanup pass on broker file ownership/permissions so Mosquitto’s current warnings do not become a later upgrade hazard.
