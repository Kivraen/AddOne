---
id: T-035
title: Transport trust and device identity hardening
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-034
owned_paths:
  - firmware/include
  - firmware/src/cloud_client.cpp
  - firmware/src/realtime_client.cpp
  - services/realtime-gateway
  - deploy/beta-vps/mosquitto
  - supabase
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Backend_Model.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/git-operations.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-034-production-deployment-readiness-plan.md
  - Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md
  - Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-implementation.md
---

## Objective
Harden the live transport and device identity model so launch no longer depends on insecure TLS, fleet-shared MQTT trust, or runtime self-reregistration assumptions.

## Why Now
`T-034` established that launch is blocked first by transport trust and device identity, not by OTA UI or more polish. This is the first implementation slice because OTA and broader release controls are unsafe until the underlying trust model is fixed.

## In Scope
- Replace insecure HTTPS device-to-Supabase traffic with CA-validated HTTPS
- Replace insecure MQTT TLS with CA-validated MQTT
- Introduce per-device MQTT credentials
- Enforce broker ACLs over the existing topic model
- Remove runtime reliance on anonymous or implicit self-reregistration behavior
- Update the scoped contract docs to reflect the hardened trust model

## Out Of Scope
- Full firmware OTA implementation
- Broad release-console or operator tooling
- General UI polish
- Broad app update surfaces beyond any minimal support needed for this hardening slice

## Required Changes
- Define and implement separate product auth vs transport auth responsibilities
- Ensure field devices do not need insecure fallback trust to function
- Ensure broker access is isolated per device instead of fleet-shared
- Ensure the gateway privilege boundary is explicit even if it remains broader than device privilege in this slice
- Document the new trust model and any migration or rollout assumptions

## Verification Required
- Firmware build proof
- Gateway/runtime/service verification for the changed trust path
- Explicit proof that insecure TLS is not the shipped path anymore
- Explicit proof of per-device MQTT credential handling and ACL enforcement
- Scoped doc updates for the transport and beta environment contracts

## Success Definition
- A shipped device no longer depends on `setInsecure()` or insecure MQTT TLS for normal launch operation
- Broker credentials and topic access are no longer effectively shared across the fleet
- The runtime trust model is explicit enough to support later OTA safely
- The next launch-readiness slice can move to release operations cleanup and OTA safety with this foundation in place
