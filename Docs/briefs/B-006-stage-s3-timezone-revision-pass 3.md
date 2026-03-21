# Stage S3 Timezone Revision Pass Brief

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Required skill(s):
- `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`
- `Docs/briefs/B-005-stage-s3-timezone-capability-and-picker.md`
- `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`
- `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Revise T-011 so the timezone implementation is acceptance-ready by restoring reset-time editing and closing the missing manual proof gap.`

What already stands:
- The regional-vs-fixed-offset timezone model is correct.
- DST should stay part of the timezone definition, not a separate toggle.
- The picker direction is correct.
- The task is not accepted yet only because of the gaps below.

Exact acceptance gaps to fix:
- Restore or explicitly relocate user-configurable reset-time editing in the settings flow.
- Complete live manual UI proof for:
  - onboarding with a supported U.S. timezone
  - settings switching to `Europe/Warsaw`
  - recovery switching to `Europe/Kyiv`
  - advanced fixed offset selection using one positive and one negative example
- Keep the durable report complete and current.

Success metrics:
- Reset-time editing is clearly present again in the shipped settings flow and still matches the canonical spec.
- Manual proof is completed for onboarding, settings, recovery, and advanced fixed offsets.
- The timezone UX remains consistent with the accepted model:
  - device timezone is canonical
  - viewer/display timezone stays separate
  - fixed UTC offsets are advanced no-DST mode
- No regression is introduced to the already-implemented timezone capability work.

Required proof:
- `npm run typecheck`
- `npm run test:runtime`
- Exact file references showing where reset-time editing now lives
- Manual proof notes for:
  - supported U.S. regional timezone
  - `Europe/Warsaw`
  - `Europe/Kyiv`
  - one positive fixed offset
  - one negative fixed offset
- Updated durable report in `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`

Non-negotiables:
- Do not re-open the DST-toggle idea.
- Do not merge viewer/display timezone into device timezone.
- Do not remove the advanced fixed-offset mode if it is already working cleanly, unless you find a concrete blocker and document it.
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, `Docs/AddOne_Main_Plan.md`, or `Docs/Active_Work.md` directly.

Scope:
- In scope: reset-time regression fix or relocation, manual proof completion, and any narrowly related repair required to make `T-011` accept-ready.
- Out of scope: broad timezone redesign, worldwide regional timezone expansion, unrelated UI cleanup, or profile/friends/history work.

Documentation requirement:
- Treat `Docs/stages/stage-03-trusted-beta-surface-alignment.md` as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`.
- Update `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md` instead of creating a second report file for this same task.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
