---
id: T-054
title: Forward-only weekly target semantics and security hardening
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Codex
depends_on:
  - T-049
owned_paths:
  - app/(app)/devices/[deviceId]/settings/routine.tsx
  - hooks/use-devices.ts
  - lib/device-settings.ts
  - lib/runtime-board-projection.ts
  - lib/supabase/addone-repository.ts
  - lib/supabase/database.types.ts
  - types/addone.ts
  - firmware/src/habit_tracker.cpp
  - firmware/src/habit_tracker.h
  - firmware/src/firmware_app.cpp
  - firmware/src/firmware_app.h
  - firmware/src/cloud_client.cpp
  - firmware/src/cloud_client.h
  - firmware/src/realtime_client.cpp
  - firmware/src/realtime_client.h
  - tests/runtime-board-projection.test.mjs
  - supabase/migrations/20260331103000_add_forward_only_weekly_target_timeline.sql
  - supabase/migrations/20260331124500_fix_history_metrics_visible_week_targets.sql
  - supabase/migrations/20260331190500_secure_board_weekly_target_changes.sql
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md
  - Docs/agent-reports/2026-03-31-forward-only-weekly-target-semantics-and-security-hardening.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-31-forward-only-weekly-target-semantics-and-security-hardening.md
---

## Objective
Make weekly minimum target changes forward-only instead of history-rewriting, and harden the new supporting backend table so the feature is correct and safe before release.

## Why Now
This started as a release-candidate follow-up on `T-049`, but it widened into a real semantics change across backend, firmware, app projection, and security posture. It should be tracked separately so the final iOS RC polish gate does not absorb history-model work implicitly.

## In Scope
- Forward-only weekly target timeline storage and retrieval
- Past-week target freezing and current-week update behavior
- Firmware snapshot and runtime support for visible week targets
- App projection and history editing against week-specific targets
- Security hardening for the new weekly-target timeline table
- Manual validation of the main edge cases called out in the handoff report

## Out Of Scope
- Broad onboarding or auth polish
- OTA, rollout tooling, or MQTT transport work
- App Store submission work
- Unrelated Home or Friends UI cleanup

## Required Changes
- Changing the weekly target must update the current week and future weeks without rewriting prior completed weeks
- Older-week history edits must score against the target active in that week
- The runtime snapshot and board projection model must stay consistent across refresh, relaunch, and reconnect paths
- The new backend table must have proper RLS and restricted grants

## Verification Required
- `npm run test:runtime`
- `npm run typecheck`
- `pio run -e addone-esp32dev-beta`
- Exact files changed
- One focused manual matrix covering:
  - `3 -> 1 -> 3` target changes
  - older-week history edits after target changes
  - offline board then reconnect
  - app relaunch before fresh snapshot
  - reset-history or new-era boundary
  - restore path after prior weekly-target changes

## Success Definition
- Weekly minimum changes are forward-only and no longer rewrite historical completed weeks
- Past and present week targets render and score correctly across app and device paths
- The security posture for the new weekly-target timeline table is hardened
- The slice is checkpointed and validated separately from `T-049`
