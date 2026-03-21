# B-006 Stage S3 Timezone Revision Pass

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Required skill:
- `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`
- `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`
- `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Revise `T-011` so the timezone implementation is acceptance-ready by restoring reset-time editing and closing the missing manual proof gap.

Success metrics:
- reset-time editing is restored or explicitly relocated in the shipped settings flow
- live manual proof exists for onboarding, settings, recovery, and advanced fixed offsets
- the accepted regional-vs-fixed-offset model remains intact

Required proof:
- `npm run typecheck`
- `npm run test:runtime`
- exact file references showing where reset-time editing now lives
- manual proof notes for supported U.S. timezone, `Europe/Warsaw`, `Europe/Kyiv`, one positive fixed offset, and one negative fixed offset
- updated durable report at `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`

Non-negotiables:
- do not re-open the DST-toggle idea
- do not merge viewer/display timezone into device timezone
- do not remove advanced fixed offset mode without a documented blocker
- do not rewrite coordinator-owned docs
