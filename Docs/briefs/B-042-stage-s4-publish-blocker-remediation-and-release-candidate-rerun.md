Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted `T-044` checkpoint:
`codex/s4-release-candidate-remediation`

Stable baseline:
Base this work on `codex/s4-release-candidate-validation`, because `T-045` depends on the accepted blocker audit that is not yet merged to `main`. Do not work directly on `main`.

Mode:
This is a remediation-and-rerun task. Keep it narrow to the explicit blockers identified in `T-044`.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-045-publish-blocker-remediation-and-release-candidate-rerun.md`
- `Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md`
- `Docs/AddOne_Beta_Environment.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Clear the explicit publish blockers from `T-044`, then rerun the same release-candidate validation matrix on the corrected baseline.

Success metrics:
- `AO_A4F00F767008` is either OTA-capable on the intended path or explicitly removed from the RC cohort
- fresh installable iOS artifacts exist for the accepted March 27 baseline
- Android is either explicitly deferred as a follow-up track or intentionally reopened as part of the same launch gate
- the validation matrix is rerun against the corrected baseline
- final recommendation is clearer than `T-044`, ideally ready for submission prep

Required proof:
- exact files changed
- exact remediation actions on `AO_A4F00F767008`
- exact build artifacts produced
- exact rerun matrix and results
- explicit remaining blocker list, if any

Non-negotiables:
- keep the slice narrow to the explicit blockers identified in `T-044`
- do not widen into broad polish or new feature work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a blocker-remediation gate; the final report must reflect the actual corrected baseline and actual rerun results

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
