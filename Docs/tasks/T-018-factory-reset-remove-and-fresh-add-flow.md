---
id: T-018
title: Factory reset remove and fresh add-flow validation
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-008
owned_paths:
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - app/(app)/onboarding
  - components/setup
  - hooks/use-devices.ts
  - hooks/use-onboarding.ts
  - hooks/use-setup-flow-controller.ts
  - lib/device-ap-client.ts
  - lib/device-recovery.ts
  - lib/device-routes.ts
  - lib/onboarding-restore.ts
  - lib/setup-flow.ts
  - lib/supabase/addone-repository.ts
  - firmware/src
  - supabase/migrations
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/ui-beta-issue-log.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
  - Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-22-factory-reset-remove-and-fresh-add-flow.md
---

## Objective
Implement and validate the destructive full factory-reset path so the device can be removed from the current account, have its credentials and claim state cleared, and then be added again as fresh hardware.

## Why Now
The March 22 recovery slice stabilized onboarding, recovery, wrong-password retry, and `Reset history` as `Start new habit`. That slice deliberately deferred the destructive version of reset. The next bounded step is to make the full remove-and-reset path trustworthy before broader onboarding polish continues.

## In Scope
- Destructive factory-reset UX and confirmation behavior
- Backend/account removal behavior after reset acknowledgement
- Firmware/device behavior needed to clear Wi-Fi and ownership state
- Fresh post-removal add-device validation from the app
- Real hardware proof of the full destructive path

## Out Of Scope
- Further Friends work
- Broad onboarding redesign unrelated to destructive reset
- Archive or era-browsing UI
- General backend cleanup beyond what the destructive reset path requires

## Required Changes
- Implement or tighten the full factory-reset flow from app through backend and firmware.
- Ensure the device is removed from the signed-in account once destructive reset succeeds.
- Ensure the board clears Wi-Fi credentials and claim state as intended for fresh hardware.
- Validate that the add-device flow works again after destructive reset and removal.
- Record any residual blockers crisply instead of widening the task into general recovery refactors.

## Verification Required
- Live hardware proof of destructive reset trigger and device-side acknowledgement
- Proof that the device disappears from the current account or owned-device list
- Proof that the device can be added again afterward as a fresh board
- `npm run typecheck` if app code changed
- Firmware build and upload proof if firmware changed
- Scoped product-doc and issue-log sanity check for any changed destructive-reset semantics

## Success Definition
- A user can fully remove and reset a device from the app without leaving ghost ownership behind.
- The board behaves like new hardware after destructive reset.
- The next onboarding pass can proceed from a trustworthy remove-and-readd baseline instead of guesswork.

## Open Risks
- This task depends on live hardware and the hosted beta path behaving consistently during destructive reset.
- If account removal or claim cleanup is asynchronous, the task must document the exact timing model instead of hand-waving it.
