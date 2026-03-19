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
- The home header currently duplicates device status: offline state already appears in the top-right recovery affordance, and healthy state does not gain much from repeating `Next reset at midnight`; the secondary line under the title should either disappear in the calm/default state or become an exception-only trust lane for things like verifying, stale data, or recovery-needed states.
- Beta habit identity should stay intentionally short: onboarding and `Routine` settings should collect a defaultable one-line habit name plus an optional one-line minimum-goal phrase, and the home subtitle should use that minimum-goal line in the calm state instead of redundant status copy. For now the minimum-goal text is app-side metadata, not a device/runtime setting.
- The home connection affordance should not jump straight from live to a Recovery CTA on the first stale poll. Keep a subtle pulsing live-style indicator first, and only surface Recovery after the device looks confirmed offline.
- History edit mode should use the same connection grace logic as home instead of gating directly on raw `isLive`. During the grace window it should check quietly in the background and avoid premature offline alarms; only once the board looks confirmed offline should it switch to the unavailable state with explicit `Back` and `Refresh` actions.
- History edit mode should not flash portrait or offline helper copy while the route is still rotating into landscape. Keep the rotation transition visually quiet, then reveal either the editor or the real fallback state once orientation settles.
- The tab shell should not flash the global amber fallback while the active device is still restoring; selected tab tint should stay neutral until the device accent is known, then settle directly into the board color.
- Settings apply controls should read as compact material actions inside the shell, not oversized CTA pills; header and in-card apply states should share restrained sizing and typography.
- Settings should resolve successful Apply quietly; transient success copy under the header is not needed for the current beta surface, and only errors should interrupt the layout.
- Compact native pickers on settings pages should sit in clean rows without extra dark field chrome; any companion text should match the picker's own presentation instead of conflicting with it.
- Shared glass-card sections need one standard internal rhythm for title, helper copy, fields, and actions. Card wrappers must preserve content padding and gap so buttons and controls never crowd nearby text.
- Settings overview/list cards that use dividers need their own balanced list rhythm. Top and bottom padding should not feel tighter than the spacing around dividers between rows.
- Beta appearance settings should not expose a separate off-pixel color editor or a separate lower `Colors` card. Keep one inline palette list with the three active board colors only, let the selected palette stay selected while its colors are edited, and put the palette reset action inside the editor flow instead of a second appearance section.
- The locked beta palette set is `Classic`, `Amber`, `Ice`, and `Geek` as fixed labels. `Rose` is replaced by `Geek`, the defaults should stay intentionally saturated/high-contrast on the board, `Ice` keeps its cool-light look with a more distinct fail color, and edited colors should still read as the selected palette rather than switching the UI into a separate `Custom` identity.
- Choosing a beta palette preset should immediately apply that preset's current colors on save. Users should not need to nudge hue, hex, or another color control just to get the selected palette onto the board.
- The beta `Routine` page should not expose reset-time UI and should assume the default midnight reset. This still conflicts with the canonical spec/runtime model describing reset time as user-configurable, so a later coordinator/spec cleanup is still needed if we want midnight-only behavior end-to-end.

### Onboarding

- The onboarding flow is real and guided, but it is still a state-dense step flow that needs polish around copy, pacing, and error handling.
- We need a deliberate pass on:
  - Wi-Fi scan results and hidden-network fallback
  - waiting-for-device messaging
  - success states and handoff into the main board
  - native-feeling step transitions and field ergonomics

### Wi-Fi recovery

- Wi-Fi recovery is implemented, but it still needs a trust pass on reconnect messaging, timeout clarity, and the manual-entry path.
- Wi-Fi recovery should stay focused on reconnecting Wi-Fi. It should reuse the device's current timezone under the hood and not surface a timezone picker in the beta recovery flow.
- Once Wi-Fi recovery is started, the flow needs an explicit `Cancel recovery` action. Relying on navigation alone is not enough when there is an active local/cloud recovery session.
- Wi-Fi recovery should avoid ambiguous status chips like `Ready for Wi-Fi` when the step title and helper copy already explain the action. Prefer direct instructions over extra status chrome.
- We should explicitly review:
  - when the user is told to join the AP
  - how reconnect progress is communicated
  - what happens when the AP is not reachable
  - what the post-recovery success state should feel like

### Time zones and calendar behavior

- `T-011` now locks the beta timezone model instead of leaving it implicit.
- Current beta timezone policy:
  - device timezone stays canonical for scheduling and reset behavior
  - any future viewer/display timezone stays separate
  - onboarding and routine settings use the picker-based timezone flow
  - the primary beta path is a searchable supported regional picker, not raw text
  - advanced mode is a separate fixed-UTC-offset picker in `15-minute` increments
  - fixed UTC offsets are clearly labeled as:
    - fixed offset only
    - no daylight-saving auto-adjust
    - not the same as a regional timezone like `Europe/Warsaw`
- Current app-side behavior:
  - onboarding starts from the phone timezone when the phone is already in the beta-supported regional list
  - if the phone timezone is valid but not yet in the beta-supported regional list, onboarding falls back explicitly to the phone's current fixed UTC offset
  - recovery reuses the current device timezone and keeps timezone editing out of the Wi-Fi reconnect flow
  - routine settings now use the same shared picker instead of a raw IANA text field
- Current beta-supported regional zones:
  - `UTC`
  - `America/Los_Angeles`
  - `America/Denver`
  - `America/Phoenix`
  - `America/Chicago`
  - `America/New_York`
  - `America/Anchorage`
  - `Pacific/Honolulu`
  - `Europe/Warsaw`
  - `Europe/Kyiv`
- Current firmware reality after `T-011`:
  - the firmware now maps the beta-supported regional list above plus explicit fixed UTC offsets
  - unsupported but valid IANA zones are no longer presented as selectable beta device zones
  - if legacy or phone-derived input is a valid unsupported IANA zone, the UI explains that the region is not yet in the beta device list and points the user to a supported regional zone or fixed UTC offset
- Follow-up still queued:
  - broader worldwide regional timezone support remains a follow-up task if we want to move beyond the current beta list without relying on fixed offsets

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
- First beta should no longer be treated as "shared boards only" by default. The durable beta target is:
  - link with other people deliberately
  - browse between friends' boards and recent progress
  - support at least one lightweight engagement lane around activity, not just passive viewing
- The beta social layer still needs one explicit lock decision set:
  - whether the initial engagement lane is:
    - simple reactions / likes only
    - an activity feed with lightweight reactions
    - comments or threaded replies from day one
  - how much per-day or per-check-in detail appears when browsing friends
  - whether "friends" in first beta is:
    - a private linked-circle model
    - or a slightly broader viewer/follower model
- Post-beta direction should already be preserved in the plan so the beta implementation does not block it:
  - challenge groups with a shared goal
  - a group board where day brightness reflects how many members completed the challenge that day
  - communication around the shared challenge
- Do not build bespoke messaging infrastructure casually for beta. Prefer a reliable managed backend path and battle-tested Expo-compatible libraries when the communication stack is chosen explicitly.

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
- Decide the first-user beta social floor:
  - linked-board browsing only
  - or linked-board browsing plus a lightweight activity lane
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
- `T-011` beta timezone capability and picker baseline
- `T-012` broader firmware timezone expansion if we want support beyond the initial beta zone list
- `T-007` main screen and settings polish batch
- `T-008` onboarding and Wi-Fi recovery polish batch
- `T-009` profile identity model and account surface batch
- `T-001` friends beta surface and social floor batch
- `T-013` challenge groups and shared board model
