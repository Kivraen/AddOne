---
task_id: T-011
title: Beta timezone capability and picker baseline
date: 2026-03-18
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - app/(app)/onboarding/index.tsx
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/routine.tsx
  - components/settings/device-timezone-picker.tsx
  - lib/device-timezone.ts
  - lib/device-settings.ts
  - lib/runtime-board-projection.ts
  - firmware/src/time_service.h
  - firmware/src/time_service.cpp
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md
---

## Summary

- Implemented the shared beta timezone capability model, picker flow, runtime support for fixed UTC offsets, and bounded firmware support for the locked beta regional list.
- Kept DST behavior inside the timezone mode itself instead of adding a separate DST toggle.
- Remaining gap before acceptance: live manual proof is still incomplete, and the routine screen appears to have lost its reset-time editor during this slice.

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`
- `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`
- `Docs/ui-beta-issue-log.md`

## Files changed

- `app/(app)/onboarding/index.tsx`
- `app/(app)/devices/[deviceId]/recovery.tsx`
- `app/(app)/devices/[deviceId]/settings/routine.tsx`
- `components/settings/device-timezone-picker.tsx`
- `lib/device-timezone.ts`
- `lib/device-settings.ts`
- `lib/runtime-board-projection.ts`
- `firmware/src/time_service.h`
- `firmware/src/time_service.cpp`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/ui-beta-issue-log.md`
- `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`

## Verification

- `npm run typecheck`
- `npm run test:runtime`
- targeted timezone proof script for supported U.S. timezone, `Europe/Warsaw`, `Europe/Kyiv`, positive and negative fixed offsets, and unsupported IANA fallback behavior
- live simulator or hardware tap-through was not completed in this turn

## Decisions / assumptions

- Regional timezones and fixed UTC offsets are different product concepts and should remain different UI modes.
- DST is part of the regional timezone definition, not a separate toggle.
- Fixed UTC offsets are valid as an advanced mode, but they must stay explicitly labeled as no-DST behavior.

## Open questions or blockers

- The routine screen needs a follow-up check because reset-time editing appears to be missing after this slice.
- Coordinator acceptance still requires live manual proof across onboarding, settings, and recovery.

## Recommended next handoff

- Revise this slice by restoring or explicitly relocating reset-time editing, then run one manual proof pass for onboarding, settings, recovery, and advanced offset selection.

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented with typecheck and targeted proof complete. Live simulator and real-device manual tap-through are still recommended before coordinator acceptance because they were not completed in this turn.

## Changes made

- Added a shared timezone capability layer in `lib/device-timezone.ts` that:
  - defines the beta-supported regional timezone list
  - defines advanced fixed UTC offsets in 15-minute increments
  - distinguishes supported regional zones, supported fixed offsets, unsupported-but-valid IANA zones, and unknown values
  - resolves phone defaults to either a supported regional zone or an explicit fixed-offset fallback
- Added a reusable timezone picker in `components/settings/device-timezone-picker.tsx` with:
  - a searchable supported regional list
  - a separate fixed-offset mode
  - explicit unsupported-zone messaging
  - a shared `Use phone default` action
  - simplified rows that show a short timezone name plus its code/value instead of long per-row explanations
- Kept daylight-saving behavior tied to the timezone mode itself instead of adding a separate enable/disable toggle:
  - regional timezones follow the region's own rules
  - fixed UTC offsets never auto-adjust for daylight saving time
- Replaced raw-text timezone editing with the shared picker in:
  - onboarding final settings
  - routine settings
  - recovery bootstrap setup
- Updated onboarding bootstrap defaulting so the session starts from the resolved phone timezone policy instead of blindly sending the raw phone IANA zone.
- Updated recovery bootstrap so the user can keep or change the device timezone before reconnecting Wi-Fi.
- Updated settings validation and summary labels so fixed offsets and supported labels render coherently without relying on raw strings.
- Extended runtime projection to understand fixed UTC offsets.
- Expanded firmware timezone application to support:
  - the beta U.S. regional baseline
  - `Europe/Warsaw`
  - `Europe/Kyiv`
  - explicit fixed UTC offsets
- Updated the canonical spec and beta UI issue log so the locked beta timezone policy is durable.

## Commands run

- `npm run typecheck`
- `npm run test:runtime`
- `node --input-type=module <<'EOF' ... EOF`
  - transpiled `lib/device-timezone.ts` and `lib/runtime-board-projection.ts`
  - verified supported status for `America/New_York`, `Europe/Warsaw`, `Europe/Kyiv`, `UTC+05:30`, `UTC-07:00`, and `Europe/Paris`
  - verified phone fallback resolution for `Europe/Paris`
  - verified logical-day projection for Warsaw, Kyiv, and positive/negative fixed offsets
- `git status --short -- ...`
- `nl -ba ...` and `rg -n ...` across the changed app, library, firmware, and doc files listed below

## Evidence

- Shared timezone policy now lives in `lib/device-timezone.ts`, including the supported regional list, fixed-offset generation, unsupported-IANA detection, and phone-default fallback logic in [lib/device-timezone.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-timezone.ts#L45) and [lib/device-timezone.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-timezone.ts#L294).
- The reusable picker UI now powers the beta timezone flow, including searchable regional support, a separate fixed-offset mode, and explicit unsupported messaging in [device-timezone-picker.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-timezone-picker.tsx#L127).
- The picker rows are now reduced to a short name plus code/value so the list stays scannable, while the regional-vs-fixed mode switch carries the DST explanation in [device-timezone-picker.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-timezone-picker.tsx#L58) and [device-timezone-picker.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-timezone-picker.tsx#L157).
- Onboarding now resolves the phone timezone through the shared policy before creating the bootstrap session and uses the same picker for the final device timezone choice in [index.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/onboarding/index.tsx#L201), [index.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/onboarding/index.tsx#L241), and [index.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/onboarding/index.tsx#L568).
- Routine settings no longer expose raw timezone text and now route timezone edits through the shared picker in [routine.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/settings/routine.tsx#L92).
- Recovery now uses the shared picker before starting the reconnect session and sends the selected timezone as the bootstrap timezone in [recovery.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/recovery.tsx#L223), [recovery.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/recovery.tsx#L393), and [recovery.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/recovery.tsx#L517).
- Settings validation now accepts supported fixed offsets and surfaces clean labels in summaries in [device-settings.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-settings.ts#L130) and [device-settings.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-settings.ts#L220).
- Runtime projection now understands fixed UTC offsets for logical-day calculations in [runtime-board-projection.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/runtime-board-projection.ts#L48) and [runtime-board-projection.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/runtime-board-projection.ts#L125).
- Firmware now maps the locked beta regional list and parses explicit fixed UTC offsets in [time_service.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/time_service.cpp#L15), [time_service.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/time_service.cpp#L156), and [time_service.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/time_service.cpp#L169).
- Product docs now explicitly lock the beta timezone policy, supported list, and fixed-offset caveat in [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md#L32) and [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md#L54).
- Targeted proof command output:
  - `America/New_York => kind=regional; supported=true; label=Eastern Time`
  - `Europe/Warsaw => kind=regional; supported=true; label=Warsaw`
  - `Europe/Kyiv => kind=regional; supported=true; label=Kyiv`
  - `UTC+05:30 => kind=fixed-offset; supported=true; label=UTC+05:30`
  - `UTC-07:00 => kind=fixed-offset; supported=true; label=UTC-07:00`
  - `Europe/Paris => kind=unsupported-iana; supported=false; label=Europe/Paris`
  - `phone Europe/Paris => UTC+01:00; fallback=true`
- Verification results:
  - `npm run typecheck` passed.
  - `npm run test:runtime` passed after keeping the runtime projection smoke test compatible with the repo’s existing single-file transpile harness.

## Open risks / blockers

- I did not complete a live simulator tap-through or real-device manual pass for onboarding, routine settings, and recovery in this turn, so the required manual UI proof is still partially outstanding.
- Firmware support is now bounded and explicit, but broader worldwide regional timezone support still needs the follow-up task already noted in the issue log instead of being implied by the picker.
- A standalone daylight-saving enable/disable switch is intentionally not part of the model because daylight-saving rules come from the selected region; exposing it as a separate toggle would create invalid combinations.
- Unsupported legacy device timezone values are now surfaced honestly in the UI, but a real-device migration pass is still worth running for any already-provisioned devices carrying unsupported IANA zones.

## Recommendation

- Treat this slice as implementation-complete for code and scoped docs.
- Run one coordinator-reviewed manual pass next on:
  - onboarding with a supported U.S. timezone
  - settings switching to `Europe/Warsaw`
  - recovery switching to `Europe/Kyiv`
  - advanced fixed offsets using one positive and one negative example
- If that manual pass is clean, accept `T-011` and keep worldwide timezone expansion as the separate follow-up already identified in `T-012`.
