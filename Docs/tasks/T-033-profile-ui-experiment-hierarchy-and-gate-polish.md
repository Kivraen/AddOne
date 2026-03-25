---
id: T-033
title: Profile UI experiment hierarchy and gate polish
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-009
  - T-001
  - T-032
owned_paths:
  - app
  - components/app
  - components/ui
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/AddOne_UI_Direction.md
  - Docs/agent-reports/2026-03-25-profile-ui-audit-and-redesign-plan.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-profile-ui-experiment-hierarchy-and-gate-polish.md
---

## Objective
Run a narrow, reversible Profile experiment that fixes hierarchy, gate clarity, and copy density without changing the accepted social-identity or auth model.

## Why Now
Friends already routes incomplete users into Profile. If Profile is still noisy or admin-first, it blocks the next round of UI polish and makes the Friends main-tab experiment harder to judge honestly.

## In Scope
- Make the `from=friends` gate path one obvious completion flow.
- Put social identity above account context.
- Reduce repeated helper and status copy.
- Demote sign-out and auth-only account context without hiding them.
- Keep the implementation narrow and easy to discard if the experiment fails.

## Out Of Scope
- Auth redesign
- Backend schema changes
- New profile features
- Broad Friends redesign
- Home, onboarding, or settings redesign

## Open Risks
- Over-polishing the screen could accidentally widen the task into a full account-management redesign.
- If gate-mode and steady-state mode stay too coupled, the experiment may only partially solve the clarity problem.
