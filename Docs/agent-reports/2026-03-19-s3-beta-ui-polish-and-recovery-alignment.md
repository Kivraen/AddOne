---
task_id: T-005
title: S3 beta UI polish and recovery/settings alignment batch
date: 2026-03-19
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - app/(app)/(tabs)/_layout.tsx
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/appearance.tsx
  - app/(app)/devices/[deviceId]/settings/colors.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - app/(app)/devices/[deviceId]/settings/routine.tsx
  - app/(app)/onboarding/index.tsx
  - components/app/home-screen.tsx
  - components/settings/device-settings-scaffold.tsx
  - components/settings/palette-color-editor.tsx
  - components/ui/glass-card.tsx
  - constants/palettes.ts
  - hooks/use-device-settings-draft.ts
  - hooks/use-onboarding.ts
  - lib/device-settings.ts
  - lib/habit-details.ts
  - lib/supabase/addone-repository.ts
  - store/device-habit-metadata-store.ts
  - store/device-settings-draft-store.ts
  - supabase/migrations/20260319001500_add_cancel_device_onboarding_session.sql
  - types/addone.ts
---

## Summary

Completed a broad Stage S3 visible-surface polish batch across the home screen, onboarding, routine/settings, appearance/colors, settings overview, and Wi-Fi recovery.

Main outcomes:
- the home surface is calmer and no longer jumps when flexible message text changes
- habit identity now includes a short editable daily minimum across onboarding, routine settings, and the home header
- settings apply controls and feedback were tightened so the screen no longer flashes transient success copy or shifts during apply
- appearance/colors was simplified from preset-plus-custom confusion into a cleaner 4-preset editable model
- Wi-Fi recovery is now Wi-Fi-only, includes explicit cancel actions, and has clearer spacing and less ambiguous status chrome
- shared spacing issues were partly addressed at the component level through a `GlassCard` content-spacing fix and a shared settings list surface

## Stage

`S3: Beta UI Completion And Social Shape`

## Status

Implemented as a scoped beta UI alignment batch. The visible surfaces moved forward substantially, but verification is still partial because local typecheck hangs and there was no full device sweep after the final refinements.

## Changes made

- Home screen:
  - locked the flexible insight/message area to a fixed collapsed height so toggling today no longer shifts the main button
  - added calmer copy transitions for that area
  - replaced the redundant calm-state subtitle/reset copy with the daily minimum line
  - changed connection UX to use a softer checking state before showing `Recovery`
  - removed the amber selected-tab flash during app bootstrap by using neutral/last-known accent handling in the tab shell
- Habit identity and routine:
  - added short habit-name and daily-minimum onboarding UI with default/skip behavior and one-line-friendly caps
  - added habit-name and daily-minimum editing to `Routine`
  - cleaned up routine spacing and section separation
  - removed visible reset-time UI from beta routine settings
- Settings scaffold and overview:
  - tightened apply/back controls so they feel more compact and material-led
  - removed transient success copy and related layout flash after Apply
  - added a shared `SettingsListSurface` for more balanced list-card spacing on the settings overview
- Appearance and colors:
  - removed visible off-pixel editing from the color flow
  - simplified palette UX into `Classic`, `Amber`, `Ice`, and `Geek`
  - removed the separate visible `Custom` identity from the palette list
  - made the selected preset stay selected while showing its edited colors
  - added row-level palette editing and a palette-level reset in the editor
  - made all default palettes more saturated and adjusted `Ice` fail color to be more distinct
  - repeatedly normalized spacing in the palette editor, including preview/header spacing, picker spacing, divider/reset spacing, and footer spacing
- Wi-Fi recovery:
  - removed timezone selection from recovery and reused the device timezone under the hood
  - added explicit `Cancel recovery` actions
  - added backend/app cancel plumbing plus a local fallback if the backend cancel function is not deployed yet
  - changed stacked recovery actions into side-by-side action rows
  - shortened long button copy so labels fit more naturally
  - widened recovery spacing throughout the card
  - removed the ambiguous `Ready for Wi-Fi` status chip
  - moved session-expiration copy into a smaller footnote below the actions
- Shared/app-side wiring:
  - added app-side habit metadata storage for the daily minimum
  - extended the settings draft/apply path to handle daily minimum and palette behavior
  - added last-seen/last-sync timestamps to the app device model to support calmer home connectivity UX
  - fixed `GlassCard` so content `gap` and padding are actually applied to the inner content view instead of being lost on the blur shell
- Docs:
  - updated `Docs/ui-beta-issue-log.md` across the batch to capture durable rules and contradictions
  - updated the canonical palette section in `Docs/AddOne_V1_Canonical_Spec.md`

## Commands run

- Context and docs:
  - `sed -n '1,220p' .agents/skills/building-native-ui/SKILL.md`
  - `sed -n '1,220p' Docs/AddOne_Main_Plan.md`
  - `sed -n '1,220p' Docs/project-memory.md`
  - `sed -n '1,220p' Docs/agent-coordination.md`
  - `sed -n '1,260p' Docs/stages/stage-03-trusted-beta-surface-alignment.md`
  - `sed -n '1,240p' Docs/ui-beta-issue-log.md`
  - `sed -n '1,260p' Docs/AddOne_V1_Canonical_Spec.md`
- Code discovery:
  - `rg -n "weekly target|quote|message|today|offline|recovery|timezone|palette|custom|reset time|minimum goal|habitName" app components hooks lib Docs -g '!node_modules'`
  - `rg --files app components hooks | rg "main|home|board|screen|settings|routine|appearance|recovery"`
  - `sed -n '1,260p' components/app/home-screen.tsx`
  - `sed -n '1,260p' 'app/(app)/devices/[deviceId]/settings/routine.tsx'`
  - `sed -n '1,260p' 'app/(app)/devices/[deviceId]/settings/appearance.tsx'`
  - `sed -n '1,360p' components/settings/palette-color-editor.tsx`
  - `sed -n '1,260p' 'app/(app)/devices/[deviceId]/recovery.tsx'`
  - `sed -n '1,120p' components/ui/glass-card.tsx`
  - `sed -n '1,260p' components/settings/device-settings-scaffold.tsx`
- Verification and inspection:
  - repeated `git diff -- <path>` on touched UI files
  - repeated `nl -ba <file> | sed -n ...` on touched UI files for line-accurate proof
  - repeated `git status --short`
  - repeated `PATH="/opt/homebrew/opt/node@22/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin" npm run typecheck`

## Evidence

- Home:
  - the stable home insight slot and flexible-message containment live in `components/app/home-screen.tsx`
  - the home connection state now prefers a softer intermediary state instead of a direct live/offline jump
  - the calm-state subtitle now prefers the daily minimum line instead of reset-time filler copy
- Onboarding and routine:
  - onboarding now captures habit identity and daily minimum in `app/(app)/onboarding/index.tsx`
  - `Routine` now exposes those same fields in `app/(app)/devices/[deviceId]/settings/routine.tsx`
  - reset-time UI is no longer visible on the beta routine surface
- Settings:
  - the apply feedback flash/jump was removed in `components/settings/device-settings-scaffold.tsx`
  - settings overview spacing now uses `SettingsListSurface` in `components/settings/device-settings-scaffold.tsx` and `app/(app)/devices/[deviceId]/settings/index.tsx`
  - the shared `GlassCard` bug was corrected in `components/ui/glass-card.tsx`, which explains why several card-based spacing fixes started behaving correctly afterward
- Appearance/colors:
  - palette rows and the editor now live in a simpler 4-preset model across `app/(app)/devices/[deviceId]/settings/appearance.tsx`, `app/(app)/devices/[deviceId]/settings/colors.tsx`, `components/settings/palette-color-editor.tsx`, `constants/palettes.ts`, `lib/device-settings.ts`, and `store/device-settings-draft-store.ts`
  - preset apply now resolves palette colors immediately instead of needing a post-selection “nudge”
- Recovery:
  - explicit cancel recovery wiring exists across `app/(app)/devices/[deviceId]/recovery.tsx`, `hooks/use-onboarding.ts`, `lib/supabase/addone-repository.ts`, and `supabase/migrations/20260319001500_add_cancel_device_onboarding_session.sql`
  - timezone UI is gone from recovery and the screen now stays Wi-Fi-focused
  - recovery action layout, label shortening, spacing, chip removal, and expiration-footnote placement all live in `app/(app)/devices/[deviceId]/recovery.tsx`
- Docs:
  - `Docs/ui-beta-issue-log.md` now records durable rules for:
    - fixed-height flexible dashboard note behavior
    - compact/material apply controls
    - quiet success feedback
    - routine separation and no visible reset-time UI
    - recovery as Wi-Fi-only with explicit cancel and no ambiguous status chip
    - palette model simplification and spacing expectations

## Source docs used

- `.agents/skills/building-native-ui/SKILL.md`
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/ui-beta-issue-log.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/git-operations.md`

## Files changed

- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/ui-beta-issue-log.md`
- `app/(app)/(tabs)/_layout.tsx`
- `app/(app)/devices/[deviceId]/recovery.tsx`
- `app/(app)/devices/[deviceId]/settings/appearance.tsx`
- `app/(app)/devices/[deviceId]/settings/colors.tsx`
- `app/(app)/devices/[deviceId]/settings/index.tsx`
- `app/(app)/devices/[deviceId]/settings/routine.tsx`
- `app/(app)/onboarding/index.tsx`
- `components/app/home-screen.tsx`
- `components/settings/device-settings-scaffold.tsx`
- `components/settings/palette-color-editor.tsx`
- `components/ui/glass-card.tsx`
- `constants/palettes.ts`
- `hooks/use-device-settings-draft.ts`
- `hooks/use-onboarding.ts`
- `lib/device-settings.ts`
- `lib/habit-details.ts`
- `lib/supabase/addone-repository.ts`
- `store/device-habit-metadata-store.ts`
- `store/device-settings-draft-store.ts`
- `supabase/migrations/20260319001500_add_cancel_device_onboarding_session.sql`
- `types/addone.ts`

## Verification

- Verified:
  - repeated code inspection of the touched surfaces and shared components
  - line-accurate inspection with `nl -ba`
  - local diffs for touched UI and wiring files
- Partially verified:
  - app-side flow correctness by tracing onboarding/settings/palette/recovery wiring
  - recovery cancel flow shape, including backend mutation path and local fallback
- Not verified:
  - `npm run typecheck` never completed successfully during this batch because `tsc --noEmit` hung repeatedly
  - no final full simulator/device sweep was run after the latest visual refinements
  - no deployed verification of the new Supabase cancel migration

## Decisions / assumptions

- Beta habit identity now includes:
  - a short defaultable habit name
  - a short optional daily minimum
- The home header should use meaningful habit/trust information, not filler reset text.
- Beta routine UI should not expose reset-time editing; midnight is the visible default.
- Recovery should stay focused on Wi-Fi, not timezone decisions.
- Palette UX should be simpler for beta:
  - `Classic`
  - `Amber`
  - `Ice`
  - `Geek`
  - row-level editing
  - no separate visible `Custom` row
- Shared spacing bugs were important enough to fix at the component level, not only per screen.

## Open questions or blockers

- Reset-time product/model cleanup is not fully finished everywhere:
  - the beta UI hides reset-time control
  - broader runtime/spec cleanup to truly lock “midnight only” still needs coordinator confirmation if that is the final product rule
- The palette implementation still relies on the existing selected-preset-plus-overrides model under the hood, not four independently persisted edited presets
- The new backend cancel path needs the migration deployed before the cloud-side cancellation path is truly live everywhere

## Open risks / blockers

- `npm run typecheck` still hangs at `tsc --noEmit`
- no final on-device visual proof after the last recovery refinements
- Expo package audit/alignment is still pending, including the patch-version mismatches previously surfaced by Expo
- because the worktree is dirty, coordinator acceptance should review only the paths listed above and avoid absorbing unrelated modified files

## Recommendation

Treat this as a substantial S3 UI alignment checkpoint rather than the final acceptance pass.

What the coordinator should review next:
- visible beta surfaces now feel materially more coherent across home, settings, colors, and recovery
- `Docs/ui-beta-issue-log.md` contains the durable rules surfaced during the batch
- the remaining acceptance blockers are verification and cleanup, not basic UI direction

## Recommended next handoff

Suggested next narrow coordinator follow-ups:
- run one focused on-device visual sweep across:
  - home
  - routine
  - appearance/colors
  - recovery
- do the pending Expo package audit/alignment pass
- decide whether reset-time should be formally removed from the broader product/runtime model or simply remain hidden in beta UI
