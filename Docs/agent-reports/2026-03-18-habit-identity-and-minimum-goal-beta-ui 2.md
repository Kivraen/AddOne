---
task_id: T-005
title: Habit identity and minimum goal beta UI
date: 2026-03-18
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/ui-beta-issue-log.md
  - app/(app)/onboarding/index.tsx
  - app/(app)/devices/[deviceId]/settings/routine.tsx
  - components/app/home-screen.tsx
  - hooks/use-device-settings-draft.ts
  - lib/device-settings.ts
  - lib/habit-details.ts
  - store/device-habit-metadata-store.ts
  - store/device-settings-draft-store.ts
---

## Summary

Added a short-form habit identity flow for beta:
- onboarding now collects a defaultable habit name and an optional daily minimum phrase
- `Routine` settings now edits both with one-line character caps
- the home subtitle now uses the minimum-goal line instead of redundant reset-status copy

## Stage

`S3: Beta UI Completion And Social Shape`

## Status

Implemented as a scoped beta UI/data-wiring pass. The minimum goal is persisted app-side for now and does not change firmware or runtime behavior.

## Changes made

- Added shared habit identity helpers in `lib/habit-details.ts`
- Added persisted app-side minimum-goal storage in `store/device-habit-metadata-store.ts`
- Extended the settings draft flow so the minimum goal participates in `Draft + Apply` even though it is not a device patch field
- Added habit name + daily minimum inputs with character caps to onboarding
- Added habit name + daily minimum editing to `Routine` settings
- Replaced the redundant home subtitle status copy with the minimum-goal line in calm state, while keeping verifying state messaging
- Updated `Docs/ui-beta-issue-log.md`

## Commands run

- `rg -n "habitName|min goal|minimum goal|minimum|daily goal|goal" app components hooks lib types Docs -g '!node_modules'`
- `sed -n '500,720p' 'app/(app)/onboarding/index.tsx'`
- `sed -n '1,280p' lib/device-settings.ts`
- `sed -n '1,180p' types/addone.ts`
- `sed -n '180,330p' 'app/(app)/onboarding/index.tsx'`
- `sed -n '1,220p' hooks/use-devices.ts`
- `sed -n '1,240p' store/app-ui-store.ts`
- `sed -n '1,260p' 'app/(app)/devices/[deviceId]/settings/routine.tsx'`
- `sed -n '1,260p' 'app/(app)/devices/[deviceId]/settings/index.tsx'`
- `git diff -- 'lib/habit-details.ts' 'store/device-habit-metadata-store.ts' 'lib/device-settings.ts' 'store/device-settings-draft-store.ts' 'hooks/use-device-settings-draft.ts' 'app/(app)/onboarding/index.tsx' 'app/(app)/devices/[deviceId]/settings/routine.tsx' 'components/app/home-screen.tsx' Docs/ui-beta-issue-log.md`
- `npm run typecheck`

## Evidence

- `npm run typecheck` passed
- onboarding now collects a defaultable habit name and optional daily minimum before finishing setup
- `Routine` settings now exposes both fields with character caps and keeps them inside the existing apply flow
- the home subtitle no longer repeats `Next reset at midnight` in calm state and now prefers the minimum-goal line instead
- `Docs/ui-beta-issue-log.md` now records the new beta habit-identity rule and the local-only metadata caveat

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/ui-beta-issue-log.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `.agents/skills/building-native-ui/SKILL.md`
- `Docs/PROJECT_HABIT.md`

## Files changed

- `Docs/ui-beta-issue-log.md`
- `app/(app)/onboarding/index.tsx`
- `app/(app)/devices/[deviceId]/settings/routine.tsx`
- `components/app/home-screen.tsx`
- `hooks/use-device-settings-draft.ts`
- `lib/device-settings.ts`
- `lib/habit-details.ts`
- `store/device-habit-metadata-store.ts`
- `store/device-settings-draft-store.ts`

## Verification

- Verified:
  - TypeScript compile safety with `npm run typecheck`
  - local draft/apply integration by code inspection
  - onboarding and settings wiring by code inspection
- Not verified:
  - fresh device/simulator visual pass
  - cross-session persistence replay on-device

## Decisions / assumptions

- `Habit Name` is the beta default when the user skips naming during setup
- the minimum-goal field is optional
- character caps are intentionally short so both lines stay one-line friendly
- the minimum goal is app-side metadata for now, not a cloud/device contract change

## Open questions or blockers

- if minimum goal should sync across signed-in devices or appear in sharing surfaces, it needs a real backend/profile/device model decision
- the exact final home-header behavior for offline versus verifying states may still need one more visual polish pass on-device

## Open risks / blockers

- no fresh device/simulator visual pass yet
- minimum-goal persistence is local to the app today
- Expo package-version audit is still pending as a separate follow-up

## Recommendation

Treat this as the beta baseline:
- habit name is defaultable and editable
- minimum goal is short, optional, and visible on the home screen
- routine settings remains the editing surface

Next handoff if needed:
- decide whether minimum goal stays app-local for beta or should be promoted into the cloud/device model
- run a quick on-device polish pass for onboarding and the updated home subtitle

## Recommended next handoff

If the feature feels right on-device, the next task should be a narrow home-header cleanup pass to finalize calm-state spacing and any remaining verifying/offline edge behavior around the new subtitle line.
