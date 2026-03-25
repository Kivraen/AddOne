---
id: T-032
title: Profile UI audit and redesign plan
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-009
  - T-001
owned_paths:
  - app
  - components/app
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-profile-ui-audit-and-redesign-plan.md
---

## Objective
Audit the current Profile surface, decide whether it should be cleaned up before the planned Friends UI experiment, and define a narrow redesign direction that preserves the accepted social-identity model.

## Why Now
The Friends flow already routes incomplete users through Profile. If Profile is visually dense, administratively framed, or unclear about the next required action, that friction distorts the Friends experience and makes later Friends polish harder to evaluate honestly.

## In Scope
- Review Profile hierarchy, gate flow, copy density, and account-versus-identity separation.
- Compare the current Profile surface against the AddOne UI direction.
- Decide whether Profile should be cleaned up before the Friends UI experiment.
- Produce a narrow redesign recommendation, not a broad account-system rethink.

## Out Of Scope
- Auth redesign
- New profile schema or backend architecture
- Broad Friends architecture changes
- Onboarding or settings redesign outside small shared-shell observations

## Open Risks
- The accepted identity model is correct functionally, but the current screen can still feel admin-first instead of action-first.
- If the gate path and the steady-state profile-management path stay visually mixed together, later polish work will keep fighting the same confusion.
