# AddOne V1 Canonical Spec

Last locked: March 7, 2026

This document is the canonical product and UI spec for AddOne v1.
If another doc conflicts with this one, this file wins until an explicit new decision is made.

## Product Summary
- AddOne v1 is a `new-device-first`, `single-button`, `single-habit`, `cloud-backed`, `offline-tolerant` product.
- The device remains the main daily ritual.
- The app is part of v1, but it is not the main daily interaction surface.
- The app handles setup, settings, history correction, reminders, sharing, and remote fallback completion.

## Locked Hardware And Device Behavior
- Final hardware is `1 button + LED matrix + RTC + ambient sensor`.
- Removed from the shipped product: `second button`, `rotary encoder`, `haptic`, `multi-habit`, old browser UI.
- Normal idle screen is `habit grid only`.
- Daily device action is `short-press toggle` for today.
- No normal runtime long-press behavior.
- Rewards are `off by default`.
- Reward types are `clock` and `paint`.
- Reward trigger is user-selectable: `daily completion` or `weekly success`.
- Reward display is `auto-show after confirmation`, then `auto-timeout`, with `button dismiss`.
- Rewards do not replay later from the device in v1.

## Board And Habit Rules
- Board is `8 x 21`.
- `Row 8` is `weekly success/fail` for each week column.
- User sets a `weekly target` from `1-7`.
- Week start defaults from `locale`, but the user can override it.
- Timezone stays fixed until changed manually.
- Day reset defaults to midnight local, with user-configurable reset time.
- No formal skip/pause state in v1.
- History editing changes daily cells only; weekly success/fail always auto-recomputes.

## App And Cloud Model
- Normal app control is `cloud-backed`.
- Device core always works locally even when cloud or Wi-Fi is unavailable.
- Cloud backup is `automatic` whenever the linked device is online.
- Remote app completion is allowed.
- If the device is offline, remote completion is `queued and synced later`.
- The app requires sign-in.
- Auth method is `email magic link`.
- Sharing v1 is `code + approval + view-only`.
- Ownership model is `single owner + approved viewers`.
- Ownership transfer requires `factory reset / re-pair`.

## Nearby Local Mode
- Local nearby mode exists only for `setup, Wi-Fi recovery, settings, and history edit`.
- Local nearby mode is not a second full everyday control system.
- Local nearby transport is `temporary AP mode`, not LAN discovery.
- AP starts on:
  - first boot
  - manual power-up hold
  - saved Wi-Fi join failure after reboot
- Cloud failure alone must never trigger AP mode.
- AP should time out after about `10 minutes idle`.
- Permanently offline devices still support basic nearby non-cloud functions:
  - setup
  - Wi-Fi changes
  - settings
  - history edit
  - palette changes

## App Structure
- Main screen is the `last-viewed device board`.
- Users can swipe left/right between devices.
- Main screen is `board-first`, with one primary action button below the board.
- Header contains:
  - device name
  - sync status
  - shared entry
  - settings entry
- `History edit` belongs to the main habit surface and opens as a full-height sheet/modal.
- Shared boards live in a separate route and remain read-only.
- Settings use layered sheets and focused flows.
- Advanced/dev tools are hidden behind a deliberate gesture.

## UI Direction
- Mood is `black-glass minimal`.
- Layout is `board hero + one bottom action`.
- Motion is `subtle and weighted`.
- Typography is `Space Grotesk`.
- App shell remains visually fixed.
- Only the board/reward pixels are user-customizable.

## App Shell Tokens
- `bg.base`: `#070707`
- `bg.surface`: `#101010`
- `bg.elevated`: `#171717`
- `stroke.subtle`: `#232323`
- `text.primary`: `#F2EEE6`
- `text.secondary`: `#B2ACA2`
- `text.tertiary`: `#7B766E`
- `accent.amber`: `#C7904A`
- `status.errorMuted`: `#8F4E46`
- `overlay.scrim`: `rgba(0,0,0,0.45)`

## Board And Reward Color Model
- Default day color: `#F5F1E8`
- Default week success: `#8FD36A`
- Default week fail: `#A55449`
- Default socket: `#141414`
- Default socket edge: `#1F1F1F`
- Consumer-facing presets: `Classic`, `Amber`, `Ice`, `Rose`
- Device-side colors are customizable.
- App shell colors are not themeable in v1.

## Implementation Stack
- `Expo`
- `Expo Router`
- `NativeWind`
- `react-native-reusables` style approach via open-code primitives
- `@gorhom/bottom-sheet`
- `react-native-reanimated`
- `TanStack Query`
- `Zustand`

## Guardrails
- Do not add a full app theming engine in v1.
- Do not use a web-first shadcn kit directly.
- Do not build a generic dashboard/card-heavy productivity UI.
- Do not introduce Skia/canvas rendering in v1.
- Reuse the same shell, grid, sheet, and button vocabulary across the app.

## Legacy Device Policy
- Existing prototype devices are outside launch scope by default.
- AddOne v1 is for new devices first.
- Legacy migration is optional, selective, and non-blocking.
- If migration happens later, only migrated units appear in the AddOne app.
- Planned migration shape remains:
  - bridge firmware first
  - final AddOne firmware second

## Current Implementation Status
- Expo app scaffold exists in this repo.
- Board-first home screen exists.
- Shared boards screen exists.
- Onboarding and recovery screens exist.
- History, settings, and rewards modals exist.
- UI currently runs on mock data.
- Real Supabase auth, cloud data model, and device API integration are not implemented yet.

## Canonical Next Steps
1. Add real auth and session handling.
2. Add real cloud data model and typed API layer.
3. Replace mock store data with live device/account data.
4. Define local AP setup/recovery API contract.
5. Rework firmware around the locked AddOne single-button model.
