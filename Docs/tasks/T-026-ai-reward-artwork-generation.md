---
id: T-026
title: AI reward artwork generation
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-024
  - T-025
owned_paths:
  - app
  - components
  - hooks
  - lib
  - supabase
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
---

## Objective
Add a bounded AI workflow that turns a short user prompt into valid 8x21 reward artwork suitable for the device.

## Why Now
AI generation is a strong beta differentiator, but it should land only after the artwork data model, transition engine, and manual editor are real. That avoids mixing product discovery, provider selection, and rendering correctness into the same first slice.

## In Scope
- Choose the beta AI generation architecture.
- Define the prompt contract and output format for 8x21 artwork.
- Add the user flow for entering or dictating a prompt and saving the generated result.

## Out Of Scope
- Shipping AI before the local artwork model is real
- Broad image-generation product expansion beyond reward artwork

## Open Risks
- Provider choice, cost, moderation, and latency need explicit product decisions.
- Voice input and image generation should not be coupled into the first executable slice.
