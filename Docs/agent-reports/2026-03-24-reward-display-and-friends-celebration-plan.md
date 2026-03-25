---
task_id: T-024
title: Reward display and Friends celebration plan
date: 2026-03-24
agent: Codex
result_state: Planned
verification_state: Planned
changed_paths:
  - Docs/tasks/T-024-reward-display-modes-and-transition-foundation.md
  - Docs/tasks/T-025-custom-reward-artwork-editor-and-presets.md
  - Docs/tasks/T-026-ai-reward-artwork-generation.md
  - Docs/tasks/T-027-friends-ambient-celebration-playback.md
  - Docs/briefs/B-021-stage-s3-reward-display-transition-foundation.md
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Planning checkpoint complete. This records the new beta-scope reward-display expansion and the recommended execution order after the accepted Friends checkpoint.

## Current state

- The firmware already supports a bounded reward engine with two built-in reward types:
  - `clock`
  - `paint`
- The firmware renderer already knows how to draw:
  - a clock reward
  - a generic palette-based paint-wave reward
- The backend schema already has reward-artwork groundwork:
  - `devices.reward_artwork_id`
  - `reward_artworks`
- The app and repository do not yet expose reward-artwork selection, custom editing, AI generation, or friend-triggered ambient playback.
- The existing reward path does not yet have the reusable random dissolve transition the user wants.

## Recommended implementation order

1. `T-024` Reward display modes and transition foundation
- Add the reusable board-transition engine.
- Make the reward-display choice real in settings.
- Keep the first beta choice bounded to:
  - `Clock`
  - `Artwork`
- Use preset-backed artwork only in the first slice.

2. `T-027` Friends ambient celebration playback
- Reuse the same transition engine.
- Add bounded timing, cooldown, and opt-in rules.
- Do not add new social architecture.

3. `T-025` Custom reward artwork editor and presets
- Reuse the history-editing interaction model where it actually helps.
- Add color painting and save/apply behavior.

4. `T-026` AI reward artwork generation
- Only after the local artwork model is real.
- Treat provider choice and output formatting as an explicit scoped task, not a hidden implementation detail.

## Why this order

- The transition engine is the common dependency. Without it, both reward displays and friend-triggered playback would be one-off effects.
- The first beta win should be a visible configurable result with low ambiguity:
  - choose `Clock`
  - choose `Artwork`
  - see the board transition into that result after recording
- Friend-triggered playback depends on the same transition foundation and the already-accepted Friends implementation, so it is a better second slice than AI.
- AI generation is the highest-risk addition because it introduces provider choice, output constraints, latency, moderation, and voice-input questions. It should not block the first beta reward-display upgrade.

## Architecture direction

- Treat reward display as a real device setting, not a hidden implementation detail.
- Treat the random dissolve as a reusable board transition primitive on the device.
- Treat preset artwork as the first truth-backed `Artwork` mode.
- Treat AI generation as an app-to-cloud generation path that returns structured 8x21 artwork data. Do not try to make the device generate artwork.
- Treat friend celebration playback as a temporary overlay on the physical board with explicit cooldown and return-to-owner-board rules.

## Open decisions

- Where the reward-display selector should live in settings:
  - routine-related
  - board appearance
  - or a dedicated celebration/reward section
- Which 3 beta artwork presets best fit AddOne's audience.
- Exact default timings:
  - delay before transition
  - dwell time on the reward screen
  - dwell time on a friend board reveal
- Whether Android parity matters for every configuration surface in the first slice or only for the final shipped path.

## Recommendation

Start with `T-024`. It is the lowest-risk slice that unlocks the rest of this feature family and creates a real beta-visible upgrade without dragging AI and social-event playback into the same implementation pass.
