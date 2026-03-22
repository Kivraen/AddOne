---
task_id: T-008-followup
title: Recovery stabilization and reset-history start-new-habit implementation
date: 2026-03-22
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/AddOne_UI_Direction.md
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - app/(app)/devices/[deviceId]/settings/reset-history.tsx
  - app/(app)/onboarding/index.tsx
  - components/app/home-screen.tsx
  - components/setup/setup-flow.tsx
  - components/ui/wifi-network-picker.tsx
  - firmware/src/ap_server.cpp
  - firmware/src/ap_server.h
  - firmware/src/board_renderer.cpp
  - firmware/src/board_renderer.h
  - firmware/src/cloud_client.cpp
  - firmware/src/cloud_client.h
  - firmware/src/firmware_app.cpp
  - firmware/src/firmware_app.h
  - firmware/src/habit_tracker.cpp
  - firmware/src/habit_tracker.h
  - firmware/src/provisioning_store.cpp
  - firmware/src/realtime_client.cpp
  - hooks/use-ap-provisioning.ts
  - hooks/use-device-settings-draft.ts
  - hooks/use-devices.ts
  - hooks/use-onboarding.ts
  - hooks/use-setup-flow-controller.ts
  - lib/ap-provisioning.ts
  - lib/board.ts
  - lib/device-ap-client.ts
  - lib/device-recovery.ts
  - lib/device-routes.ts
  - lib/device-settings.ts
  - lib/mock-data.ts
  - lib/onboarding-restore.ts
  - lib/setup-flow.ts
  - lib/supabase/addone-repository.ts
  - providers/app-providers.tsx
  - providers/cloud-realtime-provider.tsx
  - store/app-ui-store.ts
  - types/addone.ts
  - supabase/migrations/20260321183000_history_era_recovery_model.sql
  - supabase/migrations/20260322130000_start_new_habit_reset_metadata.sql
---

Stage
S3: Add-device, recovery, and reset-model stabilization

Status
Implemented and live-validated. Mechanical recovery, wrong-password retry, reset-history-as-new-habit, backend history-era preservation, and device LED feedback were all brought to a stable state on real hardware. `Factory reset and remove` plus fresh post-removal add-device validation were intentionally deferred for the next agent.

Changes made
- Reworked onboarding and recovery into one shared setup-flow/controller model with deterministic stages instead of scattered booleans and timer races.
- Added a shared setup surface and controller support stack so onboarding and recovery now use the same stage layout, status handling, and retry behavior.
- Simplified recovery into the same three user-facing steps the user wanted:
  - join AddOne Wi-Fi
  - enter home Wi-Fi credentials
  - connecting/restoring
- Stabilized wrong-password handling:
  - bad password now falls back cleanly to step 2
  - retry path no longer duplicates submit requests
  - step 3 no longer falsely bounces back to step 2 during a successful retry
  - AP rejoin is rechecked on retry so dead submits do not hang silently
- Hardened AP/client handling:
  - malformed AP responses no longer redbox the app
  - transient network/timeout errors during handoff now degrade gracefully
  - repeated React Query cancellation redboxes were removed
  - initial scan behavior was iterated multiple times and ended in the simpler live-scan-first flow
- Moved AP provisioning draft state into the setup flow itself instead of relying on persisted global UI state, which removed stale credential carryover and simplified retry behavior.
- Added query-focus and recovery-needed support plumbing in app state and providers so reconnect and recovery transitions behave more deterministically after the device drops or is physically reset.
- Reworked recovery/onboarding UI shell:
  - black background, no outer card frame
  - centered step badge
  - calmer, fixed progress rows
  - no duplicate success cards during stage 3
  - inline retry feedback on step 2 after wrong credentials
- Improved Home refresh/offline detection after a physical reset so the board can move into recovery-needed more decisively on pull-to-refresh.
- Reworked device-side setup/recovery LED feedback:
  - AP/setup mode = pulsing blue center LED
  - progress petals directly adjacent to center show credentials received, Wi-Fi connected, cloud connected, and restore applied
  - boot-hold reset feedback:
    - 5s = cyan cross for Wi-Fi recovery
    - 10s = red cross for full factory reset
- Removed the empty-board placeholder marker on device. A fresh board now renders truly blank.
- Implemented `Reset history` as `Start new habit`:
  - new full-screen route collects `Habit name`, `Daily minimum`, and `Weekly target`
  - reset increments active history era instead of deleting prior data
  - board and metrics reset while ownership/Wi-Fi/settings remain intact
  - current habit metadata now lives in backend current-era metadata instead of local-only state
- Added backend support for per-era habit metadata and extended the reset RPC to accept new habit metadata.
- Updated the AddOne UI direction doc to preserve the new onboarding instruction and hierarchy rules that were locked during this pass.
- Pushed the new migration to the remote Supabase project and flashed matching firmware to the device.

Commands run
- `npx tsc --noEmit --pretty false --types react --types react-native`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload`
- `npx supabase db push`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`
- `git status --short --branch`
- `git diff --name-only`
- multiple `rg`, `sed`, and `lsof` inspection commands during debugging

Evidence
- Live serial monitor repeatedly matched the intended recovery behavior:
  - wrong-password attempts timed out and returned to portal-ready
  - corrected credentials connected to `VR`
  - claim redeemed successfully
  - restore command applied successfully
  - runtime snapshots uploaded after restore
- Latest reset-history validation on the monitor:
  - `reset_history` command was queued and acked as `applied`
  - fresh runtime snapshot uploaded at revision `831`
  - subsequent `set_day_state` command also applied and snapshot advanced to `832`
- Remote schema migration `20260322130000_start_new_habit_reset_metadata.sql` was successfully pushed.
- Firmware build and upload both completed successfully after the new reset-history and blank-board changes.
- User confirmed the following live outcomes on device and phone:
  - recovery flow finally completed exactly as intended
  - wrong-password retry behavior was correct on the final pass
  - reset-history flow worked correctly from the phone side
  - device/app blank-board state after reset-history matched the expected result

Open risks / blockers
- `Factory reset and remove` was not exercised in this pass. The next agent must verify:
  - device removal from account after destructive reset ack
  - fresh `+` add flow behaves like truly new hardware afterward
- Fresh add-device validation after a post-removal reset was not run in this pass.
- The repo has a broad dirty working tree with accepted implementation work that is not yet checkpointed in git. A coordinator should checkpoint before handing off more risky work.
- There are untracked/new paths in the tree (`components/setup/`, new migration files, new reset-history route, report assets folders). Coordinator should review and checkpoint them deliberately.
- No archive/switch UI exists yet for prior habit eras. The data model now preserves prior eras, but the archive surface is future work.

Recommendation
Accept this slice as implemented and live-validated for:
- mechanical recovery
- onboarding/recovery UX stabilization
- wrong-password retry handling
- device setup/reset LED feedback
- reset-history-as-start-new-habit

Do not launch more broad cleanup in the same dirty tree. The next coordinator step should be:
1. checkpoint/commit the current accepted state
2. open a new scoped handoff for `Factory reset and remove`
3. verify that a post-removal add flow behaves like first-time hardware

## Summary

This slice converted recovery from a brittle, race-heavy flow into a stable hardware-backed path and changed `Reset history` from a destructive clear into `Start new habit` on top of the existing history-era model. Prior habit data is preserved in the backend. Active habit metadata now has backend support per era. App, backend, and firmware were all updated together and validated on a real board.

## Source docs used

- `Docs/AddOne_UI_Direction.md`
- `Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md`
- `Docs/briefs/B-013-stage-s3-onboarding-and-recovery-polish.md`
- User-approved reset-history/start-new-habit plan from this thread

## Files changed

Core app flow:
- `Docs/AddOne_UI_Direction.md`
- `app/(app)/devices/[deviceId]/recovery.tsx`
- `app/(app)/onboarding/index.tsx`
- `components/setup/setup-flow.tsx`
- `components/ui/wifi-network-picker.tsx`
- `hooks/use-ap-provisioning.ts`
- `hooks/use-setup-flow-controller.ts`
- `lib/ap-provisioning.ts`
- `lib/device-ap-client.ts`
- `lib/device-recovery.ts`
- `lib/setup-flow.ts`
- `providers/app-providers.tsx`
- `providers/cloud-realtime-provider.tsx`
- `hooks/use-onboarding.ts`
- `store/app-ui-store.ts`

Reset-history / active habit metadata:
- `app/(app)/devices/[deviceId]/settings/index.tsx`
- `app/(app)/devices/[deviceId]/settings/reset-history.tsx`
- `hooks/use-device-settings-draft.ts`
- `hooks/use-devices.ts`
- `lib/device-routes.ts`
- `lib/device-settings.ts`
- `lib/onboarding-restore.ts`
- `lib/supabase/addone-repository.ts`
- `types/addone.ts`
- `lib/mock-data.ts`
- `components/app/home-screen.tsx`
- `lib/board.ts`

Firmware:
- `firmware/src/ap_server.cpp`
- `firmware/src/ap_server.h`
- `firmware/src/board_renderer.cpp`
- `firmware/src/board_renderer.h`
- `firmware/src/cloud_client.cpp`
- `firmware/src/cloud_client.h`
- `firmware/src/firmware_app.cpp`
- `firmware/src/firmware_app.h`
- `firmware/src/habit_tracker.cpp`
- `firmware/src/habit_tracker.h`
- `firmware/src/provisioning_store.cpp`
- `firmware/src/realtime_client.cpp`

Backend:
- `supabase/migrations/20260321183000_history_era_recovery_model.sql`
- `supabase/migrations/20260322130000_start_new_habit_reset_metadata.sql`

## Verification

Verified:
- TypeScript check passed.
- Firmware build passed.
- Firmware upload passed.
- Remote Supabase migration push passed.
- Live hardware recovery pass with wrong-password retry passed.
- Live reset-history pass passed.
- Serial monitor confirmed command delivery and device acknowledgements through recovery and reset-history.

Not verified in this pass:
- `Factory reset and remove`
- fresh `+` add flow after destructive removal
- archive/switching UI for older eras

## Decisions / assumptions

- `Reset history` now means `start a new habit`, not `keep the same habit metadata and only clear marks`.
- Old habit data should be preserved for future archive/switching features.
- Current-era metadata is now backend-backed and should replace the old local-only minimum-goal authority.
- Three user-facing recovery steps remain the right UX model. The complexity stays under the hood.
- Empty board after reset should be visually blank, not decorated with a placeholder marker or inherited failed-week states.

## Open questions or blockers

- Should `Reset history` eventually surface an archive browser or habit-switcher, or remain a one-way `start new habit` action until a later archive feature is built?
- Historical `dailyMinimum` may be missing for older pre-migration eras if it only ever existed in local app storage. That is acceptable for now, but coordinator should note it as legacy data incompleteness.
- The repo needs a durable git checkpoint before the next risky slice.

## Recommended next handoff

Handoff the next agent a narrow scope:
- validate `Factory reset and remove`
- validate post-removal `+` add flow from a clean device state
- confirm ownership removal, fresh claim, and restore/fresh-state expectations

Do not reopen recovery/onboarding refactors unless the next agent finds a concrete regression in the now-stable flow.
