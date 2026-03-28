---
id: T-050
title: First-device onboarding and setup polish
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-049
owned_paths:
  - app/(app)/onboarding
  - components/setup
  - hooks/use-onboarding.ts
  - hooks/use-setup-flow-controller.ts
  - lib/setup-flow.ts
  - lib/onboarding-restore.ts
  - app/(app)/devices/[deviceId]/recovery.tsx
  - components/app/home-screen.tsx
  - Docs/AddOne_Beta_Environment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
  - Docs/tasks/T-017-add-device-entry-flow-first-screen.md
  - Docs/tasks/T-019-device-lifecycle-factory-reset-and-first-add-plan.md
  - Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-first-device-onboarding-and-setup-polish.md
---

## Objective
Polish the first-device onboarding flow for a brand-new signed-in owner so the path from tapping the add-device entry point through Wi-Fi setup, initial board settings, and “what happens next” feels clean, guided, and submission-quality.

## Why Now
This is one of the first real experiences a new customer will have after signing in. The technical setup path works, but the current flow still feels too raw in pacing, organization, and UI confidence. It should be the last major product-facing polish slice before the final iOS release-candidate build and submission prep.

## In Scope
- The signed-in no-device entry path into onboarding
- The first-device setup flow structure, pacing, and UI hierarchy
- The Wi-Fi setup flow presentation and continuity as part of onboarding
- The initial device-settings or first-setup completion experience immediately after claim
- “Next steps” guidance and completion messaging for a new owner
- Small copy, layout, and interaction cleanup directly tied to this first-device flow

## Out Of Scope
- Broad Wi-Fi recovery redesign outside the first-device flow
- Weekly minimum or history semantics
- Friends, OTA, or firmware feature work
- App Store metadata and submission work
- Broad home or settings redesign outside what is directly required for this setup journey

## Required Changes
- The add-device entry and first setup path must feel intentional and guided, not like a stitched technical flow
- Step order and progression must be clearer for a first-time owner
- The transition from setup into initial settings and normal use must feel more complete
- The flow must remain truthful to the real device/backend state; no fake completion shortcuts

## Verification Required
- `npm run typecheck`
- Exact files changed
- Metro + Simulator proof of the main onboarding surfaces
- Manual proof of the full intended first-device flow as far as possible in the current environment
- If any part still requires a real board for final proof, state exactly which part and why

## Success Definition
- A new signed-in owner can start first-device setup and understand what is happening at each step
- The first-time setup experience feels submission-quality instead of “working but raw”
- The app is ready for one final iOS RC build after this slice and any accepted findings from it
