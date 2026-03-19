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
- The reusable resident UI-agent brief lives in [B-003-stage-s3-resident-ui-agent.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/briefs/B-003-stage-s3-resident-ui-agent.md).

## Issue Buckets

### Main screen and settings

- The main screen and settings are close, but they still need a coordinated polish pass instead of one-off tweaks.
- The dedicated `/history` route still exists while the inline board editor from device settings is the more surfaced path.
- The shipped beta surface still needs a small-issues sweep around hierarchy, interaction clarity, and what belongs to the board context versus account context.
- The rotating dashboard note above the main button should stay fixed-height in its collapsed state so message changes never shift the primary action; future expansion should promote that area into a larger information surface instead of reflowing the home control.
- Settings apply controls should read as compact material actions inside the shell, not oversized CTA pills; header and in-card apply states should share restrained sizing and typography.
- Settings should resolve successful Apply quietly; transient success copy under the header is not needed for the current beta surface, and only errors should interrupt the layout.
- Routine settings should separate habit, cadence, and time concerns more clearly; the weekly target uses a small bounded range and should stay compact instead of using an oversized picker treatment.

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

### Time zones and calendar behavior

- Timezone behavior already exists across onboarding, settings, recovery, runtime projection, and firmware, but the beta model is not explicit enough yet.
- Current app-side reality:
  - onboarding defaults the device timezone from the phone
  - recovery defaults bootstrap timezone from the current device timezone or the phone timezone
  - routine settings still use a raw IANA text input plus a `Use phone timezone` shortcut
- Current product decision still needed:
  - whether the device should always keep its own canonical timezone for reset and schedule behavior
  - whether "view in another timezone" is a separate reader preference instead of the same device setting
  - how timezone selection should work in the app:
    - searchable picker/list
    - raw text fallback or not
    - unsupported-zone handling
- Current firmware reality:
  - the firmware only maps `UTC`, `Etc/UTC`, `America/Los_Angeles`, `America/Denver`, `America/Chicago`, and `America/New_York`
  - that means the current stack is not universal yet even though the app stores arbitrary IANA timezone strings
- We need a deliberate audit of:
  - default-from-phone behavior
  - explicit override behavior
  - DST correctness
  - list-of-choice UX
  - app -> backend -> realtime -> firmware sync
  - unsupported-zone fallback and messaging

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
- Decide the beta timezone model:
  - device timezone versus viewer timezone
  - default behavior
  - manual override behavior
  - unsupported-zone behavior
- Decide the first implementation batch order across:
  - timezone model and universal flow audit
  - main screen and settings polish
  - onboarding and Wi-Fi recovery polish
  - profile identity
  - friends beta surface

## Next Split Candidates

- `T-006` timezone model and universal flow audit
- `T-007` main screen and settings polish batch
- `T-008` onboarding and Wi-Fi recovery polish batch
- `T-009` profile identity model and account surface batch
- `T-010` friends beta surface and connection flow batch
