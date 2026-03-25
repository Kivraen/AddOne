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
  - app/(app)
  - components/app
  - hooks
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/AddOne_UI_Direction.md
  - Docs/briefs/B-023-stage-s3-ui-skill-informed-beta-ui-audit.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-profile-ui-audit-and-redesign-plan.md
---

## Objective
Run a dedicated read-only audit of the current Profile surface, then turn that into a concrete redesign plan for a cleaner, calmer, more AddOne-native account and identity experience.

## Why Now
The UI audit already showed that Profile is one of the main drift points. It is denser, more admin-first, and more form-heavy than the rest of the app. Before redesigning it, we want one explicit profile-only audit instead of folding it into a broader polish pass.

## In Scope
- Audit the current Profile surface only.
- Focus on:
  - first-glance hierarchy
  - profile gate behavior
  - form density
  - account vs social-identity separation
  - CTA clarity
  - helper-copy overload
  - visual rhythm and consistency with the rest of the app
- Produce a concrete redesign recommendation with priorities.

## Out Of Scope
- Implementing the redesign
- Reworking auth
- Changing Friends architecture
- Broad Home, Settings, onboarding, or recovery redesign

## Required Changes
- Compare the current Profile implementation against:
  - AddOne UI direction
  - local Expo-native UI guidance
  - any technical UI issues that materially affect the Profile experience
- Distinguish what should be:
  - simplified
  - removed
  - deferred
  - preserved

## Verification Required
- Inspect the current Profile routes and components directly from code.
- Use code references, not only opinion.
- Produce a redesign plan that could later become an implementation brief.

## Success Definition
- We have one durable profile-only audit with a concrete redesign direction.
- The plan explains why Profile currently feels wrong and what should change first.
- The audit is narrow enough to compare against the Friends experiment without mixing concerns.

## Open Risks
- Profile can easily become a generic account form if the redesign ignores AddOne’s board-first product shape.
- Over-correcting the current density could hide necessary account and identity state if the hierarchy is not explicit.
