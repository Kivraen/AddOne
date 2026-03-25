---
id: T-025
title: Custom reward artwork editor and presets
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-024
owned_paths:
  - app/(app)/devices
  - components
  - hooks
  - lib/supabase
  - types/addone.ts
  - firmware/src
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
---

## Objective
Add a real reward-artwork library and manual editor so users can choose a preset or draw their own 8x21 reward board with color selection.

## Why Now
Once the beta reward-display model and transition foundation exist, the next meaningful expansion is user-owned artwork. The repo already has reward-artwork schema groundwork, and the existing history editor proves there is a workable pixel-grid editing pattern to adapt.

## In Scope
- Curate the first small preset library for beta.
- Add a manual artwork editor reusing the best parts of the history-editing interaction model.
- Add per-pixel color painting with a bounded beta palette.
- Let the user save and apply the chosen artwork as the active reward screen.

## Out Of Scope
- AI generation
- Friend-triggered playback
- Broad gallery or sharing model for artwork

## Verification Required
- manual proof of:
  - selecting a preset
  - drawing custom art with color choice
  - saving and applying artwork
  - the board showing the saved artwork after a real reward trigger

## Open Risks
- The editor can become heavy if it copies too much of the existing history-editing complexity.
- Preset curation needs taste discipline so the beta art feels intentional instead of novelty-first.
