# AddOne Beta UI Issue Log

Last updated: March 18, 2026

This is the live issue and decision log for `S3: Beta UI Completion And Social Shape`.
Use it to capture:
- visible UX gaps
- unresolved product decisions
- low-risk polish work
- stage-splitting ideas for future implementation briefs

## Working Rules

- This log is durable memory, not scratch chat.
- Every UI task in this stage must use `.agents/skills/building-native-ui/SKILL.md`.
- Keep issue notes lightweight, explicit, and easy to turn into task briefs.
- Split execution only after the issue or decision is explicit enough that an agent can finish and report clearly.

## Issue Buckets

### Main screen and settings

- The main screen and settings are close, but they still need a coordinated polish pass instead of one-off tweaks.
- The dedicated `/history` route still exists while the inline board editor from device settings is the more surfaced path.
- The shipped beta surface still needs a small-issues sweep around hierarchy, interaction clarity, and what belongs to the board context versus account context.

### Onboarding

- The onboarding flow is real and guided, but it is still a state-dense step flow that needs polish around copy, pacing, and error handling.
- We need a deliberate pass on:
  - Wi-Fi scan results and hidden-network fallback
  - waiting-for-device messaging
  - success states and handoff into the main board
  - native-feeling step transitions and field ergonomics

### Wi-Fi recovery

- Wi-Fi recovery is implemented, but it still needs a trust pass on reconnect messaging, timeout clarity, and the manual-entry path.
- We should explicitly review:
  - when the user is told to join the AP
  - how reconnect progress is communicated
  - what happens when the AP is not reachable
  - what the post-recovery success state should feel like

### Profile and identity

- The current profile surface is only:
  - email or demo session state
  - sign out
- Decision still needed for first-user beta identity shape:
  - `display_name` only
  - `username` only
  - `first_name + last_name + username`
- Current backend reality:
  - the repo already has `profiles.display_name`
  - no richer public identity model is locked yet

### Friends and social beta

- The `Friends` tab is visible, but it is still placeholder UI.
- The backend already has sharing primitives:
  - shared boards fetch
  - share code rotation
  - pending access requests
  - approve / reject request
  - viewer list
- The product shape is still not locked. We need to choose the first-user beta model deliberately:
  - code-based connection only or something broader
  - whether the first pass is read-only shared boards plus approval flow
  - whether "friends" actually means shared boards and viewers, not a social feed
- The infrastructure for a broader social layer is not locked and should not be invented casually during UI implementation.

### Cross-cutting UI quality

- Every UI pass should respect the existing AddOne shell:
  - black-glass minimal look
  - board-first hierarchy
  - native tab and scroll behavior
  - focused account versus device boundaries
- Do not treat the visible tab shell as final just because it already navigates.

## Immediate Decisions To Lock

- Decide the first-user beta identity model for profile and friend-facing display.
- Decide the first-user beta meaning of `Friends`.
- Decide the real shipped history-editing entry path.
- Decide the first implementation batch order across:
  - main screen and settings polish
  - onboarding and Wi-Fi recovery polish
  - profile identity
  - friends beta surface

## Next Split Candidates

- `T-006` main screen and settings polish batch
- `T-007` onboarding and Wi-Fi recovery polish batch
- `T-008` profile identity model and account surface batch
- `T-009` friends beta surface and connection flow batch
