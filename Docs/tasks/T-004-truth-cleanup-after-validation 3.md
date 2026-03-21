---
id: T-004
title: Truth cleanup after validation
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: docs
priority: medium
owner: Unassigned
depends_on:
  - T-001
  - T-002
  - T-003
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Firmware_V2_Architecture.md
  - firmware/README.md
  - services/realtime-gateway/README.md
  - supabase/README.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-docs-truth-cleanup-after-validation.md
---

## Objective
Fold implementation and validation outcomes back into the source-of-truth docs so the repo reflects reality.

## Why Now
The project becomes confusing again if task results stay in reports or chat instead of being synthesized back into the canonical docs.

## In Scope
- Update the coordination docs after the active tasks land.
- Reclassify workstreams as `Not Done`, `Implemented`, `Verified`, `Trusted`, or `Stale`.
- Update product and technical docs where behavior or project state changed.

## Out of Scope
- New product or infra work
- Reopening already accepted scope decisions without new evidence

## Required Changes
- Reconcile `AddOne_Main_Plan.md`, `Docs/Active_Work.md`, and the canonical spec with the latest reports.
- Update contract and implementation docs where validation disproves or confirms current wording.
- Mark completed tasks `Closed` only after their results are reflected in source-of-truth docs.

## Verification Required
- Manual doc audit against the task reports
- Link and path sanity check across active work, task briefs, and reports

## Success Definition
- Another agent can understand current repo truth without reading old chat.
- Completed tasks are reflected in both the dashboard and the canonical docs.
- No major workstream remains ambiguous between implemented, verified, and trusted.

## Open Risks
- If earlier reports are weak, the coordinator may need to reopen tasks instead of simply cleaning docs.
