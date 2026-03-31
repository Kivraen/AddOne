Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Continue on:
`codex/s4-weekly-target-semantics-support`

Stable baseline:
Base this work on the current checkpoint branch `codex/s4-weekly-target-semantics-support`. Do not start a new branch and do not work on `main`.

Mode:
This is a narrow support-slice validation task. Keep it focused on forward-only weekly target semantics and the associated security hardening.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-054-forward-only-weekly-target-semantics-and-security-hardening.md`
- `Docs/agent-reports/2026-03-31-forward-only-weekly-target-semantics-and-security-hardening.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Finish validating and, if needed, tightening the forward-only weekly target implementation so it can be accepted as a separate support slice instead of remaining mixed into `T-049`.

Current known state:
- the implementation is already present on this branch
- the work widened beyond `T-049` because it changes weekly minimum or history semantics
- runtime tests, typecheck, firmware compile, and backend hardening were already exercised
- the remaining gap is a focused manual regression matrix across weekly-target edge cases

Success metrics:
- the manual matrix passes or any remaining failure is isolated precisely
- the slice is clearly ready for coordinator acceptance or one final narrow retry
- `T-049` remains separate from this semantics/support work

Required proof:
- `npm run test:runtime`
- `npm run typecheck`
- `pio run -e addone-esp32dev-beta`
- exact files changed
- explicit results for:
  - `3 -> 1 -> 3` target changes
  - older-week history edits after target changes
  - offline board then reconnect
  - app relaunch before fresh snapshot
  - reset-history or new-era behavior
  - restore path after prior weekly-target changes
- explicit note of any remaining risk before acceptance

Non-negotiables:
- keep scope narrow to weekly-target semantics and related hardening
- do not widen back into general `T-049` polish
- do not widen into onboarding, OTA, or release-ops work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a separate support slice, not a stage transition
- final report must reflect the actual branch state and actual manual matrix result

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
