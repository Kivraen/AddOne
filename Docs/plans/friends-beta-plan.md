# Friends Beta Planning Checkpoint

## Purpose

This document is the durable checkpoint for the `Friends` / social direction inside `S3`.
It exists so the repo stops treating the section as a pile of ideas and starts treating it as a staged product plan.

## Why This Needs Its Own Planning Slice

`Friends` is not just a tab redesign.
It touches:
- product meaning
- identity model
- sharing and permission model
- backend capabilities
- future community direction
- what is intentionally in beta versus intentionally deferred

Because of that, the first step is to lock the plan before implementation.

## Current Known Product Intent

The current user intent is:
- people should be able to link with each other deliberately
- people should be able to browse friends' boards and recent progress
- first beta should include some lightweight sense of community, not only passive viewing
- post-beta should preserve a path toward shared-goal challenges and group communication

## Current Technical Starting Point

The repo already has sharing primitives that are useful for a first beta:
- shared boards fetch
- share code rotation
- pending access requests
- approve / reject request
- viewer list

The repo does **not** yet have a locked social layer for:
- reactions
- activity feed
- comments / threads
- challenge groups
- richer public identity

Current identity reality:
- backend already has `profiles.display_name`
- a richer public identity model is not yet locked

## Recommended First-Beta Direction

The current recommended direction is:

1. Keep the connection model deliberate and private.
   - Use code/invite plus approval style linking.
   - Do not turn first beta into a broad public social graph.

2. Make friend-board browsing the core surface.
   - A user should be able to move between connected friends and see board progress clearly.
   - This is the baseline value even before deeper interaction exists.

3. Add one bounded social floor.
   - Recommended target: lightweight activity lane plus lightweight reactions.
   - This is stronger than passive board viewing.
   - This is still much smaller than comments, threads, or chat.

4. Explicitly defer heavier community systems from first beta.
   - threaded comments
   - full messaging
   - open-ended notifications
   - challenge groups

## Decision Set Still To Lock

These decisions should be answered explicitly during the planning task:

### 1. Beta social floor

Choose one:
- board browsing only
- board browsing plus lightweight activity lane and reactions
- board browsing plus comments / threads

Current recommendation:
- board browsing plus lightweight activity lane and reactions

### 2. Connection model

Choose one:
- private linked-circle model
- broader follower / viewer model

Current recommendation:
- private linked-circle model

### 3. Identity surface

Choose one:
- `display_name` only
- `username`
- `display_name + username`
- richer name model later

Current recommendation:
- keep beta identity minimal unless the social flow becomes confusing without one more field

### 4. Activity detail granularity

Choose what a friend can see in first beta:
- board-only progress
- board plus recent check-in events
- board plus recent check-in events and reaction targets

### 5. Backend strategy

Lock whether first beta can ride mostly on the current sharing primitives plus one narrow extension, or whether a larger backend contract is required.

## Post-Beta Direction To Preserve

The beta implementation should not block this later direction:
- shared-goal challenge groups
- a group board where brightness / intensity reflects how many members completed on that day
- communication around the shared challenge

This is a distinct later layer, not something to smuggle into first beta accidentally.

## Technology Strategy Guardrails

- Do not build bespoke messaging infrastructure casually for first beta.
- Prefer reliable managed backend paths and battle-tested Expo-compatible libraries when richer communication is truly in scope.
- Reuse the current AddOne sharing contract where possible before inventing a parallel social model.

## Recommended Execution Order

1. `T-015` friends beta planning and model lock
2. `T-001` friends beta surface and social floor implementation
3. `T-013` challenge groups and shared-board model
4. `T-008` onboarding and Wi-Fi recovery polish as the final visible UI polish slice

## Success Criteria For The Planning Slice

- A fresh agent can explain exactly what first beta `Friends` is.
- Beta versus later scope is explicit.
- The backend starting point and likely gaps are explicit.
- The implementation can be split safely without inventing architecture mid-task.
- The later challenge-group direction is preserved without forcing it into beta.
