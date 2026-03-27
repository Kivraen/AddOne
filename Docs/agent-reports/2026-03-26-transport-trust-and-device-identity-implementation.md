---
task_id: T-035
title: Transport trust and device identity hardening implementation
date: 2026-03-26
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-implementation.md
  - deploy/beta-vps/.env.bootstrap.example
  - deploy/beta-vps/.env.example
  - deploy/beta-vps/README.md
  - deploy/beta-vps/docker-compose.bootstrap.yml
  - deploy/beta-vps/docker-compose.yml
  - deploy/beta-vps/mosquitto/acl.txt
  - deploy/beta-vps/mosquitto/mosquitto.conf
  - deploy/beta-vps/mosquitto/passwords.example.txt
  - deploy/beta-vps/mosquitto/render-passwords.mjs
  - firmware/README.md
  - firmware/include/cloud_config.beta.example.h
  - firmware/include/cloud_config.beta.h
  - firmware/include/cloud_config.h
  - firmware/include/cloud_config.local.example.h
  - firmware/include/cloud_config.local.h
  - firmware/src/cloud_client.cpp
  - firmware/src/cloud_client.h
  - firmware/src/firmware_app.cpp
  - firmware/src/realtime_client.cpp
  - firmware/src/realtime_client.h
  - services/realtime-gateway/README.md
  - supabase/README.md
  - supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql
---

Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-transport-trust-and-device-identity`. Repo-grounded verification passed for firmware build, broker ACL config shape, and broker-password render flow. Live beta migration and real secret application are still pending, so this is not yet end-to-end infra-verified against the hosted environment.

Changes made
- Firmware HTTPS now fails closed unless `CloudConfig::kSupabaseRootCaPem` is populated, and the shipped code path uses `setCACert(...)` instead of `setInsecure()`. See [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L566) and [cloud_config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.h#L14).
- Firmware MQTT now fails closed unless `CloudConfig::kMqttBrokerCaPem` is populated, and the TLS path fetches per-device MQTT credentials from `issue_device_mqtt_credentials(...)` instead of using fleet-shared header credentials. See [realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp#L69), [realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp#L271), and [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L107).
- Runtime self-reregistration on auth failure was removed. Auth failure now logs a secure re-onboard or reprovision requirement instead of calling `register_factory_device(...)` from the shipped path. See [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L626).
- Firmware now persists device-scoped MQTT credentials locally and clears them on factory reset alongside the product-auth token. See [cloud_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.h#L38), [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L91), and [firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp#L995).
- Supabase now has a service-only `device_mqtt_credentials` table plus `issue_device_mqtt_credentials(...)`, `list_active_device_mqtt_credentials()`, and revocation on factory reset or account removal. See [20260326123000_transport_trust_and_device_identity_hardening.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql#L3), [20260326123000_transport_trust_and_device_identity_hardening.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql#L37), [20260326123000_transport_trust_and_device_identity_hardening.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql#L85), [20260326123000_transport_trust_and_device_identity_hardening.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql#L164), and [20260326123000_transport_trust_and_device_identity_hardening.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql#L202).
- The VPS broker fallback now enforces an ACL file keyed to the device username and topic namespace, and a render script can build `passwords.txt` from the dedicated gateway account plus active per-device credentials. See [mosquitto.conf](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/mosquitto.conf#L6), [acl.txt](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/acl.txt#L1), and [render-passwords.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/render-passwords.mjs).
- Scoped docs now reflect the split between product auth and transport auth, the removal of insecure TLS from the shipped path, and the rollout requirement to render broker passwords after the migration. See [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L110), [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md#L77), [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md#L94), and [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md#L88).
- Exact files changed:
- `Docs/AddOne_Backend_Model.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-implementation.md`
- `deploy/beta-vps/.env.bootstrap.example`
- `deploy/beta-vps/.env.example`
- `deploy/beta-vps/README.md`
- `deploy/beta-vps/docker-compose.bootstrap.yml`
- `deploy/beta-vps/docker-compose.yml`
- `deploy/beta-vps/mosquitto/acl.txt`
- `deploy/beta-vps/mosquitto/mosquitto.conf`
- `deploy/beta-vps/mosquitto/passwords.example.txt`
- `deploy/beta-vps/mosquitto/render-passwords.mjs`
- `firmware/README.md`
- `firmware/include/cloud_config.beta.example.h`
- `firmware/include/cloud_config.beta.h` (ignored local header)
- `firmware/include/cloud_config.h`
- `firmware/include/cloud_config.local.example.h`
- `firmware/include/cloud_config.local.h` (ignored local header)
- `firmware/src/cloud_client.cpp`
- `firmware/src/cloud_client.h`
- `firmware/src/firmware_app.cpp`
- `firmware/src/realtime_client.cpp`
- `firmware/src/realtime_client.h`
- `services/realtime-gateway/README.md`
- `supabase/README.md`
- `supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql`

Commands run
- `git status --short --branch`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,260p'` over the required S4 task, stage, plan, report, transport, beta environment, backend model, firmware, gateway, deployment, and migration docs
- `rg -n "setInsecure|register_factory_device|device_auth_token|mqtt|MQTT_USERNAME|MQTT_PASSWORD|acl|password_file|allow_anonymous|claim|redeem|broker" firmware services deploy/beta-vps supabase`
- `pio run -e addone-esp32dev-beta`
- `node --check deploy/beta-vps/mosquitto/render-passwords.mjs`
- `node --check services/realtime-gateway/src/index.mjs`
- `node --check services/realtime-gateway/src/config.mjs`
- `node deploy/beta-vps/mosquitto/render-passwords.mjs --dry-run --env-file deploy/beta-vps/.env.example --credentials-file /tmp/addone-mqtt-credentials-fixture.json`
- `node --input-type=module -e "import { commandTopic, ackWildcard, runtimeSnapshotWildcard } from './services/realtime-gateway/src/topics.mjs'; ..."`
- `rg -n "setInsecure\\(" firmware/src firmware/include`
- `rg -n "device-fleet-beta" firmware services/realtime-gateway deploy/beta-vps/mosquitto`
- `git diff --name-only`
- `git diff --stat`

Evidence
- Firmware build proof: `pio run -e addone-esp32dev-beta` completed successfully and produced `.pio/build/addone-esp32dev-beta/firmware.bin`.
- Service/runtime proof for the new transport path: `node --check` passed for the gateway entrypoints and the broker password render script, and the render script executed in fixture dry-run mode with `gateway user: addone-beta-gateway` and `device credential count: 2`.
- ACL proof: the broker config now loads `acl_file /mosquitto/config/acl.txt`, and the ACL file constrains device traffic to `addone/device/%u/...` topics while reserving wildcard command publish for the dedicated gateway account. See [mosquitto.conf](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/mosquitto.conf#L6) and [acl.txt](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/acl.txt#L6).
- Explicit proof that insecure TLS is no longer the normal shipped path:
- `rg -n "setInsecure\\(" firmware/src firmware/include` returned no matches.
- `rg -n "device-fleet-beta" firmware services/realtime-gateway deploy/beta-vps/mosquitto` returned no matches.
- Firmware HTTPS now requires `kSupabaseRootCaPem` and calls `setCACert(...)`. See [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L566).
- Firmware MQTT now requires `kMqttBrokerCaPem` and calls `setCACert(...)`. See [realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp#L271).
- Runtime self-reregistration is explicitly removed from the shipped path and replaced with a secure reprovision requirement. See [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L626).

Open risks / blockers
- The repo does not contain a live beta `.env`, broker certificate PEM, or Supabase service-role secret for this branch, so I could not run the broker render script against the real environment or apply the migration to the hosted beta backend from this workspace.
- `firmware/include/cloud_config.beta.h` and `firmware/include/cloud_config.local.h` are ignored local headers. They now expose the new CA fields and disable insecure TLS, but they still need real PEM material before a flashed device can use the secure path successfully.
- Wider deployment now depends on an operator step after the migration and after any new device credential issuance: render `deploy/beta-vps/mosquitto/passwords.txt` from `list_active_device_mqtt_credentials()` and reload or restart Mosquitto so new device credentials become active.
- The first slice keeps MQTT payload `device_auth_token` in place as defense in depth. That is acceptable for this narrow hardening pass, but it is still a later cleanup target if the gateway eventually trusts broker-enforced publisher identity alone.

Recommendation
Keep this slice as the candidate hardening baseline, then perform the rollout steps before broader beta use: apply `20260326123000_transport_trust_and_device_identity_hardening.sql` to the beta backend, populate real `kSupabaseRootCaPem` and `kMqttBrokerCaPem` values in the ignored firmware headers, render and install the broker password file from `deploy/beta-vps/mosquitto/render-passwords.mjs`, and only then run hosted device validation for claim, reconnect, MQTT publish or subscribe, and reset or removal revocation.
