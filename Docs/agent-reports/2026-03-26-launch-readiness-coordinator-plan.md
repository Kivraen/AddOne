---
task_id: T-034
title: Launch readiness coordinator plan and next moves
date: 2026-03-26
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md
---

Stage
S4: Beta Hardening And Durable Release Memory

Status
Coordinator synthesis complete. The repo now has a durable launch-planning baseline built from the security and OTA research passes. `T-034` can be treated as planning-complete enough to start implementation slices, but launch readiness itself is still blocked on transport trust, broker and device identity hardening, release-operations cleanup, and the full firmware OTA path.

Current deployment path
- Mobile app release is real today through EAS. `beta` uses internal distribution and `testflight` uses store distribution, both with `APP_VARIANT=beta` and the hosted Supabase project configured through public Expo env vars. [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L14) [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L22) [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js#L6) [lib/env.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/env.ts#L1) [lib/supabase.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase.ts#L17)
- Backend and realtime currently run as a hosted beta stack: the current hosted `AddOne` Supabase project acts as beta for now, and the realtime gateway bridges Supabase `device_commands` to MQTT topics on a managed broker or VPS fallback. [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md#L34) [Docs/AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md#L24) [services/realtime-gateway/src/config.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/config.mjs#L28) [services/realtime-gateway/src/index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/index.mjs#L331)
- Firmware release is still factory and lab-oriented: the beta firmware profile is `addone-esp32dev-beta`, the runtime config comes from ignored headers, and the only concrete release artifact flow in repo is the factory manifest flashed over USB by the factory station. [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini#L34) [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md#L37) [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md#L6)
- The current “stable” factory manifest still points at a planning-branch QA candidate rather than a promoted stable release artifact. [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L3) [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L8)

Current security posture
- Positive controls already present:
  - core Supabase tables and runtime snapshots have RLS
  - device auth tokens are hashed server-side
  - sensitive factory and device registration RPCs are not public
  - factory station is loopback-only and API-token protected
  [supabase/migrations/20260308113000_init_addone_schema.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308113000_init_addone_schema.sql#L796)
  [supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql#L43)
  [supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql#L354)
  [tools/factory-station/src/server.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/src/server.mjs#L1098)
- Critical blockers:
  - firmware HTTPS still disables certificate verification with `setInsecure()`
  - beta MQTT still allows insecure TLS with `kMqttAllowInsecureTls = true`
  [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L497)
  [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp#L50)
  [firmware/include/cloud_config.beta.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.example.h#L11)
- High blockers:
  - broker identity is still fleet-shared or namespace-based rather than per-device isolated
  - broker ACL enforcement is not present in the self-hosted fallback config
  - gateway remains broadly privileged with service-role access and wildcard device subscriptions
  [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L145)
  [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L149)
  [deploy/beta-vps/mosquitto/mosquitto.conf](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/mosquitto.conf#L5)
  [services/realtime-gateway/src/index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/index.mjs#L333)
- Medium blockers:
  - auth email and redirect posture are still staging-grade
  - release provenance is only partially mature because the default shipped firmware release is not yet a promoted stable artifact
  - current runtime self-reregistration behavior conflicts with the intended backend trust model and should not survive into launch posture
  [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml#L154)
  [app/sign-in.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/sign-in.tsx#L67)
  [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L8)
  [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp#L526)

Current update posture
- App updates:
  - current launch-capable path is store-managed builds through TestFlight / App Store / Play Store
  - there is no Expo JS OTA path wired in the current repo
  [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L14)
  [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L22)
  [package.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/package.json#L18)
  [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js#L4)
- Firmware updates:
  - current path is manual and factory-based, not field OTA
  - there is no launch-ready remote firmware update system in the repo yet
  [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md#L6)
  [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L3)
- Launch update policy now recommended by the research:
  - keep app updates store-managed at launch
  - keep Expo JS OTA optional and deferred
  - treat firmware OTA as required for customer launch
  - use automatic discovery plus staged eligibility, with user-triggered firmware install by default
  - require operator pause, bad-release halt, and rollback controls
  [Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md)
- Existing app data already supports a narrow update surface rather than a brand-new model: `firmwareVersion`, `lastSeenAt`, `lastSyncAt`, `syncState`, and `recoveryState` are already mapped into device state. [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L322) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L347)

Publish blockers
- Transport trust is not launch-safe:
  - remove `setInsecure()` from shipped firmware HTTPS
  - remove insecure MQTT TLS from shipped configs
- Device and broker identity are not launch-safe:
  - separate product auth from transport auth
  - issue per-device MQTT credentials
  - enforce topic ACLs
  - stop relying on fleet-shared broker trust
- Release operations are not launch-safe:
  - promote a real stable firmware artifact instead of shipping the current branch-based QA candidate
  - clean up auth email and redirect posture
  - document release recovery and secret ownership
- Customer launch is blocked on missing firmware OTA:
  - release registry
  - immutable artifact hosting
  - integrity and authenticity verification
  - device apply flow
  - boot-confirmation rollback
  - staged rollout and pause control
- Launch validation is not complete:
  - hosted reconnect and offline healing still need real-device confidence
  - OTA pause, rollback, and failed-boot recovery still need proof before launch

Recommended implementation order
1. Lock the accepted trust rules in code and docs before expanding feature scope.
   - `device_auth_token` is product auth only.
   - MQTT credentials are transport auth only.
   - `register_factory_device(...)` stays factory-only.
   - runtime field devices must not rely on anonymous self-reregistration.
2. Implement the first hardening slice: transport trust and device identity.
   - add CA-validated HTTPS for device-to-Supabase traffic
   - add CA-validated MQTT
   - issue and persist per-device MQTT credentials
   - add broker ACLs over the existing topic model
   - keep the gateway privileged for now, but split its credentials cleanly from device credentials
3. Clean release operations and baseline launch posture.
   - fix auth email and redirect config
   - define service-role secret ownership and operator handling
   - promote the factory firmware path to a real stable artifact
   - decide the production environment split rather than relying on the current beta shortcut
   - revalidate reconnect and offline behavior on hosted infrastructure
4. Lock the device-side OTA safety model.
   - confirm OTA-capable partition layout
   - define boot confirmation
   - define automatic boot rollback to the last confirmed firmware
5. Build the OTA control plane in Supabase.
   - release registry
   - rollout states
   - artifact metadata and hashes
   - previous-stable linkage
   - per-device OTA status records
6. Implement the firmware OTA client.
   - authenticated update check
   - HTTPS download
   - integrity and authenticity verification
   - apply
   - reboot
   - boot confirm or rollback
   - status reporting
7. Add the minimum launch surfaces.
   - app version
   - app update available
   - firmware version
   - firmware update available
   - downloading / installing / failed / rolled back / recovery-needed / offline states
   - `Update device` action
8. Build operator tooling and prove rollout safety.
   - publish draft
   - internal-only rollout
   - small cohort rollout
   - pause
   - mark bad release
   - assign rollback target
   - inspect per-device failures
9. Run launch validation in order.
   - internal devices
   - small real-user cohort
   - broader staged rollout
   - prove pause, failed-boot rollback, and rollback-to-stable before customer launch

## Summary

This report consolidates the three launch-planning passes into one implementation baseline:
- [2026-03-26-launch-security-and-ota-foundation-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md)
- [2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)
- [2026-03-26-firmware-ota-architecture-and-rollout-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md)

The result is clear:
- store-managed app updates are acceptable at launch
- Expo JS OTA is optional later
- firmware OTA is required for customer launch
- OTA depends on transport trust and device identity hardening first
- the first implementation work should start with security foundation, not with OTA UI or broad product polish

## Source docs used

- [Docs/tasks/T-034-production-deployment-readiness-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-034-production-deployment-readiness-plan.md)
- [Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md)
- [Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md)
- [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)
- [Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md)

## Files changed

- [Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md)

## Verification

- Verified by consolidating the prior repo-grounded planning reports and their code or doc references.
- No product code, deployment config, or firmware behavior was changed in this task.
- No runtime, device, network, or rollout tests were executed in this task.

## Decisions / assumptions

- The accepted launch direction is customer-launch focused rather than “beta stage” focused, even though the internal coordination label remains `S4`.
- App store updates are the default launch app-update path.
- Firmware OTA is required before customer launch.
- Automatic firmware install is deferred; the launch default is automatic discovery plus user-triggered install, with operator-controlled staged rollout.

## Open questions or blockers

- Whether the production environment split must be completed before wider beta or only before customer launch.
- Which broker provider will be used at launch, and whether it cleanly supports per-device credentials and ACLs.
- Whether the first launch needs only a narrow internal admin tool for release control or a slightly richer operator console.

## Recommended next handoff

- Start the first implementation slice against the transport-trust and device-identity plan.
- Keep that slice narrow: validated HTTPS, validated MQTT, per-device broker credentials, ACLs, and removal of runtime self-reregistration assumptions.
- Do not start OTA implementation before that slice is complete.
