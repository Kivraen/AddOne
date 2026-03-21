# B-008: Stage S3 Repo Typecheck Noise Cleanup

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-014-repo-typecheck-noise-cleanup.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-014-repo-typecheck-noise-cleanup.md)
- [2026-03-19-s3-cumulative-ui-surface-report.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-s3-cumulative-ui-surface-report.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Restore a meaningful repo-wide typecheck signal by removing or excluding the known duplicate-file and backup-tree noise that is currently polluting UI verification.`

Success metrics:
- `npm run typecheck` is no longer dominated by `* 2.tsx` duplicates and the preserved backup tree.
- The cleanup stays narrow and does not broaden into unrelated UI or dependency work.
- Any remaining real type errors are recorded clearly after the noise sources are removed.

Required proof:
- `npm run typecheck`
- exact files changed
- exact handling of:
  - duplicate settings files
  - `node_modules_corrupt_backup_20260318/`
- clear note of any remaining non-noise type errors

Non-negotiables:
- Do not turn this into a UI redesign pass.
- Do not mix this with Expo package audit/alignment.
- Do not destroy recoverability casually; if the backup tree is moved, excluded, or removed, make that handling explicit.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.

Scope:
- In scope: `tsconfig.json`, duplicate settings files, backup-tree exclusion/handling, and repo-wide typecheck verification.
- Out of scope: onboarding polish, friends planning, runtime behavior changes, dependency upgrades, and firmware work.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only scoped docs if the cleanup changes durable repo-verification expectations.
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
