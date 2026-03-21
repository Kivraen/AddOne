# Friends Beta Planning Checkpoint

Last updated: March 19, 2026

## Purpose

This document is the durable planning checkpoint for the `Friends` / social direction inside `S3`.
It exists so the repo stops treating `Friends` as a loose cluster of ideas and starts treating it as a product plan with:
- explicit beta-now scope
- explicit future-social scope
- explicit future-challenge guardrails

## Why This Needs Its Own Planning Slice

`Friends` is not just a tab redesign.
It touches:
- product meaning
- profile identity
- sharing and permission model
- backend capabilities
- the quiet/device-first brand promise
- the future challenge direction

Because of that, the first step is to lock the plan before implementation.

## Product Principles To Protect

- The device remains the main daily ritual.
- The shared object is the unit/grid, not a broad public social profile.
- Social should reinforce the habit, not turn AddOne into a noisy social app.
- The personal board remains the default truth-view for the device.
- Future challenges must not silently replace the personal board by accident.

## Planning Outcome

### Beta now

First beta `Friends` should mean:
- a private, deliberate, unit-based sharing flow
- owner-managed share access through one active rotatable code per device
- approval before another user can view a board
- read-only live board browsing for approved shared boards
- a friend-facing social profile gate before the `Friends` surface unlocks

### Future social

Do not block these future directions:
- app-level activity log across connected boards
- lightweight reactions
- comments
- optional push notifications

These are future improvements, not the initial beta implementation target.

### Future challenges

Do not block these future directions:
- shared-goal challenges
- a challenge board whose color intensity reflects how many members completed a day
- communication around the shared challenge

Challenges remain a separate later layer, not something to smuggle into first beta.

## Current Technical Starting Point

The repo already has useful sharing primitives:
- shared boards fetch
- share code rotation
- pending access requests
- approve / reject request
- viewer list
- those primitives are now sufficient for the first Friends implementation slice; `T-001` did not need a new backend schema or new RPC set

The repo also already has a basic profile starting point:
- `profiles.display_name`
- `profiles.avatar_url`

The repo does **not** yet have a locked beta implementation for:
- reactions
- activity feed
- comments / threads
- challenge groups

## First-Beta Model Lock

### 1. Shared object and identity model

- The thing being shared is the unit/grid.
- The person still needs a friend-facing identity in the app.
- Email remains the auth credential, not the friend-facing label.
- `Friends` should unlock only after the user completes a social profile.

Recommended beta social profile:
- required `first_name`
- required `last_name`
- required unique `username`
- optional profile photo selected through native library/camera flows

`display_name` should remain the derived storage field, with `first_name + last_name + @username` as the intended beta social identity surface.

### 2. Auth strategy

- Keep `email OTP` as the sign-in method for beta.
- Do not redesign auth just to support `Friends`.
- Social profile setup should happen after sign-in, when the user first tries to use `Friends`, not as part of the core device onboarding flow.

### 3. Connection and permission model

Recommended beta connection model:
- one active share code per device
- owner can rotate the code at any time
- another signed-in user enters the code to request access
- owner approves or rejects the request
- approved viewers keep access until revoked

Why this is the right beta floor:
- it matches the existing backend contract
- it keeps sharing private and deliberate
- it avoids broad user search and spam-request problems
- it fits the unit-based product model better than a follower graph

What beta should **not** do:
- open username search or discovery
- allow unsolicited request spam through public profile lookup
- replace device-scoped sharing with a broad social graph

### 4. First-beta social floor

The first-beta social floor is now intentionally smaller than the earlier draft:
- share boards
- request boards
- approve / reject access
- browse connected boards live when possible

The first beta should **not** include:
- reactions
- comments
- activity feed
- push notifications

Those remain future-social improvements that should influence the design, but not the first implementation slice.

## Future Challenge Direction To Preserve

Challenges are future-facing, but a few model guardrails are now important enough to record:

- A challenge is a separate product object from private board sharing.
- Joining a challenge should start from the moment the user joins, not rewrite prior personal history into the challenge.
- Each participant keeps their own weekly success / fail outcome.
- The challenge board can reflect other members' completion through dimmer or partial tones on days the current user did not complete.
- The current user's own completion remains the strongest / full-intensity state in that view.
- Any challenge representation should not silently replace the personal board by default.
- If challenge ever reaches the device surface, it likely needs an explicit mode or separate view instead of overriding the main habit board.

Open future challenge questions to preserve:
- whether challenge participation is app-first only or ever device-visible
- whether one active challenge per user is the rule
- how multiple simultaneous challenges would fit a `single-habit` product without creating product drift

## Likely Backend And Product Gaps That Remain

### Current backend starting point

- The current sharing model is already device-based and approval-based.
- The current profile model already supports `display_name` and `avatar_url`.

### Likely next gaps

1. Social profile extension
- Add a unique `username`.
- Keep email private and out of friend-facing UI.
- Decide whether `first_name` and `last_name` are stored separately or only reflected inside `display_name`.

2. Profile completion flow
- Add a `Friends` entry gate that routes incomplete users to profile setup.

3. Share management polish
- The one-code-per-device model is good for beta, but later share-link polish may still be useful.

4. Future-social layer
- Activity feed, reactions, comments, and optional push notifications all remain future additions and should not be casually pulled into the beta backend.

5. Future-challenge layer
- Challenge entities, membership, join timing, tone rules, and any on-device representation remain future model work.

## Technology Strategy Guardrails

- Do not build bespoke messaging infrastructure casually for beta.
- Reuse the current AddOne sharing contract where possible.
- Use usernames for identity, not for open discovery in beta.
- Keep challenge planning explicit so `Friends` beta does not accidentally force the wrong future architecture.

## Recommended Execution Order

1. `T-015` friends beta planning and model lock
2. `T-009` profile identity model and social-profile gate
3. `T-001` friends beta surface and unit-sharing implementation
4. `T-013` challenge groups and shared-board model
5. `T-008` onboarding and Wi-Fi recovery polish as the final visible UI polish slice

## Explicit Answers For S3 Acceptance

- First-beta connection model: one active rotatable share code per device, owner approval required, approved viewer access after acceptance.
- First-beta social floor: social-profile-gated board sharing and live read-only browsing of approved shared boards.
- Deferred: username search, activity feed, reactions, comments, push notifications, and challenge groups.
- Likely backend/library gaps remain: unique username support, profile completion UX, and future-only social/challenge model work.

## Success Criteria For The Planning Slice

- A fresh agent can explain exactly what first-beta `Friends` is.
- Beta versus later scope is explicit.
- The profile strategy and sharing strategy are explicit.
- The challenge direction is preserved without being dragged into beta implementation.
- The implementation can be split safely without inventing social architecture mid-task.
