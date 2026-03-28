---
id: T-049
title: Final iOS release-candidate polish and baseline lock
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-045
  - T-046
  - T-047
  - T-048
owned_paths:
  - app
  - components
  - hooks
  - lib
  - assets
  - app.config.js
  - eas.json
  - package.json
  - package-lock.json
  - Docs/AddOne_Beta_Environment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-045-publish-blocker-remediation-and-release-candidate-rerun.md
  - Docs/tasks/T-046-release-candidate-easy-ui-cleanup.md
  - Docs/tasks/T-047-friends-controls-and-release-candidate-ui-iteration.md
  - Docs/tasks/T-048-home-command-confirmation-latency-and-offline-refresh.md
  - Docs/agent-reports/2026-03-27-publish-blocker-remediation-and-release-candidate-rerun.md
  - Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md
  - Docs/agent-reports/2026-03-27-friends-controls-and-release-candidate-ui-iteration.md
  - Docs/agent-reports/2026-03-27-home-command-confirmation-latency-and-offline-refresh.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-final-ios-release-candidate-polish-and-baseline-lock.md
---

## Objective
Finalize the user-visible iOS release-candidate baseline by folding in the accepted RC UI fixes, cleaning the sign-in and auth copy, aligning Expo SDK 55 patch dependencies, and locking one exact commit for the next submission build.

## Why Now
`T-045` cleared the last external iOS-artifact blocker for baseline `dce8541`, but that build no longer represents the best candidate to ship. Since then, the accepted RC slices `T-046`, `T-047`, and `T-048` improved the app meaningfully, and the sign-in/auth surface still contains staging-language copy that is too raw for submission.

## In Scope
- Finalize the sign-in screen copy and small auth-surface wording so it reads like a real shipped beta surface instead of staging scaffolding
- Include the accepted RC app improvements from `T-046`, `T-047`, and `T-048` in the intended ship baseline
- Keep the app icon and Android adaptive icon config aligned in the final baseline
- Align Expo SDK 55 patch dependencies so `expo doctor` no longer fails on package-version drift
- Update the beta runbook if the exact ship/build baseline or auth wording expectations change
- Produce the exact final commit hash that should be used for the next iOS release-candidate build

## Out Of Scope
- New product features
- Weekly minimum or history semantics work
- Offline-sync or reconnect redesign beyond the accepted `T-048` changes
- Android launch work
- Store metadata, App Store Connect copy, screenshots, or submission steps

## Required Changes
- The sign-in/auth flow must no longer show obvious staging or Supabase-internal wording in normal user-facing copy
- The final iOS RC baseline must include the accepted UI and Home-confirmation improvements the team intends to ship
- Expo SDK package validation must be clean for the final RC branch

## Verification Required
- `npm run typecheck`
- `npx expo install --check`
- `npx expo doctor`
- Exact files changed
- Metro + Simulator proof for the finalized sign-in/auth surface
- Explicit list of which accepted RC slices are now included in the intended ship baseline
- Explicit final commit hash recommended for the next iOS RC build

## Success Definition
- There is one clear “ship this” app baseline instead of a split between the old `dce8541` build and later accepted RC fixes
- The sign-in/auth surface is submission-quality in copy and presentation
- Expo patch drift is no longer a release-candidate warning
- The next step after this task is a fresh iOS RC build from the locked final commit, not more vague polish
