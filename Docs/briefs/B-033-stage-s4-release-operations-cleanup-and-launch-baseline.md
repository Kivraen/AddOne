Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from `main`:
`codex/s4-release-operations-baseline`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to making the accepted transport-hardening baseline actually operable on the hosted beta stack.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-036-release-operations-cleanup-and-launch-baseline.md`
- `Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md`
- `Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-implementation.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `Docs/AddOne_Backend_Model.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Make the hosted beta environment actually operable on top of the accepted `T-035` trust model:
- apply the new migration
- install real CA material where the hardened firmware path requires it
- render and install broker passwords from the new credential source
- prove the hosted command/reconnect path works on the hardened baseline

Success metrics:
- the hosted beta stack matches the accepted transport trust model in real operation, not only in code
- the operator steps are explicit and repeatable
- stale bootstrap assumptions are removed or clearly quarantined
- the next launch slice can move to OTA safety from a known-good baseline

Required proof:
- exact files changed
- proof that the hosted migration is applied
- proof that the broker password render/install flow ran successfully
- proof of at least one real device validation loop on the hardened hosted stack
- explicit note of any remaining operator-only prerequisites before broader rollout

Non-negotiables:
- keep the slice narrow to release operations and the hosted launch baseline
- do not widen into OTA implementation yet
- do not widen into unrelated UI or feature work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-operations work; if the hosted environment reveals trust-model or runbook gaps, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
