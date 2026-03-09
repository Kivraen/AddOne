# AddOne V1 Canonical Spec

Last locked: March 9, 2026

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
- Current week is the leftmost column.
- Older history moves to the right.
- Default board origin is `Monday` at the top-left pixel.
- `Row 8` is `weekly success/fail` for each week column.
- User sets a `weekly target` from `1-7`.
- Current runtime week-start is locked to `Monday` until app and firmware both support another explicit mode without parity risk.
- Timezone stays fixed until changed manually.
- Day reset defaults to midnight local, with user-configurable reset time.
- No formal skip/pause state in v1.
- History editing changes daily cells only; weekly success/fail always auto-recomputes.
- Canonical runtime board projection, parity rules, and rebuild constraints are locked in [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md).

## App And Cloud Model
- Normal app control is `cloud-backed`.
- Device core always works locally even when cloud or Wi-Fi is unavailable.
- Cloud backup is `automatic` whenever the linked device is online.
- Remote app completion is allowed.
- If the device is offline, remote completion is `queued and synced later`.
- Online device delivery should use a `realtime command transport`, not periodic polling as the primary path.
- Supabase remains the product source of truth; realtime transport is the low-latency delivery lane for online devices.
- Board-state persistence must advance only from `device-confirmed apply` or `device-originated local events`, not from app intent alone.
- Polling remains a `fallback and backlog recovery path`, not the long-term user-experience standard.
- The app requires sign-in.
- Current app auth flow is `email OTP`.
- Future auth can add Google or password-based login later without changing the data model.
- Sharing v1 is `code + approval + view-only`.
- Ownership model is `single owner + approved viewers`.
- Ownership transfer requires `factory reset / re-pair`.

## Future Domain And Branding
- Reserved production domain: `addone.studio`.
- This domain is not required for current staging/dev auth.
- Planned future use:
  - marketing/site URL
  - branded auth landing pages if needed
  - branded sender identities such as `hello@addone.studio`
  - future production Supabase URL configuration

## Nearby Local Mode
- Local nearby mode exists only for `setup, Wi-Fi recovery, settings, and history edit`.
- Local nearby mode is not a second full everyday control system.
- Local nearby transport is `temporary AP mode`, not LAN discovery.
- Customer-facing device QR in v1 is `generic`, pointing to `addone.studio/start`.
- The generic QR is for setup instructions and app/web handoff, not for encoding a unique public claim identifier.
- Each device still has an internal `hardware_uid` and device-local secret material for manufacturing, claim, and support flows.
- `hardware_uid` is not a normal user-facing onboarding field.
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

## Onboarding Contract
- Devices may be pre-registered during manufacturing / firmware flashing.
- Factory flow can run QA checks such as:
  - LED matrix test
  - RTC / timekeeping check
  - ambient sensor check
  - button check
  - firmware version verification
- Devices are factory-reset before shipping so the customer receives an unprovisioned unit.
- The v1 customer onboarding flow is:
  1. scan the printed QR or open `addone.studio/start`
  2. sign in to the app
  3. power the device and join its temporary `AddOne-XXXX` Wi-Fi access point
  4. app sends Wi-Fi credentials and a one-time claim token to the device over AP
  5. device joins home Wi-Fi and connects to cloud
  6. backend binds the device to the signed-in user when the device redeems the claim
  7. app confirms ownership and continues with habit setup
- v1 does **not** rely on LAN discovery as the primary claim or onboarding mechanism.
- LAN discovery can exist later as a support or nearby-maintenance convenience, but not as the first-boot dependency.
- The first AP step should collect only what is necessary to get the device online; habit naming and deeper settings happen after cloud confirmation.

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
- Onboarding now has a real cloud-side claim-session flow.
- The app now builds the exact AP provisioning payload, probes the configured local AP endpoints, and can send the provisioning payload to firmware.
- History, settings, and rewards modals exist.
- Real Supabase auth now exists with `demo mode` fallback.
- Initial Supabase schema and migration foundation now exist locally under [supabase/migrations/20260308113000_init_addone_schema.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308113000_init_addone_schema.sql).
- Real device/account data reads, sharing, and onboarding-session queries now exist against staging.
- Cloud mode now drives the main board from live device/account data, while demo mode remains as a deliberate mock fallback.
- The app now invalidates live board/share queries from Supabase realtime changes so firmware-originated updates can surface without manual refresh.
- Device cloud sync RPCs for claim redemption, heartbeat, command pull/ack, and device day-event writes now exist in staging schema.
- The app now applies optimistic board/history updates immediately for cloud-backed actions.
- The current rebuild direction is `device-authoritative runtime state`: app requests queue intents, and the cloud board catches up from device-confirmed apply.
- A clean `firmware v2` workspace now exists in this repo; the prototype firmware is now reference-only.
- Firmware v2 now exposes the AP provisioning endpoint layer and persists pending onboarding claim context locally.
- Firmware v2 now includes claim redemption, heartbeat, command pull/ack, and device day-event sync against the AddOne cloud RPC contract.
- Firmware v2 now includes the first real AddOne behavior layer: single-button local toggling, 21-week board persistence, RTC/NTP-backed time service, and LED board rendering.
- Firmware v2 now includes minimal settings sync application, palette preset handling, and ambient-light-driven brightness.
- Firmware v2 now includes reward-state behavior with built-in `clock` and palette-based `paint` rendering for local button-triggered rewards.
- A dedicated MQTT-based realtime transport contract and gateway scaffold now exist for low-latency online device delivery, with polling retained only as fallback.

## Canonical Next Steps
1. Complete the runtime consistency rebuild from [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md):
   - one canonical board projection
   - local-first button reliability
   - latest-wins history sync
2. Revalidate the rebuilt button, board parity, app toggle, and history flows on real hardware.
3. Add custom reward payload sync so app-configured reward art can flow through cloud and onto firmware.
4. Remove staging-only onboarding shortcuts once real hardware validation is complete.
5. Promote the current staging stack into a production-ready shape: branded auth email, production Supabase project, broker hardening, and release hardening.
