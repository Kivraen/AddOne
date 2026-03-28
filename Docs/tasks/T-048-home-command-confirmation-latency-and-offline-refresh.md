---
id: T-048
title: Home command confirmation latency and offline refresh truth
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-047
owned_paths:
  - components/app/home-screen.tsx
  - components/ui/primary-action-button.tsx
  - hooks/use-devices.ts
  - lib/device-connection.ts
  - lib/supabase/addone-repository.ts
  - providers/cloud-realtime-provider.tsx
  - store/app-ui-store.ts
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/agent-reports/2026-03-27-friends-controls-and-release-candidate-ui-iteration.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-home-command-confirmation-latency-and-offline-refresh.md
---

## Objective
Reduce the lag and inconsistency between tapping the primary Home action and seeing truthful confirmation in the app, while tightening the manual refresh path so offline boards settle to recovery state faster.

## Why Now
The user observed that the board reflects the change quickly, but the app’s confirmation lags behind and can feel ambiguous. This is release-candidate quality work and was explicitly prioritized while the iOS artifact gate in `T-045` is still externally blocked.

## In Scope
- Home primary-action confirmation timing and state transitions
- Owner-device truth mirroring for reload and manual refresh
- Owner realtime invalidation for the relevant device truth tables
- The Home-only offline refresh/recovery path
- One targeted unplug-and-refresh validation pass

## Out Of Scope
- Broader offline-sync and reconnect reliability work across the entire app
- Weekly minimum or history semantics
- OTA or release-artifact work
- Unrelated Home redesign

## Required Changes
- The Home button must stop waiting only on mirrored runtime state before it can look confirmed
- Reload and refresh must not regress to stale today-state truth after the board has already applied the change
- Manual refresh must perform a real explicit probe and move to offline or recovery faster when that probe fails

## Verification Required
- `npm run typecheck`
- Exact files changed
- Explicit before or after timing trace for Home confirmation
- Manual proof for:
  - toggle confirmation
  - kill or relaunch truth after a toggle
  - unplug plus pull-to-refresh offline transition

## Success Definition
- The Home confirmation path is materially tighter and more truthful than before
- The remaining uncertainty is reduced to zero or one explicit proof gap
- The branch can either be accepted or cleanly resumed without rediscovering the latency model from chat
