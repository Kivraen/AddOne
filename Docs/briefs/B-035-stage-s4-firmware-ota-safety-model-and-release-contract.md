Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted rollout baseline:
`codex/s4-firmware-ota-safety`

Stable baseline:
Base this work on `codex/s4-release-operations-baseline`, because `T-038` depends on the accepted `T-036` and `T-037` rollout work that is not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the firmware OTA safety model and release contract.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md`
- `Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md`
- `Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md`
- `Docs/agent-reports/2026-03-26-mqtt-tls-acceptance-and-device-reprovisioning.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Firmware_V2_Architecture.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Lock the minimum firmware OTA safety model and release contract before building the OTA control plane or firmware client.

Success metrics:
- the device-side OTA safety and rollback model is explicit and durable
- firmware-side release acceptance rules are concrete enough for implementation
- the next OTA slice can build the control plane without reopening safety assumptions

Required proof:
- exact files changed
- firmware build proof if firmware code changes land
- explicit references for the OTA safety contract
- explicit note of what the next OTA slice can now assume

Non-negotiables:
- keep the slice narrow to OTA safety and release-contract work
- do not widen into the full OTA control plane yet
- do not widen into app UI update work yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-critical work; if testing or review changes the safety model, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
