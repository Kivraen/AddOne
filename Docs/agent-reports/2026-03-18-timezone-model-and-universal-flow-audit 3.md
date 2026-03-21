---
task_id: T-006
title: Timezone model and universal flow audit
date: 2026-03-18
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/ui-beta-issue-log.md
  - Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md
---

## Summary

- Completed the timezone audit across onboarding, recovery, routine settings, backend sync, runtime projection, and firmware.
- Confirmed that device timezone is already treated as one canonical scheduling setting across the stack.
- Confirmed that universal timezone support is firmware-blocked today because unsupported IANA values fall back to Los Angeles rules on-device.

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-006-timezone-model-and-universal-flow-audit.md`
- `Docs/AddOne_V1_Canonical_Spec.md`

## Files changed

- `Docs/ui-beta-issue-log.md`
- `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`

## Verification

- Verified timezone defaulting, editing, persistence, projection, and firmware application through direct code inspection.
- Verified the current firmware-supported timezone allowlist and fallback behavior in `firmware/src/time_service.cpp`.
- No product code was changed in this task.

## Decisions / assumptions

- Device timezone should remain the canonical scheduling and reset setting.
- Any future viewer/display timezone should stay separate from the device timezone control.
- Beta should not use raw timezone text entry as the primary UX.

## Open questions or blockers

- Should beta ship with a supported-zone picker and explicit fallback messaging, or should firmware timezone support expand first?
- If the phone timezone is unsupported, what exact fallback and explanation should the onboarding and settings flow use?

## Recommended next handoff

- Coordinator should choose the beta timezone policy first:
  - supported-zone picker plus fallback messaging
  - or firmware timezone expansion for broader support
- After that decision, delegate the timezone implementation as a separate execution task instead of mixing it into general UI polish.

## Stage

S3: Beta UI Completion And Social Shape

## Status

Complete as an audit. No product code was changed; the only doc update was a clearer timezone blocker note in the beta UI issue log.

## Changes made

- Traced the timezone path from onboarding defaulting, recovery bootstrap, routine settings editing, backend persistence, realtime command sync, runtime projection, and firmware application.
- Confirmed that the app/backend preserve arbitrary IANA timezone strings, but firmware only applies a small allowlist and otherwise falls back to `America/Los_Angeles` POSIX rules.
- Updated `Docs/ui-beta-issue-log.md` to make the beta boundary explicit: device timezone stays canonical, viewer/display timezone should remain separate, and unsupported phone timezones need a deliberate fallback policy.

## Commands run

- `git status --short`
- `rg -n "timezone|iana|tz|time zone|current_timezone|device_timezone|display_timezone|timeZone" app components hooks lib firmware supabase Docs`
- `nl -ba ...` and `sed -n ...` across the onboarding, recovery, settings, backend, runtime, and firmware files listed in Evidence

## Evidence

- Onboarding defaults the device timezone from the phone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and passes it into onboarding session creation in `app/(app)/onboarding/index.tsx:17-23, 212-253`.
- Recovery bootstraps timezone from the current device timezone or falls back to the phone timezone in `app/(app)/devices/[deviceId]/recovery.tsx:18-24, 404-408`.
- Routine settings still expose a raw timezone text input plus a `Use phone timezone` shortcut in `app/(app)/devices/[deviceId]/settings/routine.tsx:89-239`.
- The shared device-settings draft stores timezone as a plain string and turns edits into `patch.timezone` with no support validation in `lib/device-settings.ts:103-190`.
- Device reads and shared-board projection both consume the device timezone as canonical scheduling input in `lib/supabase/addone-repository.ts:124-174, 177-209` and `lib/runtime-board-projection.ts:48-99, 156-187`.
- App-to-device settings sync carries timezone through the backend RPC and command payload in `lib/supabase/addone-repository.ts:554-625`, `supabase/migrations/20260308193000_queue_device_settings_sync.sql:3-52`, and `supabase/migrations/20260309150000_runtime_authority_rebuild.sql:391-526`.
- Firmware command parsing accepts timezone as part of the settings payload in `firmware/src/cloud_client.cpp:208-245` and `firmware/src/realtime_client.cpp:370-404`.
- Firmware stores timezone in device settings and applies it through `TimeService` in `firmware/src/device_settings.h:17-55`, `firmware/src/device_settings.cpp:41-89, 114-145, 214-233`, and `firmware/src/time_service.cpp:20-29, 136-166`.
- Supported firmware timezone mappings today are `UTC`, `Etc/UTC`, `America/Los_Angeles`, `America/Denver`, `America/Chicago`, and `America/New_York`; all other inputs fall back to `Config::kDefaultTimezonePosix` in `firmware/include/config.h:9-13` and `firmware/src/time_service.cpp:144-166`.

## Open risks / blockers

- Universal timezone support is blocked by firmware capability today, not just by UI shape. The current beta cannot honestly promise arbitrary IANA support on-device.
- The repository still has one `timezone` field for the device model, so device timezone and any future viewer/display timezone must stay conceptually separate until a deliberate schema split exists.
- If the phone timezone is unsupported, the current app flow still has no explicit user-facing fallback policy beyond sending the string through the stack.

## Recommendation

- Treat device timezone as the canonical scheduling/reset setting.
- Keep viewer/display timezone as a separate future reader preference; do not fold it into the device timezone control.
- Default from the phone only when the phone timezone is in the firmware-supported list; otherwise fall back to a supported beta zone and explain why.
- Replace the raw text timezone edit path with a searchable supported-zone picker as the primary beta UX.
- If a raw override remains for power users, mark unsupported values clearly and do not imply the device will honor them natively.
- For unsupported zones, preserve the user intent in app/backend state only if the product needs it for later migration, but keep the actual device-applied timezone on a firmware-supported value until the firmware expands.
- Next implementation split should separate:
  - timezone picker/list UX
  - firmware support expansion, if universal support is desired
  - any future viewer/display timezone reader preference
