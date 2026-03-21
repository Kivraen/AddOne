---
id: T-005
title: Beta UI audit and scope lock
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: app
priority: high
owner: Codex
depends_on: []
owned_paths:
  - app/(app)
  - components/app
  - components/settings
  - hooks
  - lib/supabase/addone-repository.ts
  - types/addone.ts
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-18-app-beta-ui-audit-and-scope-lock.md
---

## Objective
Capture the real visible beta UI gaps and lock the decision space enough that the next UI implementation work can be split into narrow, grounded tasks.

## Why Now
The app is close but not finished. Several high-surface areas still need polish or product decisions:
- main screen and settings details
- onboarding and Wi-Fi recovery quality
- profile identity model
- friends beta shape

Trying to implement all of that ad hoc would create churn and contradictory work.

## In Scope
- Create and maintain the durable UI issue log.
- Audit the visible current surfaces and note the real gaps.
- Lock the first-user beta decision space where possible.
- Identify the next implementation batches and the order they should happen.
- Ensure the UI stage explicitly requires the `building-native-ui` skill.

## Out of Scope
- Full implementation of every UI gap in one task
- Broad backend or schema redesign
- Infra validation or real-device validation execution
- Release hardening

## Required Changes
- Update the stage note and issue log so the current UI work is explicit.
- Reprioritize the active stage if the product direction changed.
- Prepare at least one copy-paste brief for the next UI-stage task.
- Record what is still undecided instead of hiding contradictions.

## Verification Required
- Real code references for the currently incomplete surfaces
- Doc sanity check across main plan, stage register, active work, and issue log
- Dashboard data regeneration after the doc updates

## Success Definition
- Another agent can see what is wrong with the current beta UI without reading chat.
- The next UI implementation batch is obvious enough to delegate safely.
- The user can keep adding issues into a durable repo doc instead of restating them from memory.

## Open Risks
- The friends beta shape may still need direct user decisions before implementation starts.
- Profile identity might require a schema update if the v1 model expands beyond `display_name`.
