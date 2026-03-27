Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted `T-043` checkpoint:
`codex/s4-release-candidate-validation`

Stable baseline:
Base this work on `codex/s4-operator-rollout-tooling`, because `T-044` depends on the accepted OTA baseline, accepted app update surface, and accepted operator tooling that are not yet merged to `main`. Do not work directly on `main`.

Mode:
This is a validation task. Keep it narrow to internal release-candidate validation and explicit publish blockers.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-044-internal-release-candidate-validation-and-publish-blockers.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md`
- `Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md`
- `Docs/AddOne_Beta_Environment.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Run one focused internal release-candidate validation pass on the real beta stack and produce the final explicit blocker list before store-submission prep starts.

Success metrics:
- one real validation matrix is executed against the intended beta release path
- passed vs failed checks are explicit
- publish blockers are explicit and finite
- final recommendation is clear: ready for store-submission prep or not yet

Required proof:
- exact files changed
- exact validation matrix used
- evidence for passed and failed checks
- explicit publish blocker list
- explicit recommendation

Non-negotiables:
- keep the slice narrow to validation and blocker identification
- do not widen into broad feature work
- do not widen into broad UI polish
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a validation-and-gating slice; the final report must reflect the actual final branch state and actual blocker list

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
