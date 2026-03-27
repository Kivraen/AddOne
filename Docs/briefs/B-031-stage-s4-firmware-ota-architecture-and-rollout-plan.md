# B-031: Stage S4 Firmware OTA Architecture And Rollout Plan

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s4-production-readiness-plan`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning, audit, and architecture task. Do not implement code changes yet. The goal is to define the launch-grade firmware OTA model for AddOne after the transport-trust and device-identity foundation is locked.

Launch-program context:
- Internally this still belongs to `S4: Beta Hardening And Durable Release Memory`.
- In plain language, treat this as the dedicated firmware OTA planning slice for customer launch preparation.
- This brief assumes the transport-trust and device-identity plan is the prerequisite foundation, not an optional nice-to-have.

Read first:
- [Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md)
- [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)
- [Docs/tasks/T-029-app-and-firmware-update-strategy.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-029-app-and-firmware-update-strategy.md)
- [Docs/tasks/T-034-production-deployment-readiness-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-034-production-deployment-readiness-plan.md)
- [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [Docs/AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini)
- [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json)
- [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md)
- [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts)
- [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
- [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json)

Goal:
Produce the concrete launch-grade OTA plan for AddOne firmware: how updates are published, discovered, authorized, downloaded, installed, rolled out, rolled back, surfaced to users, and operated safely by a small team.

What the coordinator needs from this pass:
- define how firmware OTA should work end to end for real customers
- separate the app update plan from the firmware OTA plan
- decide what should be automatic, what should be user-controlled, and what should be operator-controlled
- define the minimum launch version/status UI required in the app
- define the minimum release and rollback tooling required before customer launch

Required planning scope:
- firmware release artifact flow
- release manifest or registry model
- artifact integrity and authenticity model
- firmware download and apply flow on device
- who can trigger updates and when
- automatic rollout versus user-controlled update behavior
- staged rollout, pause, abort, and rollback controls
- failure telemetry and recovery behavior
- app surfaces for current version, available version, updating, failed, and recovery-needed states
- relationship between app releases and firmware releases
- minimum operator workflow for publishing a firmware release

Success metrics:
- the OTA plan is explicit enough that another engineer can implement it without relying on chat memory
- the plan clearly separates:
  - app store updates
  - optional app JS OTA
  - firmware OTA
- launch requirements are separated from later improvements
- rollout, rollback, and recovery are treated as first-class requirements
- the next implementation slices are narrow and ordered correctly

Required proof:
- exact references to the current non-OTA firmware release path
- exact references to the current app version and firmware version surfaces already present in the repo
- explicit launch-grade target model for:
  - artifact publication
  - manifest or registry shape
  - device update check flow
  - device apply flow
  - staged rollout and rollback
  - user-facing status surfaces
- concrete implementation order with dependencies on the transport-trust plan

Non-negotiables:
- Do not implement code changes.
- Do not widen into unrelated security review beyond what directly affects OTA.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Stay grounded in the real repo and current release flow, not generic IoT OTA theory.
- Distinguish clearly between:
  - current repo facts
  - launch requirement
  - optional future improvement

Key framing rules:
- Treat firmware OTA as required for customer launch.
- Treat app store updates as the default app update path at launch.
- Only recommend app-side JS OTA if it materially improves operations without adding major launch risk.
- Prefer a simple, operable release system over a highly sophisticated one that a tiny team cannot run safely.
- Do not recommend “upload once and instantly update all devices” as the primary model. Require staged rollout and pause control.

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine with the coordinator.
- If there are two viable OTA models, recommend one primary path and explain why it is the better launch choice.

Report path:
`Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md`

Required report format:
1. `Stage`
2. `Status`
3. `Current update posture`
4. `Target app update model`
5. `Target firmware OTA model`
6. `Minimum launch UI and status surfaces`
7. `Required release and rollback tooling`
8. `Implementation order`
9. `Open risks / assumptions`
