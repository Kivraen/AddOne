Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted `T-042` checkpoint:
`codex/s4-operator-rollout-tooling`

Stable baseline:
Base this work on `codex/s4-app-update-status-surfaces`, because `T-043` depends on the accepted OTA baseline and the accepted minimum app/status surface that are not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to operator rollout and rollback tooling.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-043-operator-rollout-and-rollback-tooling.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md`
- `Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Cloud_Contract.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Add the minimum operator tooling needed to activate immutable releases, target devices, roll back bad releases, and inspect rollout state without ad hoc manual database work.

Success metrics:
- one bounded operator workflow exists for activate/target/rollback/inspect
- immutable release and rollback rules stay intact
- the beta runbook reflects the actual operator path

Required proof:
- exact files changed
- exact commands or tool flows exercised
- proof of one real activation or rollback flow against beta
- explicit note of any remaining manual step

Non-negotiables:
- keep the slice narrow to rollout and rollback tooling
- do not widen into public admin console work
- do not reopen OTA architecture
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-operations work; the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
