---
task_id: T-005
title: S3 cumulative UI surface report for resident beta UI pass
date: 2026-03-19
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - app/(app)/(tabs)/_layout.tsx
  - app/(app)/devices/[deviceId]/history.tsx
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/appearance.tsx
  - app/(app)/devices/[deviceId]/settings/colors.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - app/(app)/devices/[deviceId]/settings/routine.tsx
  - app/(app)/onboarding/index.tsx
  - components/app/home-screen.tsx
  - components/settings/device-settings-scaffold.tsx
  - components/settings/palette-color-editor.tsx
  - components/settings/device-timezone-picker.tsx
  - components/ui/glass-card.tsx
  - constants/palettes.ts
  - constants/theme.ts
  - hooks/use-device-settings-draft.ts
  - hooks/use-devices.ts
  - hooks/use-onboarding.ts
  - lib/device-connection.ts
  - lib/device-settings.ts
  - lib/habit-details.ts
  - lib/supabase/addone-repository.ts
  - store/device-habit-metadata-store.ts
  - store/device-settings-draft-store.ts
  - supabase/migrations/20260319001500_add_cancel_device_onboarding_session.sql
  - types/addone.ts
---

## Summary

This report consolidates the resident Stage S3 UI work completed across this chat into one coordinator-facing checkpoint.

The pass was mostly visual and interaction-polish work, but several durable product and app-behavior decisions also emerged:
- the beta home surface now treats the dashboard note, KPI strip, and connection status more intentionally
- the beta settings family now shares a calmer spacing system, shorter helper copy, darker restrained cards, and less-rounded control chrome
- habit identity now includes a short one-line daily minimum collected in onboarding and editable in `Routine`
- recovery is now explicitly Wi-Fi-only, has cancel actions, and no longer mixes in timezone configuration
- appearance/palette moved to a simpler locked beta model with four named presets and inline editing
- history edit mode now uses the same softer connection-grace model as the home screen instead of alarming too early

This cumulative report supplements and effectively rolls up the narrower reports already produced during the batch:
- `2026-03-18-habit-identity-and-minimum-goal-beta-ui.md`
- `2026-03-18-home-connection-checking-state.md`
- `2026-03-19-s3-beta-ui-polish-and-recovery-alignment.md`

## Stage

`S3: Beta UI Completion And Social Shape`

## Result

The visible beta surface is materially calmer and more coherent than it was at the start of this thread.

The main screen, settings overview, nested settings pages, appearance/colors, history edit gate, onboarding, and Wi-Fi recovery all received real polish work. The remaining work is now more about verification and the still-open onboarding/friends/profile slices than about basic surface coherence.

## Cumulative work completed

### Home screen

- Locked the rotating dashboard note into a fixed-height collapsed slot so toggling today no longer shifts the main button.
- Replaced the hard text swap with a softer handoff animation.
- Reworked the home subtitle logic so the calm state uses the daily minimum line instead of redundant reset/status filler.
- Replaced the old `Visible fill` KPI with a more useful strip:
  - `This week`
  - `Weeks`
  - `Recorded`
- Added a softer connection UX:
  - subtle checking state first
  - only surface `Recovery` after the board looks confirmed offline
- Removed the amber bottom-tab flash during restore by keeping selected-tab tint neutral until the active device accent is known.

### Habit identity and routine

- Added a one-line habit name and a one-line daily minimum as real beta identity fields.
- Added those fields to onboarding and to `Routine`.
- Kept the daily minimum intentionally short and app-side for now.
- Cleaned routine spacing, separations, and copy so sections feel calmer.
- Kept weekly target separated from habit identity and treated as its own block.
- Removed visible reset-time UI from the beta `Routine` surface.

### Settings shell and settings overview

- Tightened shared settings header controls so `Apply` and `Back` feel like restrained material actions instead of oversized CTA pills.
- Removed transient success copy after Apply and stopped the top-of-screen jump that came from flashing status text under the header.
- Added shared list-card rhythm to the settings overview so dividers, row spacing, and top/bottom padding feel balanced.
- Shortened helper copy across overview/tool surfaces to keep the shell quieter.

### Appearance and colors

- Removed visible off-pixel editing from the beta appearance surface.
- Simplified palette UX into a locked four-preset model:
  - `Classic`
  - `Amber`
  - `Ice`
  - `Geek`
- Replaced `Rose` with `Geek`.
- Removed the old preset-plus-custom confusion from the visible palette list.
- Kept the selected preset active while its colors are edited.
- Moved palette editing into row-level edit affordances and a dedicated editor flow.
- Added palette-level reset inside the editor instead of a second appearance section.
- Increased default palette saturation so the shipped defaults are more intentional on the board.
- Fixed the apply-path bug where selecting a preset still pushed stale unsaturated colors until a color control was nudged.

### History edit mode

- Reworked history edit mode so it no longer alarms too early on stale presence.
- Applied the same grace/checking model used on the home screen.
- During the grace window, history checks quietly in the background instead of immediately showing a hard offline gate.
- Added explicit `Back` and `Refresh` actions for the confirmed unavailable state.
- Added a short orientation-settle gate so helper text does not flash while the route rotates into landscape.

### Wi-Fi recovery

- Removed timezone from the visible recovery flow.
- Recovery now reuses the device timezone under the hood and stays Wi-Fi-only.
- Added explicit `Cancel recovery` actions instead of trapping the user in the active recovery flow.
- Added backend/app cancel plumbing plus a local fallback for unfinished server-side rollout.
- Reworked action layout from stacked buttons into paired buttons in one row.
- Shortened overly long action labels to fit more naturally.
- Removed the ambiguous `Ready for Wi-Fi` chip.
- Moved session-expiration text into a quieter footnote position.
- Reworked recovery spacing repeatedly so title, copy, fields, actions, and footnotes stop crowding each other.

### Onboarding

- Added the new habit-name and daily-minimum setup step content.
- Shortened and quieted onboarding helper copy.
- Reworked onboarding card/field spacing to better match the settings family.
- Kept reset-time out of the visible onboarding setup and treated midnight plus auto-brightness as the beta defaults.

### Shared visual system

- Fixed `GlassCard` so content padding and gaps actually apply to inner content instead of getting lost on the wrapper.
- Introduced calmer shared spacing tokens for the settings family.
- Moved shared beta card surfaces to a flat `#121212` body instead of a visibly gray decorative material.
- Tightened shared radius tokens so cards are only slightly rounded and fields/buttons are much less pill-like.

## Important decisions and durable rules that came out of the work

These are the coordinator-relevant decisions that are more important than the visual tweaks themselves:

- The home dashboard note should never reflow the primary action; it stays fixed-height in the collapsed state.
- The calm home subtitle should communicate habit meaning, not filler system text.
- The home connection affordance should not jump directly from live to recovery on the first stale signal.
- Beta habit identity now includes:
  - short habit name
  - short optional daily minimum
- The beta `Routine` surface should not expose reset-time UI.
- Recovery should stay focused on Wi-Fi and should not surface timezone selection.
- Recovery requires an explicit cancel path.
- Beta appearance should use one inline palette system, not a separate visible custom lane.
- The locked beta palette names are:
  - `Classic`
  - `Amber`
  - `Ice`
  - `Geek`
- Settings-family pages should use one calmer shared spacing rhythm and helper copy should be short and quiet.
- Shared beta card surfaces should use a flat `#121212` body and less-rounded shared tokens.

These durable rules were written into `Docs/ui-beta-issue-log.md` as the live memory for the stage.

## Docs and durable memory updated

- `Docs/ui-beta-issue-log.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- multiple point reports in `Docs/agent-reports/`

The UI issue log now captures the durable rules around:
- fixed-height home note behavior
- compact settings apply controls
- quiet apply success behavior
- settings-family spacing expectations
- flat `#121212` beta card surfaces
- squarer shared radius language
- recovery as a Wi-Fi-only flow with explicit cancel
- simplified beta palette model
- reset-time hidden from the beta routine surface

## Verification

### Verified

- Repeated code inspection across the touched surfaces and shared primitives.
- Line-accurate inspection with `nl -ba` on the main changed files.
- Local TypeScript syntax parse on the touched files returned `syntax-ok`.

### Partially verified

- Flow/wiring correctness by tracing:
  - settings draft/apply behavior
  - palette selection and reset behavior
  - recovery cancel flow
  - home/history connection grace behavior

### Not fully verified

- There was no final full on-device sweep after the last broad spacing/material pass.
- Repo-wide `npm run typecheck` does not pass cleanly right now.

Current visible `typecheck` blockers appear dominated by pre-existing workspace noise outside this pass, especially:
- `app/(app)/devices/[deviceId]/settings/appearance 2.tsx`
- the `node_modules_corrupt_backup_20260318/` tree

## Remaining risks and follow-ups

- Onboarding still feels like the main remaining UI surface that deserves a dedicated polish/verification slice.
- The beta UI now hides reset-time editing, but the broader runtime/spec model has not been fully cleaned up to make “midnight only” the end-to-end product truth.
- Recovery cancel depends on the new Supabase migration being deployed for the cloud-side path, although the local fallback prevents the user from being trapped.
- The palette model still uses the existing selected-preset-plus-overrides structure under the hood rather than four independently persisted edited presets.
- Expo package audit/alignment is still pending and should be handled separately.

## Recommended next coordinator move

Treat this report as the cumulative resident-UI checkpoint for the thread and do not ask the coordinator to reconstruct the work from chat.

Recommended next slice:
1. Accept this as the S3 visible-surface checkpoint.
2. Run one focused visual sweep on-device across:
   - settings overview
   - routine
   - appearance/colors
   - recovery
   - onboarding
3. Promote onboarding polish into the next dedicated UI execution slice.
4. Keep Expo package alignment as a separate cleanup pass, not mixed into UI review.

