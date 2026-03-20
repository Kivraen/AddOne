---
task_id: T-014
title: Repo typecheck noise cleanup
date: 2026-03-19
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - tsconfig.json
  - app/(app)/devices/[deviceId]/history 2.tsx
  - app/(app)/devices/[deviceId]/settings/_layout 2.tsx
  - app/(app)/devices/[deviceId]/settings/appearance 2.tsx
  - app/(app)/devices/[deviceId]/settings/index 2.tsx
  - app/(app)/devices/[deviceId]/settings/routine 2.tsx
  - Docs/agent-reports/2026-03-19-repo-typecheck-noise-cleanup.md
---

## Stage

`S3: Beta UI Completion And Social Shape`

## Status

`implemented`

## Changes made

- Added `node_modules_corrupt_backup_20260318` to `tsconfig.json` `exclude` so the preserved backup tree stays recoverable on disk but no longer participates in repo-wide TypeScript scanning.
- Removed the dead duplicate settings files:
  - `app/(app)/devices/[deviceId]/settings/_layout 2.tsx`
  - `app/(app)/devices/[deviceId]/settings/appearance 2.tsx`
  - `app/(app)/devices/[deviceId]/settings/index 2.tsx`
  - `app/(app)/devices/[deviceId]/settings/routine 2.tsx`
- Removed the adjacent stale duplicate route `app/(app)/devices/[deviceId]/history 2.tsx` because it followed the same accidental `* 2.tsx` copy pattern and had no valid reason to stay in the route tree.

## Commands run

- `sed -n '1,220p' Docs/AddOne_Main_Plan.md`
- `sed -n '1,220p' Docs/project-memory.md`
- `sed -n '1,220p' Docs/git-operations.md`
- `sed -n '1,220p' Docs/agent-coordination.md`
- `sed -n '1,240p' Docs/stages/stage-register.md`
- `sed -n '1,260p' Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `sed -n '1,260p' Docs/tasks/T-014-repo-typecheck-noise-cleanup.md`
- `sed -n '1,260p' Docs/agent-reports/2026-03-19-s3-cumulative-ui-surface-report.md`
- `git status --short`
- `sed -n '1,240p' tsconfig.json`
- `rg --files 'app/(app)/devices/[deviceId]/settings'`
- `find node_modules_corrupt_backup_20260318 -maxdepth 2 -type d | sed -n '1,80p'`
- `npm run typecheck`
- `rg --files -g '* 2.tsx' app`
- `git diff --no-index -- 'app/(app)/devices/[deviceId]/settings/appearance.tsx' 'app/(app)/devices/[deviceId]/settings/appearance 2.tsx'`
- `git diff --no-index -- 'app/(app)/devices/[deviceId]/settings/index.tsx' 'app/(app)/devices/[deviceId]/settings/index 2.tsx'`
- `git diff --no-index -- 'app/(app)/devices/[deviceId]/settings/routine.tsx' 'app/(app)/devices/[deviceId]/settings/routine 2.tsx'`
- `git diff --no-index -- 'app/(app)/devices/[deviceId]/settings/_layout.tsx' 'app/(app)/devices/[deviceId]/settings/_layout 2.tsx'`
- `git diff --no-index -- 'app/(app)/devices/[deviceId]/history.tsx' 'app/(app)/devices/[deviceId]/history 2.tsx'`
- `du -sh node_modules_corrupt_backup_20260318`
- `git diff -- tsconfig.json`
- `rg --files -g '* 2.tsx' 'app/(app)/devices/[deviceId]'`
- `rg -n 'node_modules_corrupt_backup_20260318' tsconfig.json`
- `test -d node_modules_corrupt_backup_20260318 && echo present`
- `ls 'app/(app)/devices/[deviceId]/settings'`
- `ls 'app/(app)/devices/[deviceId]' | sed -n '1,120p'`
- `npm run typecheck`

## Evidence

- Before cleanup, `npm run typecheck` was dominated by:
  - `app/(app)/devices/[deviceId]/settings/appearance 2.tsx(18,10): error TS2305 ...`
  - hundreds of errors under `node_modules_corrupt_backup_20260318/...`
- Duplicate settings file handling:
  - The `settings/* 2.tsx` files were stale alternate copies, not active shipped routes.
  - After cleanup, `rg --files -g '* 2.tsx' 'app/(app)/devices/[deviceId]'` returned no matches.
  - `ls 'app/(app)/devices/[deviceId]/settings'` now shows only `_layout.tsx`, `appearance.tsx`, `colors.tsx`, `index.tsx`, and `routine.tsx`.
- Backup tree handling:
  - `node_modules_corrupt_backup_20260318/` was preserved in place for recoverability.
  - `test -d node_modules_corrupt_backup_20260318 && echo present` returned `present`.
  - `tsconfig.json` now excludes that directory explicitly at line 20.
- Repo-wide verification:
  - Final `npm run typecheck` exited with code `0`.
  - Remaining non-noise type errors after cleanup: none.

## Open risks / blockers

- `node_modules_corrupt_backup_20260318/` still occupies disk space, but it no longer pollutes TypeScript verification.
- This pass did not address dependency alignment or UI/runtime behavior, by design.

## Recommendation

`accepted`

Repo-wide `npm run typecheck` is meaningful again for later S3 UI task verification. Keep the backup tree excluded unless there is a deliberate restore workflow that requires moving or rehydrating it.
