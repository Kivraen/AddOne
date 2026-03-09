# AddOne Firmware V2 Architecture

Last locked: March 8, 2026

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
4. Add cloud claim redemption, heartbeat, and command polling.
5. Add single-button tracking logic and board rendering.
6. Add optional reward logic.

## Current Status
- Firmware v2 workspace exists and builds.
- Device identity, pending claim persistence, and top-level state machine exist.
- AP HTTP server now exists in firmware v2 and matches the locked local onboarding contract.
- Cloud claim redemption, heartbeat, command polling, and command acknowledgement now exist in firmware v2.
- Firmware v2 now has a minimal `habit_tracker.*` module that can persist the latest known day state and queue future device-originated events for cloud sync.
- The next firmware milestone is real single-button tracking and board rendering.

## Relation To The Prototype Spike
The prototype spike was useful and should be treated as a reference note:
- it proved `GET /api/v1/provisioning/info` and `POST /api/v1/provisioning/session` are feasible
- it showed where claim context can be persisted locally
- it should not become the v2 codebase
