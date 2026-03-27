Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted firmware OTA client baseline:
`codex/s4-firmware-ota-validation`

Stable baseline:
Base this work on `codex/s4-firmware-ota-client`, because `T-041` depends on the accepted `T-040` firmware OTA client path that is not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation and validation task. Keep it narrow to one real OTA artifact path and one real hardware validation loop.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-041-firmware-ota-artifact-hosting-and-hardware-validation.md`
- `Docs/tasks/T-040-firmware-ota-client-and-device-flow.md`
- `Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md`
- `Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-client-and-device-flow.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Firmware_V2_Architecture.md`
- `firmware/OTA_SAFETY_CONTRACT.md`
- `firmware/README.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Publish one real immutable OTA artifact and prove the OTA flow on real hardware against the accepted backend and firmware contracts.

Success metrics:
- one immutable CA-validated HTTPS artifact exists for the OTA client to download
- one real release row exists and matches the accepted release contract
- at least one real device completes the OTA path through staged download, provisional boot, local confirmation, and backend-visible success
- any failure or rollback discovered during validation is captured durably in the final report

Required proof:
- exact files changed
- exact hosted artifact and release references
- firmware build proof for the released artifact
- real hardware proof of the OTA flow
- explicit note of what remains before app update surfaces or operator tooling

Non-negotiables:
- keep the slice narrow to OTA artifact hosting and hardware validation
- do not widen into broad app update UI yet
- do not widen into operator rollout console work yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-critical validation; if the real device path disproves any prior assumption, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
