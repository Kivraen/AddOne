---
id: T-016
title: Expo SDK 55 upgrade and validation
subsystem: app
priority: medium
owner: Unassigned
depends_on: []
owned_paths:
  - package.json
  - package-lock.json
  - app.config.js
  - eas.json
  - app/
  - components/
  - ios/
  - android/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/git-operations.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-expo-sdk-55-upgrade-and-validation.md
---

# T-016 Expo SDK 55 Upgrade And Validation

## Objective

Upgrade AddOne from Expo SDK 54 to Expo SDK 55 in a controlled way, with explicit validation on the real beta app path.

## Why Now

The app is still pinned to SDK 54, and there is no durable repo record that SDK 55 was already completed here. The current real-device build path should be tested first, then the SDK migration should happen as its own guarded slice.

## In Scope

- Expo SDK 55 dependency upgrade
- required peer dependency alignment
- config updates required by SDK 55
- iOS internal beta build validation
- regression checks on onboarding, settings, recovery, profile, Friends entry, and auth shell

## Out Of Scope

- broad product redesign
- unrelated feature work
- mixing the migration with Friends implementation

## Required Changes

- `expo`, `react-native`, Expo module package versions
- any required config/plugin changes for SDK 55
- docs updated if the upgrade changes build or runtime assumptions

## Verification Required

- `npx expo-doctor`
- `npm run typecheck`
- successful `eas build --platform ios --profile beta`
- manual smoke pass on the installed beta app

## Success Definition

- the repo is on SDK 55
- doctor and typecheck pass cleanly
- an installable iOS beta build succeeds from the upgraded commit
- no major regression is found in the main beta flows

## Open Risks

- SDK 55 is a real migration, not a patch bump
- any build-system or native-module breakage should be fixed in this task, not deferred into UI feature work
