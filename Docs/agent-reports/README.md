# Agent Reports

Use this folder for one Markdown report per finished agent task.

File naming:
- `YYYY-MM-DD-<area>-<short-slug>.md`

Required frontmatter:
- `task_id`
- `title`
- `date`
- `agent`
- `result_state`
- `verification_state`
- `changed_paths`

Allowed `result_state` values:
- `Implemented`
- `Blocked`
- `Partial`
- `No Change`

Allowed `verification_state` values:
- `Not Verified`
- `Partially Verified`
- `Verified`

Required sections:
- `Summary`
- `Source docs used`
- `Files changed`
- `Verification`
- `Decisions / assumptions`
- `Open questions or blockers`
- `Recommended next handoff`

Coordinator gate header for staged work:
- `Stage`
- `Status`
- `Changes made`
- `Commands run`
- `Evidence`
- `Open risks / blockers`
- `Recommendation`

Rules:
- keep reports short
- name the exact files touched
- state what was verified and what was not verified
- call out any doc that should be updated after the task
- workers write reports, but the coordinator updates master coordination docs
- earlier reports may not include the staged coordinator header; new staged work should

Template:

```md
---
task_id: T-000
title: Example task
date: 2026-03-16
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - path/one
  - path/two
---

## Summary

## Source docs used

## Files changed

## Verification

## Decisions / assumptions

## Open questions or blockers

## Recommended next handoff
```
