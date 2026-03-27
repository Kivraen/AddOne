# B-030: Stage S4 Transport Trust And Device Identity Plan

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s4-production-readiness-plan`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning, audit, and architecture task. Do not implement code changes yet. The goal is to define the first hardening slice that must be built before wider beta and certainly before customer launch.

Launch-program context:
- Internally this still belongs to `S4: Beta Hardening And Durable Release Memory`.
- In plain language, treat this as the first concrete launch-security planning slice after the foundation audit.
- Focus on the top blocker cluster:
  - firmware transport trust
  - broker trust and identity
  - device identity and credential scope

Read first:
- [Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md)
- [Docs/tasks/T-028-beta-security-and-production-readiness-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-028-beta-security-and-production-readiness-audit.md)
- [Docs/tasks/T-029-app-and-firmware-update-strategy.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-029-app-and-firmware-update-strategy.md)
- [Docs/tasks/T-023-factory-station-security-hardening-and-trust-boundaries.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-023-factory-station-security-hardening-and-trust-boundaries.md)
- [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
- [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [Docs/AddOne_Beta_Hosting_Recommendation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Hosting_Recommendation.md)
- [services/realtime-gateway/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/README.md)
- [services/realtime-gateway/src/config.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/config.mjs)
- [services/realtime-gateway/src/index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/index.mjs)
- [services/realtime-gateway/src/topics.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/topics.mjs)
- [deploy/beta-vps/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/README.md)
- [deploy/beta-vps/mosquitto/mosquitto.conf](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/mosquitto/mosquitto.conf)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [firmware/include/cloud_config.beta.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.example.h)
- [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp)
- [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp)
- [supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql)

Goal:
Produce a concrete transport-trust and device-identity plan for AddOne that closes the highest-severity security gaps and gives implementation slices for the first launch hardening work.

What the coordinator needs from this pass:
- explain exactly how firmware currently trusts Supabase HTTPS and MQTT
- explain exactly how device identity currently works across firmware, Supabase, broker, and gateway
- decide what the launch-grade trust model should be
- recommend the smallest safe implementation sequence to get from current beta posture to launch-grade posture
- call out where OTA design depends on these trust decisions

Required planning scope:
- Supabase HTTPS trust from firmware
- MQTT TLS trust from firmware
- certificate validation or pinning options for ESP32
- broker credential model
- topic ACL and namespace isolation model
- gateway trust assumptions and wildcard subscription implications
- device auth token lifecycle and where it should and should not be used
- secrets and operator provisioning implications for factory and fielded devices
- how these decisions constrain the future firmware OTA design

Success metrics:
- current transport trust and device identity behavior are described with exact code and doc references
- the critical and high-risk gaps are translated into an explicit target trust model
- the plan distinguishes launch requirements from optional later hardening
- the next implementation slices are concrete, narrow, and ordered correctly
- OTA dependencies are called out explicitly so the OTA program is built on the right trust model

Required proof:
- exact references to current firmware HTTPS and MQTT trust behavior
- exact references to current broker and gateway behavior
- explicit target model for:
  - firmware certificate validation
  - broker credential scope
  - topic ACL isolation
  - gateway privilege boundary
  - device identity lifecycle
- concrete implementation order with blocker rationale

Non-negotiables:
- Do not implement code changes.
- Do not widen into general OTA design or UI work beyond what depends directly on trust and identity.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Stay grounded in the real repo and current configuration, not generic IoT advice.
- Distinguish clearly between:
  - current repo facts
  - recommended target design
  - optional future hardening

Key framing rules:
- This is not “secure everything.” It is the first launch blocker slice.
- Prefer simple, enforceable models over complex theoretical ones.
- If two approaches are plausible, recommend one primary path and explain why.
- Keep in mind that the user is not a traditional engineering org; the solution should be launch-grade but operable by a small team.

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine with the coordinator.
- If the plan leaves a critical trust decision ambiguous, call that out explicitly instead of hiding it behind generic wording.

Report path:
`Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md`

Required report format:
1. `Stage`
2. `Status`
3. `Current transport trust model`
4. `Current device identity model`
5. `Target launch trust model`
6. `Required hardening changes`
7. `Implementation order`
8. `OTA dependencies`
9. `Open risks / assumptions`
