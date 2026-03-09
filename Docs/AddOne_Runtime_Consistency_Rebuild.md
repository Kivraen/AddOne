# AddOne Runtime Consistency Rebuild

Last locked: March 9, 2026

This document resets the runtime architecture around the real failure modes found during hardware validation.
For the simplified target runtime model that replaces the layered patch path, see [AddOne_Runtime_Simplification_Reset.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Simplification_Reset.md).

## Why This Rebuild Exists
- The app board and the physical device board are not currently projecting the same model.
- The physical button is not reliable because local input handling is still coupled to blocking network work.
- History correction is modeled as command delivery instead of latest-wins state sync.
- Device-originated sync and app-originated sync have already drifted at least once, which means current behavior is not robust enough to harden incrementally.

## Confirmed Root Causes

### 1. Board contract drift
- Current week must be the leftmost column.
- Older history must move to the right.
- Default runtime week start must be Monday until firmware and app both support another explicit mode.
- Result: any remaining `locale` or Sunday-first projection is a bug, not an alternate rendering.

### 2. Weekly-row semantics mismatch
- The app currently paints the weekly row as fail whenever a visible week is below target.
- The firmware currently leaves the in-progress week neutral until the target is met, then turns it success, and only marks failure once the week has closed unsuccessfully.
- Result: the bottom row can disagree even when the day cells match.

### 3. Button input is blocked by networking
- The firmware still performs synchronous cloud work inside the same loop that polls the physical button.
- While cloud HTTP is active, button polling is stalled.
- Result: quick presses can be missed even if the electrical input is clean.

### 4. History edit uses the wrong transport model
- History correction is not a realtime interaction surface.
- It should not stream a sequence of device commands for every intermediate tap.
- Result: the device can spend time replaying stale edits long after the user has stopped editing.

### 5. Board truth is split between cloud requests and device reality
- The cloud request path can currently make the app believe a board change already exists before the device has actually applied it.
- The device then reports or renders a different state until the two sides converge.
- Result: app and device can drift temporarily even when both are individually “working.”

## Canonical Board Contract

This is the board model both app and firmware must follow.

### Geometry
- Board is `8 x 21`.
- Rows `0-6` are day rows.
- Row `7` is the weekly status row.

### Time direction
- Current week is the leftmost column.
- Older history moves to the right.
- Future weeks do not exist on the board.

### Day ordering
- Default board origin is `Monday` at the top-left pixel.
- Current runtime week-start is `Monday` only.
- If configurable week-start returns later, both app and firmware must resolve and persist the exact same explicit runtime value before it ships.

### Day cell states
- `done`: lit with the palette day color.
- `not done but visible`: dark socket.
- `future within current week`: hidden / not yet visible.
- There is no special "today off" light on the main board.

### Weekly status row
- `success`: target already reached this week, or a past week closed at/above target.
- `fail`: only for past weeks that closed below target.
- `neutral`: current in-progress week below target.

## Interaction Contract

### Physical button
- Physical button is `device-local only`.
- A button press must:
  1. be captured locally
  2. mutate local state immediately
  3. redraw the board immediately
  4. enqueue cloud sync in the background
- Button reliability must not depend on cloud, Wi-Fi, MQTT, HTTP, or Supabase response timing.

### App today toggle
- App toggle is optimistic in the app immediately.
- Online device delivery should be realtime.
- The device applies the latest app toggle and acks it.
- Cloud board state must update only after the device confirms apply, not when the app merely requests it.

### History correction
- History correction is available only during a live device session.
- History correction is instant in the app draft.
- The device should receive one explicit `Draft + Save` apply request, not every intermediate tap.
- Cloud board state must update from the device-applied result or the next device runtime snapshot, not from intermediate app taps.
- There is no deferred history queue and no replay-on-reconnect history behavior.

## Rebuild Rules

### Firmware local loop
- Local input capture and local board state updates must be isolated from blocking network work.
- Cloud writes must move to a background sync worker or non-blocking queue drain.
- Realtime message handling must not block button capture.

### Cloud transport
- `today toggle` must be absolute desired-state delivery with runtime revision checks.
- `history correction` must use `Draft + Save` with `base_revision`.
- Older history drafts must be discardable by both gateway and firmware.
- Runtime healing must rely on full device snapshots, not queued per-cell history replay.
- The device is the runtime authority for board state and device-affecting settings; cloud/app requests are intents until the device confirms them.

### App data model
- The app should project the board from the same canonical board contract as firmware.
- Board projection logic should live in one explicit contract module and be testable.

## Rebuild Order
1. Lock the canonical board contract in code and docs.
2. Align app board projection to that contract.
3. Align firmware rendering to that contract without depending on legacy internal week orientation.
4. Rebuild firmware input/sync loop so local button handling is never blocked by network work.
5. Replace history correction delivery with latest-wins revision sync.
6. Revalidate all flows on hardware.

## Acceptance Criteria

### Board parity
- App board and device board show the same day cells.
- App board and device board show the same weekly row.
- Current week appears in the same column on both.

### Button reliability
- 20 consecutive normal clicks are captured correctly.
- 10 fast clicks do not silently disappear.
- Presses still work while cloud sync is active.

### History correction
- App feedback is immediate.
- Device updates once after editing settles.
- Old intermediate edits do not keep replaying.

### Sync integrity
- Device-originated toggle appears in cloud/app after local update.
- App-originated toggle appears on device quickly.
- Offline local device changes sync correctly after reconnect.
- Runtime snapshots heal stale cloud/app state back to the exact device board after reconnect or drift.
