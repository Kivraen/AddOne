---
id: T-027
title: Friends ambient celebration playback
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-001
  - T-024
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
Use the new transition engine to briefly reveal a connected friend's board on the physical device after that friend records a habit, then return cleanly to the owner's board.

## Why Now
The user wants a strong social "wow" effect in beta, but it should build on an already-trusted transition engine and an already-accepted Friends foundation rather than introducing both at once.

## In Scope
- Define the friend-triggered playback rule.
- Add bounded timing, cooldown, and opt-in behavior.
- Use the same transition engine as reward-display mode changes.

## Out Of Scope
- New Friends sharing architecture
- Feed, messaging, reactions, or challenge-group scope

## Open Risks
- Device-side timing and realtime reliability need explicit cooldown rules so the effect feels magical rather than chaotic.
- This feature depends on the existing Friends realtime path being good enough for small ambient events.
