---
task_id: T-014
title: Repo typecheck noise cleanup
date: 2026-03-19
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - tsconfig.json
  - app/(app)/devices/
---

# Summary

The repo-wide typecheck signal was restored by removing stale duplicate route files and excluding the backup dependency tree from TypeScript input.

# Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/Active_Work.md`

# Files changed

- `tsconfig.json`
- duplicate `* 2.tsx` route files

# Verification

- repo-wide `npm run typecheck` exited cleanly after cleanup

# Decisions / assumptions

- local backup trees should stay out of the repo root whenever practical

# Open questions or blockers

- the backup tree can still consume disk space if it remains on disk

# Recommended next handoff

- keep relying on repo-wide typecheck for later `S3` verification
