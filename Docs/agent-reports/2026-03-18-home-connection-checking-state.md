---
task_id: T-005
title: Home connection checking state
date: 2026-03-18
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - components/app/home-screen.tsx
  - lib/supabase/addone-repository.ts
  - types/addone.ts
  - Docs/ui-beta-issue-log.md
---

## Summary

- Traced the current connection-state timing across app, gateway, and firmware.
- Updated the home header so it no longer jumps straight from live to `Recovery`.
- Added an intermediate amber `Checking` state before the device is treated as confirmed offline.

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/ui-beta-issue-log.md`
- `.agents/skills/building-native-ui/SKILL.md`

## Files changed

- `components/app/home-screen.tsx`
- `lib/supabase/addone-repository.ts`
- `types/addone.ts`
- `Docs/ui-beta-issue-log.md`

## Verification

- Verified:
  - `npm run typecheck`
  - code-path inspection for app freshness timing, refetch cadence, firmware heartbeat cadence, and gateway heartbeat persistence
  - home-header state logic and chip rendering by code inspection
- Not verified:
  - fresh simulator/device visual pass
  - other screens that still rely directly on raw `device.isLive`

## Decisions / assumptions

- The home header should not escalate to a recovery CTA on the first stale poll.
- A short non-actionable checking state is the right beta UX when connection freshness is ambiguous.
- This is a home-screen UX stabilization pass, not a full global connection-state model fix.

## Open questions or blockers

- The underlying timing mismatch still exists:
  - app freshness window is 45s
  - firmware heartbeat is 60s
  - app self-heal refetch is 30s
- Other screens may still flap until the central timing model is aligned.

## Recommended next handoff

- Run a quick manual UI proof pass on the home header with a healthy device and a briefly stale device.
- If the feel is right, the next deeper fix is to align the real timing model centrally instead of only smoothing the home header.

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented. The home header now shows an amber `Checking` state before `Recovery`, but the slice still needs a quick manual visual proof pass before acceptance.

## Changes made

- Added `lastSeenAt` and `lastSyncAt` to the app device model so the home UI can reason about recent connection activity.
- Added a 75-second home-only offline confirmation window and a three-step header connection model:
  - live
  - checking
  - offline
- Extended the header chip to support tinted icons so the checking state can use an amber Wi-Fi icon.
- Updated the durable beta UI issue log with the new connection-state rule.

## Commands run

- `sed -n '1,220p' .agents/skills/building-native-ui/SKILL.md`
- `rg -n "deviceSeemsOnline|deriveSyncState|last_seen_at|last_sync_at|heartbeat|refetchInterval|useDevices|Recovery|offline|isLive|lastSnapshotAt" lib hooks components app firmware services -g '!node_modules'`
- `sed -n '88,170p' lib/supabase/addone-repository.ts`
- `sed -n '1,220p' hooks/use-devices.ts`
- `sed -n '720,780p' firmware/src/firmware_app.cpp`
- `sed -n '470,560p' components/app/home-screen.tsx`
- `sed -n '1,120p' lib/device-status.ts`
- `sed -n '1,220p' components/app/home-screen.tsx`
- `sed -n '1,220p' types/addone.ts`
- `nl -ba components/app/home-screen.tsx | sed -n '20,80p'`
- `nl -ba components/app/home-screen.tsx | sed -n '470,555p'`
- `nl -ba lib/supabase/addone-repository.ts | sed -n '96,155p'`
- `nl -ba hooks/use-devices.ts | sed -n '44,115p'`
- `nl -ba firmware/src/firmware_app.cpp | sed -n '742,765p'`
- `nl -ba services/realtime-gateway/src/index.mjs | sed -n '124,146p'`
- `npm run typecheck`

## Evidence

- The app currently marks a device live only if `last_seen_at` or `last_sync_at` is newer than 45 seconds in `lib/supabase/addone-repository.ts`.
- The app does a 30-second self-heal refetch in `hooks/use-devices.ts`.
- Firmware heartbeats every 60 seconds in `firmware/src/firmware_app.cpp`.
- The realtime gateway writes presence through `device_heartbeat(...)` in `services/realtime-gateway/src/index.mjs`.
- The new home UX logic is in `components/app/home-screen.tsx`, including the 75-second local offline confirmation window and the `Checking` state before `Recovery`.

## Open risks / blockers

- The underlying global timing mismatch still exists, so other screens can still flap if they rely directly on raw `device.isLive`.
- No fresh simulator/device visual pass yet.
- Expo package audit is still pending separately.

## Recommendation

- Treat this as a strong home-screen UX improvement, but keep it in implemented-not-yet-accepted state until a quick manual proof pass is done.
- If the user wants the deeper fix next, align the central timing model by changing the freshness window, the heartbeat cadence, or the shared connection-state model.
