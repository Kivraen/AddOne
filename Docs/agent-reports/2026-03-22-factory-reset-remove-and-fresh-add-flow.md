---
task_id: T-018
title: Factory reset remove and fresh add-flow validation
date: 2026-03-22
agent: Codex
result_state: Implemented
verification_state: Live-validated
changed_paths:
  - Docs/plans/2026-03-22-device-lifecycle-real-world-test-checklist.md
  - Docs/ui-beta-issue-log.md
  - app/(app)/devices/[deviceId]/history.tsx
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - app/(app)/onboarding/index.tsx
  - components/app/home-screen.tsx
  - components/board/pixel-grid.tsx
  - firmware/src/board_renderer.cpp
  - firmware/src/firmware_app.cpp
  - hooks/use-devices.ts
  - hooks/use-setup-flow-controller.ts
  - lib/board.ts
  - lib/device-connection.ts
  - lib/device-recovery.ts
  - lib/device-removal.ts
  - lib/habit-details.ts
  - lib/mock-data.ts
  - lib/setup-flow.ts
  - lib/supabase/addone-repository.ts
  - lib/supabase/database.types.ts
  - supabase/migrations/20260322183000_device_account_removal_flow.sql
  - supabase/migrations/20260322234500_fix_post_reset_runtime_state.sql
  - supabase/migrations/20260323011500_cancel_stale_commands_on_claim.sql
  - supabase/migrations/20260323024500_add_editable_habit_start_date.sql
  - types/addone.ts
---

Stage
S3: Beta UI Completion And Social Shape

Status
Implemented, iterated, and live-validated on real hardware. The destructive `Factory reset and remove` path, fresh post-removal add flow, onboarding stabilization, and the follow-up history-start backdating/editor behavior all reached a stable working state after repeated real-device reruns. This branch is ready for coordinator acceptance and merge, with remaining work now in UI polish rather than lifecycle correctness.

Changes made
- Reworked destructive removal into one adaptive app action:
  - live board path sends remote factory reset and waits for account removal completion
  - offline/broken/lost board path allows immediate account-only removal
- Added backend account-removal state and completion semantics on `devices`, with explicit modes, deadlines, and finalization behavior.
- Moved destructive removal completion off raw command ack and onto device-confirmed reset or bounded timeout finalization.
- Tightened claim behavior so beta setup requires preregistered hardware instead of silently creating new unknown device records.
- Cancelled stale queued commands during fresh claim so an old `factory_reset` cannot replay onto a newly reclaimed board.
- Fixed post-reset runtime authority state:
  - stale pre-reset runtime head no longer blocks fresh snapshots after re-add
  - fresh claims now reset runtime projection fields cleanly
  - new claims advance history era correctly instead of colliding with old eras
- Updated onboarding defaults so first-time setup saves non-empty values:
  - `Main habit`
  - `Do the smallest version that still counts.`
  - weekly target `3`
- Hardened onboarding/recovery first-step UX so users cannot advance prematurely before the phone is actually on the AddOne AP.
- Improved onboarding finish flow and progress feedback:
  - explicit finishing/loading state for `Open my board`
  - stale “Almost ready” session card no longer reappears after destructive reset
  - onboarding form refreshes no longer clobber typed habit data mid-step
  - fresh onboarding no longer reuses the wrong recovery-specific progress semantics
- Fixed restore/replace-device confusion in the fresh add flow:
  - destructive reset + fresh add now behaves like first-time hardware
  - restore was removed from the normal fresh onboarding path instead of piggybacking on Wi-Fi recovery semantics
- Stabilized setup AP/Wi-Fi behavior:
  - first AP scan handoff is more tolerant
  - AP join step is background-probed instead of relying on the user pressing too early
  - setup flow state/count now reflects onboarding instead of pretending it is the three-step recovery flow
- Fixed device/app palette mismatch by aligning firmware palette presets with app palette definitions and reflashing firmware.
- Fixed boot-time reset baseline behavior so a hard reset no longer creates phantom failed weeks from the firmware fallback date.
- Added a real-world test checklist for destructive reset/remove and fresh add validation.
- Extended history editing with an explicit editable habit-start local date:
  - immutable era timestamp remains the system source of truth
  - editable `habit_started_on_local` becomes the visible history-edit boundary
  - pre-start cells are visually locked in the editor
  - tapping a locked earlier cell prompts the user to move the habit start earlier
  - save now backfills the newly included earlier range so app and physical board week-status rows stay aligned

Commands run
- `git status --short --branch`
- `git diff --name-only`
- `git diff --stat`
- multiple `rg`, `sed`, and `lsof` inspection commands during planning and debugging
- `npm run typecheck`
- `npm run test:runtime`
- `npx supabase db push --linked`
- `npx supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`

Evidence
- Real hardware destructive-reset runs completed end to end:
  - device showed blue AP/setup state after reset
  - app returned to fresh `Connect your AddOne` state
  - device was removed from the account and could be onboarded again as fresh hardware
- Serial monitor repeatedly showed the intended lifecycle:
  - AP provisioning accepted
  - Wi-Fi connected to `VR`
  - `Cloud claim redeemed`
  - `State -> Tracking`
  - MQTT connected
  - runtime snapshots uploaded
  - `apply_device_settings` applied
- Destructive removal path was confirmed on serial:
  - `factory_reset` command queued
  - `Factory reset requested from app.`
  - `report_device_factory_reset -> HTTP 200`
  - device rebooted into AP/setup mode
- The stale post-reset board-history bug was reproduced live, fixed with backend/runtime changes, and then no longer reproduced in later reruns.
- The stale reset-command replay bug after re-claim was reproduced live, fixed by claim-time command cancellation, and no longer reproduced in later reruns.
- Palette mismatch was reproduced on hardware, fixed in firmware, flashed, and verified on-device afterward.
- Hard-reset phantom red-week row was reproduced on hardware, traced to fallback-date reset initialization, fixed in firmware, flashed, and verified afterward.
- History-start backdating/editor behavior was validated after the follow-up implementation:
  - pre-start cells are locked and visually distinct
  - tapping earlier history prompts a start-date move
  - after save, device week-status row now matches the app instead of leaving newly included weeks black
- Linked Supabase backend was updated during this slice, including:
  - account removal flow
  - post-reset runtime-state repair
  - stale-command cancellation on claim
  - editable habit-start local date
- Final app verification passed:
  - `npm run typecheck`
  - `npm run test:runtime`

Open risks / blockers
- Remaining issues are polish-oriented rather than lifecycle-breaking:
  - setup and onboarding transitions can still be visually tightened
  - copy and step framing can be simplified further now that behavior is stable
- Real-world Wi-Fi still showed at least one transient first-try WPA handshake miss (`disconnect reason 15`) during testing. The UX is now safer, but the device still does not internally auto-retry the same credentials before surfacing failure.
- No dedicated replacement-device/restore product flow exists anymore in onboarding. That is intentional for this slice, but if product wants a “move my old board onto new hardware” feature later, it should be designed as its own explicit flow rather than reopening onboarding ambiguity.

Recommendation
Accept this slice as completed and live-validated for:
- destructive `Factory reset and remove`
- fresh post-removal add-device onboarding
- prereg-required beta claim behavior
- onboarding/recovery hardening from real-device iteration
- post-reset runtime-state repair
- stale-command cancellation on re-claim
- editable earlier habit-start history correction

Coordinator next step:
1. checkpoint and merge `codex/s3-factory-reset-remove`
2. mark `T-018` complete
3. treat follow-up work as a new polish-focused slice rather than continuing lifecycle debugging on top of this branch

## Summary

This branch took the destructive reset/remove lifecycle from planned to real and tested. The app, backend, and firmware now support removing a board from the current account, resetting it to fresh hardware state, and onboarding it again without stale ownership, stale runtime state, stale commands, or recovery-path leakage. The branch also absorbed the user-driven follow-up fixes that surfaced only during real-world repetition: onboarding state glitches, palette mismatch, hard-reset week-state artifact, and history-start backdating/editor alignment.

By the end of the slice, the user was able to repeat the full reset/remove/re-add flow successfully multiple times on physical hardware and confirmed the overall process felt solid. The remaining work is UX polish, not core lifecycle trust.

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md`
- `Docs/tasks/T-019-device-lifecycle-factory-reset-and-first-add-plan.md`
- `Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/AddOne_Backend_Model.md`
- `Docs/AddOne_Device_AP_Provisioning_Contract.md`
- `Docs/ui-beta-issue-log.md`

## Verification

Verified:
- TypeScript check passed.
- Runtime projection tests passed.
- Firmware build passed.
- Firmware upload passed.
- Linked Supabase migrations were pushed.
- Real hardware destructive reset/remove passed.
- Real hardware fresh post-removal add flow passed.
- Real hardware onboarding iteration fixes were validated on repeated reruns.
- Real hardware history-start backdating/editor behavior passed after the follow-up fix.

Not verified in this slice:
- multi-device social/friends interactions after this lifecycle work
- any future explicit replacement-device restore flow, because it is intentionally out of scope here

## Decisions / assumptions

- Destructive removal should clear the account even if the board is offline, broken, or lost; remote reset is only attempted when the board is live.
- Fresh onboarding after destructive removal should behave as first-time hardware, not as recovery.
- Wi-Fi recovery remains reconnect-the-same-board behavior; it should not be mixed with replacement/restore semantics.
- Beta claim flow should require preregistered hardware.
- Habit start backdating is allowed earlier only in this first version.
- The immutable era timestamp and the user-editable habit-start local date are separate concepts and should remain separate.

## Open questions or blockers

- Should the next polish slice reduce or eliminate the visible retry/failure surface for transient first-try Wi-Fi handshake misses by adding firmware-side credential retry?
- Should the history editor eventually support an explicit “move start later” or “redefine habit era” flow, or should that remain intentionally unsupported until metrics/archive semantics are redesigned?
- If product later wants a replacement-device restore feature, it should be specified separately from onboarding and Wi-Fi recovery before implementation.
