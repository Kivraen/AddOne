---
id: T-019
title: Device lifecycle factory reset and first add-flow plan
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-008
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/ui-beta-issue-log.md
  - app/(app)/onboarding
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings/index.tsx
  - firmware/src
  - hooks/use-onboarding.ts
  - hooks/use-setup-flow-controller.ts
  - lib/device-ap-client.ts
  - lib/device-recovery.ts
  - lib/onboarding-restore.ts
  - lib/setup-flow.ts
  - lib/supabase/addone-repository.ts
  - supabase/migrations
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
  - Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md
  - Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-22-device-lifecycle-factory-reset-and-first-add-plan.md
---

## Objective
Research and lock the intended end-to-end device lifecycle for beta: factory flash or preregistration, first customer onboarding, first habit setup, destructive factory reset and remove, and fresh re-add as new hardware.

## Why Now
The app, firmware, and backend now have real onboarding, recovery, and reset-history behavior, but the destructive reset plus fresh-add path is still only partially planned. Before the next implementation slice, we need one explicit planning checkpoint that explains the current system, the desired user flow, and the implementation gaps.

## In Scope
- Research the current factory flash or preregistration path
- Research how the device record reaches the backend today
- Research how claim, ownership, Wi-Fi provisioning, and onboarding settings flow through the app, backend, and firmware
- Plan the first-habit creation portion of first-time onboarding
- Plan the destructive `Factory reset and remove` path
- Plan the post-removal fresh add flow as if the device were new hardware again

## Out Of Scope
- Implementing the plan
- Broad UI redesign outside what is necessary to explain the target flow
- Friends work
- Release-hardening or infra cleanup unrelated to the device lifecycle

## Required Changes
- Produce a durable planning report that explains:
  - current lifecycle behavior
  - target beta lifecycle behavior
  - data recorded at each step
  - user-facing flow at each step
  - missing implementation pieces
  - recommended implementation order
- If product or contract docs need narrow clarifications to support the planning checkpoint, update only the scoped docs named above.

## Verification Required
- Exact code and doc references for the current lifecycle as implemented
- Clear separation between:
  - current reality
  - proposed target behavior
  - still-open decisions
- Explicit next-step recommendation for implementation

## Success Definition
- A fresh agent can understand how a device should move from factory state to owned state and back to fresh state again without relying on chat memory.
- The user can review the target add-device and reset lifecycle in planning mode before implementation begins.
- The later implementation task can stay narrow because the lifecycle decisions are already explicit.

## Open Risks
- Some factory-flash assumptions may be partly implicit in firmware or backend helpers rather than fully documented today.
- The first-habit setup flow may require new product decisions about timing, copy, and defaults even if the technical path is already clear.
