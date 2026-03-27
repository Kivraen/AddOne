Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted OTA safety baseline:
`codex/s4-firmware-ota-control-plane`

Stable baseline:
Base this work on `codex/s4-firmware-ota-safety`, because `T-039` depends on the accepted `T-038` OTA safety contract that is not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the backend OTA control plane and release registry.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md`
- `Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Firmware_V2_Architecture.md`
- `Docs/AddOne_Beta_Environment.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Implement the backend OTA control plane and release registry that the firmware client will rely on.

Success metrics:
- release eligibility lookup exists and respects the `T-038` safety contract
- OTA progress reporting exists
- the update-trigger path exists
- the next firmware OTA client slice can build directly against this contract

Required proof:
- exact files changed
- exact schema/RPC/doc references for the OTA control plane
- proof that the backend pieces exist and are internally consistent
- explicit note of what the next firmware OTA client slice can now assume

Non-negotiables:
- keep the slice narrow to the backend control plane and release registry
- do not widen into the full firmware OTA client yet
- do not widen into app UI update work yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-critical work; if implementation changes the expected contract, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
