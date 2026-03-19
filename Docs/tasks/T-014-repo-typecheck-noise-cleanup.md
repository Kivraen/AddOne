---
id: T-014
title: Repo typecheck noise cleanup
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills: []
subsystem: repo
priority: medium
owner: Unassigned
depends_on:
  - T-005
owned_paths:
  - tsconfig.json
  - app/(app)/devices/[deviceId]/settings
  - node_modules_corrupt_backup_20260318
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/agent-reports/2026-03-19-s3-cumulative-ui-surface-report.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-repo-typecheck-noise-cleanup.md
---

## Objective
Remove the known repo-wide typecheck noise that is currently blocking clean verification for UI-stage work, without broadening into unrelated dependency or runtime changes.

## Why Now
The cumulative S3 UI report is accepted as a checkpoint, but repo-wide `npm run typecheck` is still polluted by non-product noise:
- duplicate `* 2.tsx` files under device settings
- the preserved `node_modules_corrupt_backup_20260318/` tree

That means later UI tasks inherit a fake proof blocker even when their touched files are clean.

## In Scope
- Clean up or exclude the duplicate `* 2.tsx` settings files if they are not real shipped surfaces.
- Remove, relocate, or safely exclude the preserved `node_modules_corrupt_backup_20260318/` backup tree from TypeScript scanning.
- Update `tsconfig.json` or related repo config only as needed to restore meaningful repo-wide typecheck behavior.
- Re-run repo-wide `npm run typecheck` and report the remaining failures, if any.

## Out of Scope
- UI redesign or product-surface changes
- Expo runtime/package audit and alignment
- Broad dependency updates
- Any cleanup that would discard recoverability without a clear backup path

## Required Changes
- Turn the current known typecheck noise into either:
  - removed dead files
  - safely excluded backup material
  - or explicitly bounded remaining errors
- Keep the cleanup narrow and reversible.
- Record any newly discovered real typecheck failures separately from the current noise sources.

## Verification Required
- `npm run typecheck`
- Exact before/after note for:
  - duplicate settings files
  - backup tree handling
- Scoped git diff review

## Success Definition
- Repo-wide `npm run typecheck` is no longer dominated by the duplicate settings files and the preserved backup tree.
- Future UI task acceptance can rely on a meaningful typecheck signal again.
- If any real type errors remain after cleanup, they are explicit and not hidden inside backup noise.

## Open Risks
- The backup tree exists for recoverability, so the cleanup should preserve that intent even if the tree is excluded or moved.
- There may still be additional legitimate type errors once the current noise is removed.
