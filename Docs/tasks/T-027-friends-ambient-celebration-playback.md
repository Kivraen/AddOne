---
id: T-027
title: Friends ambient celebration playback and transition foundation
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - app
  - components/app
  - hooks
  - lib/supabase
  - services
  - firmware/src
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
---

## Objective
Add one reusable board-transition primitive and use it to briefly reveal a connected friend's board on the physical device after that friend records a habit, then return cleanly to the owner's board.

## Why Now
The user wants one more strong beta-visible moment without broadening the social product. This is now the preferred next slice because it builds directly on the already-accepted Friends flow and creates the shared transition foundation that later reward-display work can reuse.

## In Scope
- Add one reusable board transition where:
  - current pixels disappear randomly
  - destination pixels appear randomly
- Make that transition reusable for later reward-display work.
- Define the friend-triggered playback rule.
- Add bounded timing, cooldown, and opt-in behavior.

## Out Of Scope
- Reward display selection UI
- Custom artwork editing
- AI artwork generation
- New Friends sharing architecture
- Feed, messaging, reactions, or challenge-group scope

## Open Risks
- Device-side timing and realtime reliability need explicit cooldown rules so the effect feels magical rather than chaotic.
- This feature depends on the existing Friends realtime path being good enough for small ambient events.
- If the transition implementation is too tightly coupled to friend playback, later reward-display work will be harder instead of easier.
