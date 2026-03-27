---
id: T-037
title: MQTT TLS acceptance and device reprovisioning
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-036
owned_paths:
  - firmware/include
  - firmware/src/realtime_client.cpp
  - firmware/src/cloud_client.cpp
  - deploy/beta-vps
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - firmware/README.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-036-release-operations-cleanup-and-launch-baseline.md
  - Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-mqtt-tls-acceptance-and-device-reprovisioning.md
---

## Objective
Resolve the remaining hosted MQTT blocker by getting a hardened ESP32 device to complete broker TLS handshake and reconnect cleanly on its issued per-device MQTT username, then move the second beta device off the legacy fleet credential so the broker is running entirely on the new credential model.

## Why Now
`T-036` proved that the hosted migration, password rollout, and hardened HTTPS command loop are real, but the hosted baseline is still blocked by MQTT TLS failure on the hardened device and by the second board still using the old fleet credential. OTA and broader rollout should not proceed on a mixed or partially broken MQTT lane.

## In Scope
- Isolate and fix the ESP32 broker TLS acceptance failure behind `MQTT connect failed, state=-2`
- Confirm the broker-side `ssl/tls alert bad certificate` cause and eliminate it
- Reflash or reprovision `AO_A4F00F767008` so it also uses per-device MQTT credentials
- Update scoped operator docs if the fix changes trust material, hostname rules, or certificate expectations

## Out Of Scope
- OTA implementation
- Broader release tooling
- App UI work

## Required Changes
- A hardened device must connect to the hosted broker over TLS on its issued per-device username without broker-side TLS alerts
- Both current beta boards must be off the legacy fleet credential path
- The docs must explain the actual trust material and broker hostname expectation that the firmware path needs

## Verification Required
- Serial proof of successful MQTT reconnect on the hardened device
- Broker log proof that the same device is accepted without TLS alerts
- Proof that `AO_A4F00F767008` no longer relies on the legacy fleet credential
- Scoped doc updates if certificate or hostname handling changed

## Success Definition
- The hosted MQTT lane is working on the hardened transport model
- The beta broker is no longer in a mixed legacy/per-device credential state
- `T-036` can then be accepted or cleanly refreshed without carrying a transport blocker into OTA work
