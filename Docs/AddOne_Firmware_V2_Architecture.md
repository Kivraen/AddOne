# AddOne Firmware V2 Architecture

Last locked: March 9, 2026

This document marks the transition from `contract validation` to `real AddOne firmware v2`.

## Decision
- The old Habit Tracker firmware is now `reference-only`.
- The new shipped product firmware will be built as a `clean AddOne firmware v2`.
- Prototype firmware is still useful for:
  - AP / Wi-Fi provisioning reference
  - RTC and timekeeping ideas
  - LED power handling
  - selected storage patterns
- Prototype firmware is **not** the structure we preserve.

## Why This Is The Correct Next Step
We already completed the risky foundation work:
- product contract is locked
- app and backend contracts are real
- AP handoff and cloud claim flow are defined
- the old firmware proved that the AP contract is feasible on the ESP32 stack

At this point, continuing to add product logic to the prototype would create the exact legacy drag we wanted to avoid.

## Firmware V2 Scope
Firmware v2 should implement only the AddOne product model:
- `single button`
- `single habit`
- `tracking`
- `reward`
- `setup/recovery`

Removed from v2:
- second-button interaction model
- rotary encoder
- haptic motor
- multi-habit mode
- legacy browser UI
- old primary mode switching

## Initial Module Plan

### `main.cpp`
Purpose:
- minimal boot
- create app object
- call `begin()` and `loop()`

### `firmware_app.*`
Purpose:
- own the high-level state machine
- coordinate setup/recovery, tracking, and reward transitions

### `device_identity.*`
Purpose:
- derive stable internal `hardware_uid`
- derive AP SSID suffix
- provide helper strings used by setup and cloud flows

### `provisioning_store.*`
Purpose:
- store and clear the pending onboarding claim context locally
- provide the exact persisted fields needed after AP provisioning:
  - `claim_token`
  - `onboarding_session_id`
  - `hardware_profile_hint`

### `provisioning_contract.h`
Purpose:
- define the exact AP payload and response structures the app already targets

### Future modules after the skeleton
- `time_service.*`
- `board_renderer.*`
- `reward_engine.*`
- `button_input.*`

## State Model

### `SetupRecovery`
Used for:
- first boot
- Wi-Fi recovery
- AP onboarding
- claim redemption bootstrap

### `Tracking`
Used for:
- normal daily single-button interaction
- local habit persistence
- steady-state cloud sync

### `Reward`
Used for:
- optional reward display
- timeout or dismiss back to tracking

## Milestone Order
1. Create the clean firmware workspace and state skeleton.
2. Add local persisted claim context and provisioning contract types.
3. Add AP HTTP server that matches the locked app contract.
4. Add cloud claim redemption, heartbeat, and fallback command polling.
5. Add single-button tracking logic and board rendering.
6. Add optional reward logic.
7. Add realtime command delivery for online devices while retaining polling for offline recovery.

## Current Status
- Firmware v2 workspace exists and builds.
- Device identity, pending claim persistence, and top-level state machine exist.
- AP HTTP server now exists in firmware v2 and matches the locked local onboarding contract.
- Cloud claim redemption, heartbeat, command polling, and command acknowledgement now exist in firmware v2.
- Firmware v2 now has a real `habit_tracker.*` module with the 21-week AddOne board model, local toggle handling, runtime revisioning, and snapshot export support.
- Firmware v2 now has initial `button_input.*`, `time_service.*`, `rtc_clock.*`, and `board_renderer.*` modules.
- Firmware v2 now has a minimal `device_settings.*` module, applies `apply_device_settings` commands from the cloud contract, and uses `ambient_light.*` to derive runtime brightness.
- Firmware v2 now has a minimal `reward_engine.*` module and a real reward state with built-in `clock` and palette-based `paint` rendering.
- Firmware v2 now has the first MQTT realtime client seam for online command delivery, while cloud polling remains as fallback.
- The next firmware milestone is real broker-backed validation, then remaining hardware polish, custom reward payload sync, and real-device validation.
- Firmware v2 runtime rebuild direction:
  - physical button is fully local-first
  - runtime revision advances on accepted device or cloud-applied state changes
  - runtime snapshots heal cloud/app state after reconnect, boot uncertainty, or explicit refresh
  - history edits are applied as live `Draft + Save`, not streamed per-cell commands
- Hardware validation exposed a runtime-consistency problem set:
  - app and firmware board projection are not yet fully aligned
  - button capture is still coupled to blocking network work
  - history correction still needs latest-wins revision sync instead of command replay
- The canonical rebuild rules for those issues are now locked in [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md).

## Rebuild Constraint
- Physical button capture must become fully local-first and remain reliable even while cloud transport is busy.
- Firmware rendering must follow the same board contract as the app:
  - same week orientation
  - same week-start logic
  - same weekly-row semantics
- History correction must apply the latest settled revision, not replay a stream of stale intermediate edits.

## Relation To The Prototype Spike
The prototype spike was useful and should be treated as a reference note:
- it proved `GET /api/v1/provisioning/info` and `POST /api/v1/provisioning/session` are feasible
- it showed where claim context can be persisted locally
- it should not become the v2 codebase
