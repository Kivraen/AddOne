---
task_id: T-027
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
  - Docs/briefs/B-022-stage-s3-friends-ambient-celebration-and-transition.md
  - Docs/tasks/T-028-beta-security-and-production-readiness-audit.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Planning checkpoint complete. This records the adjusted beta-scope plan after the accepted Friends checkpoint and the later hardening topics the user wants preserved for release work.

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

1. `T-027` Friends ambient celebration playback and transition foundation
- Add the reusable board-transition engine first.
- Use it immediately for the connected-friend board reveal.
- Add bounded timing, cooldown, and opt-in rules.
- Do not add new social architecture.

2. `T-024` Reward display modes after transition foundation
- Make the reward-display choice real in settings.
- Keep the first reward-display choice bounded to:
  - `Clock`
  - `Artwork`
- Use preset-backed artwork only in the first reward slice.

3. `T-025` Custom reward artwork editor and presets
- Reuse the history-editing interaction model where it actually helps.
- Add color painting and save/apply behavior.

4. `T-026` AI reward artwork generation
- Only after the local artwork model is real.
- Treat provider choice and output formatting as an explicit scoped task, not a hidden implementation detail.

5. `T-028` Beta security and production readiness audit
- First `S4` hardening priority once the active product-shape work is explicit enough.

6. `T-029` App and firmware update strategy
- Define automatic-update defaults, user control boundaries, and rollback expectations before wider distribution.

## Why this order

- The transition engine is the common dependency. Without it, both reward displays and friend-triggered playback would be one-off effects.
- The friend-triggered playback is now the better immediate beta-visible win because it builds directly on the already-accepted Friends flow and avoids pulling reward settings, artwork selection, and editor UX into the same slice.
- Reward-display choice still matters, but it can land cleanly after the transition primitive exists.
- AI generation is still the highest-risk addition because it introduces provider choice, output constraints, latency, moderation, and voice-input questions. It should not block the first transition-based slice.
- Security review and update strategy are more important than extra reward breadth, but they belong to the release-hardening stage rather than this current S3 implementation slice.

## Architecture direction

- Treat the random dissolve as a reusable board transition primitive on the device.
- Treat friend celebration playback as the first consumer of that primitive.
- Treat reward display as a later real device setting, not a hidden implementation detail.
- Treat preset artwork as the first truth-backed `Artwork` mode when that later slice lands.
- Treat AI generation as an app-to-cloud generation path that returns structured 8x21 artwork data. Do not try to make the device generate artwork.
- Treat friend celebration playback as a temporary overlay on the physical board with explicit cooldown and return-to-owner-board rules.
- Treat security hardening and update strategy as explicit release work with their own tasks, not as vague later cleanup.

## Open decisions

- Where the later reward-display selector should live in settings:
  - routine-related
  - board appearance
  - or a dedicated celebration/reward section
- Which 3 beta artwork presets best fit AddOne's audience.
- Exact default timings:
  - delay before transition
  - dwell time on the reward screen
  - dwell time on a friend board reveal
- Whether Android parity matters for every configuration surface in the first slice or only for the final shipped path.
- Which update path should be automatic by default for:
  - mobile app
  - firmware
- Which parts of the current beta stack need hardening before wider friend-device distribution.

## Recommendation

Start with `T-027`. It is the cleanest next S3 slice: add the transition primitive and use it immediately for the connected-friend board reveal. Keep reward-display breadth for the next pass, and treat security plus update strategy as the first explicit `S4` priorities once the current UI stage is explicit enough to hand off.
