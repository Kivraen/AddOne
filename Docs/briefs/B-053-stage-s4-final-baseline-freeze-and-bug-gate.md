Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t056-baseline-freeze`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If an earlier accepted launch-prep slice has already been merged back into the active launch-prep line, include it. Do not work on `main`.

Mode:
This is a narrow validation and bug-gate task. Do not add launch features yet. Only validate the current product baseline and make a small fix if a concrete regression appears.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md`
- `Docs/tasks/T-050-first-device-onboarding-and-setup-polish.md`
- `Docs/tasks/T-054-forward-only-weekly-target-semantics-and-security-hardening.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-056-final-baseline-freeze-and-bug-gate.md`
- `Docs/agent-reports/2026-04-04-final-rc-review-and-ota-stability-checkpoint.md`
- `Docs/agent-reports/2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Prove that the current stable AddOne branch is the single launch-prep baseline to build on, and isolate any real product regression before later launch-prep work begins.

Success metrics:
- explicit iPhone and Android pass/fail matrix exists for:
  - auth
  - onboarding
  - Home
  - history
  - Friends
  - settings
  - OTA surface
- any real regression is either fixed narrowly or called out as a blocker
- the report ends with a clear verdict on whether launch-prep feature work should begin

Required proof:
- explicit pass/fail matrix
- exact commands run for any fix
- `npm run typecheck` if app code changes
- simulator or device proof for any claimed fix
- exact files changed

Non-negotiables:
- do not add waitlist, legal, analytics, or store-work features here
- do not reopen `T-050` or `T-054` unless this pass exposes a concrete failure in those areas
- keep any code change narrow and regression-driven
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
