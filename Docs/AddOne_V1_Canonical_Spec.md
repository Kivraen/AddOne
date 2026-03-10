# AddOne V1 Canonical Spec

Last locked: March 9, 2026

This document is the canonical product and UI spec for AddOne v1.
If another doc conflicts with this one, this file wins until an explicit new decision is made.

## Product Summary
- AddOne v1 is a `single-owner`, `single-device`, `single-button`, `single-habit`, `cloud-backed`, `offline-tolerant` product.
- The device remains the main daily ritual.
- The app is part of v1, but it is not the main daily interaction surface.
- The app handles setup, Wi-Fi recovery, settings, history correction, and live today control while the device is online.

## Locked Hardware And Device Behavior
- Final hardware is `1 button + LED matrix + RTC + ambient sensor`.
- Removed from the shipped product: `second button`, `rotary encoder`, `haptic`, `multi-habit`, old browser UI.
- Normal idle screen is `habit grid only`.
- Daily device action is `short-press toggle` for today.
- No normal runtime long-press behavior.
- Rewards are out of scope for first-user v1.

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
- History edit is `live-only` and uses `Draft + Save`.
- Device-affecting settings are also `live-only` and count as saved only after device confirmation.
- Canonical runtime board projection, parity rules, and rebuild constraints are locked in [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md).

## App And Cloud Model
- Normal app control is `cloud-backed`.
- Device core always works locally even when cloud or Wi-Fi is unavailable.
- Cloud backup is `automatic` whenever the linked device is online.
- Remote app completion is allowed only during a live device session.
- If the device is offline remotely, the app is `read-only` for device-affecting actions.
- Online device delivery should use a `realtime command transport`, not periodic polling as the primary path.
- Supabase remains the product source of truth; realtime transport is the low-latency delivery lane for online devices.
- Device is the runtime source of truth for board state and device-affecting settings.
- Cloud mirrors only `device-confirmed apply` or `device-originated runtime snapshots`, never app intent alone.
- Runtime snapshots should use the same realtime lane as online commands whenever possible; direct cloud HTTP snapshot upload is fallback only.
- Polling remains a `fallback and backlog recovery path`, not the long-term user-experience standard.
- The app requires sign-in.
- Current app auth flow is `email OTP`.
- Future auth can add Google or password-based login later without changing the data model.
- Sharing is out of scope for first-user v1.
- Ownership model for first-user v1 is `single owner, one device`.

## Future Domain And Branding
- Reserved production domain: `addone.studio`.
- This domain is not required for current staging/dev auth.
- Planned future use:
  - marketing/site URL
  - branded auth landing pages if needed
  - branded sender identities such as `hello@addone.studio`
  - future production Supabase URL configuration

## Nearby Local Mode
- Local nearby mode exists only for `setup` and `Wi-Fi recovery`.
- Local nearby mode is not a second full everyday control system and is not used for ongoing settings/history editing in first-user v1.
- Local nearby transport is `temporary AP mode`, not LAN discovery.
- Customer-facing device QR in v1 is `generic`, pointing to `addone.studio/start`.
- The generic QR is for setup instructions and app/web handoff, not for encoding a unique public claim identifier.
- Each device still has an internal `hardware_uid` and device-local secret material for manufacturing, claim, and support flows.
- `hardware_uid` is not a normal user-facing onboarding field.
- AP starts on:
  - first boot
  - manual power-up hold
  - saved Wi-Fi join failure after reboot
- Wi-Fi recovery reuses the same temporary AP + short-lived session contract as onboarding.
- Wi-Fi recovery does not transfer ownership or factory-reset the device; it only reprovisions network access for the current owner.
- Cloud failure alone must never trigger AP mode.
- AP should time out after about `10 minutes idle`.
- First-user v1 requires Wi-Fi during first setup.
- After onboarding, the device itself must continue working locally even if Wi-Fi is later lost.

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
  4. app scans nearby Wi-Fi networks through the device AP and lets the user choose a network or enter a hidden SSID manually
  5. app sends Wi-Fi credentials and a one-time claim token to the device over AP
  6. device joins home Wi-Fi and connects to cloud
  7. backend binds the device to the signed-in user when the device redeems the claim
  8. app confirms ownership and collects onboarding settings:
     - weekly target
     - timezone from phone by default
     - palette
  9. app lands on the board
- v1 does **not** rely on LAN discovery as the primary claim or onboarding mechanism.
- LAN discovery can exist later as a support or nearby-maintenance convenience, but not as the first-boot dependency.
- The first AP step should collect only what is necessary to get the device online.
- Defaults:
  - timezone from phone during onboarding
  - reset time = midnight
  - brightness = auto-adjust enabled

## App Structure
- Main screen is the active device board.
- Main screen is `board-first`, with one primary action button below the board.
- Header contains:
  - device name
  - sync status
  - settings entry
- `History edit` belongs to the main habit surface and opens as a full-height sheet/modal.
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
- Onboarding exists as a real AP + claim flow, and recovery reuses that contract as a real `Rejoin Wi-Fi` flow.
- Onboarding now has a real cloud-side claim-session flow.
- The app now builds the exact AP provisioning payload, probes the configured local AP endpoints, and can send the provisioning payload to firmware.
- History and settings modals exist.
- Real Supabase auth now exists with `demo mode` fallback.
- Initial Supabase schema and migration foundation now exist locally under [supabase/migrations/20260308113000_init_addone_schema.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260308113000_init_addone_schema.sql).
- Real device/account data reads and onboarding-session queries now exist against staging.
- Cloud mode now drives the main board from live device/account data, while demo mode remains as a deliberate mock fallback.
- The app now invalidates live board/share queries from Supabase realtime changes so firmware-originated updates can surface without manual refresh.
- `device_runtime_snapshots` are now in Supabase realtime publication, with only a light self-heal refetch kept in the app as backup.
- Device cloud sync RPCs for claim redemption, heartbeat, command pull/ack, runtime snapshot upload, runtime refresh request, history draft apply, and live settings apply now exist in staging schema.
- The app now applies optimistic board/history updates immediately for cloud-backed actions.
- The current rebuild direction is `device-authoritative runtime state`: app requests live intents or drafts, and the cloud mirror catches up from device-confirmed apply or runtime snapshots.
- Operational lesson now locked:
  - runtime feels reliable only when the app reads from the latest device-confirmed snapshot, not from mixed command status, derived rows, and local shadow state at the same time
- The app runtime board now reads from `device_runtime_snapshots`; `device_day_states` remains derived compatibility data only.
- Wi-Fi recovery is now a real AP reprovisioning flow from the app, not just a placeholder screen.
- A clean `firmware v2` workspace now exists in this repo; the prototype firmware is now reference-only.
- Firmware v2 now exposes the AP provisioning endpoint layer and persists pending onboarding claim context locally.
- Firmware v2 now includes claim redemption, heartbeat, command pull/ack, runtime revision tracking, and snapshot-based cloud healing against the AddOne cloud RPC contract.
- Firmware v2 now includes the first real AddOne behavior layer: single-button local toggling, 21-week board persistence, RTC/NTP-backed time service, and LED board rendering.
- Firmware v2 now includes minimal settings sync application, palette preset handling, and ambient-light-driven brightness.
- A dedicated MQTT-based realtime transport contract and gateway scaffold now exist for low-latency online device delivery, with polling retained only as fallback.
- The runtime cleanup pass removed the old user-facing `queued` state, command-row polling waits, and `device_day_states` live invalidation from the app runtime path.

## Known Gaps
- AP onboarding currently uses direct SSID/password entry; device-side scan-list flow is now the intended v1 UX and must be treated as required.
- Nearby AP maintenance currently covers setup and Wi-Fi recovery only, which is the intended first-user v1 scope.
- Auth is still staging-grade `email OTP`; branded mail, production redirect configuration, and optional Google/password login remain future work.
- Production broker hardening and release deployment shape are not finished; the current broker/gateway path is still staging/development oriented.
- Rewards, reminders, sharing, and multi-device UX are intentionally out of scope for first-user v1 and should stay hidden.

## Canonical Next Steps
1. Revalidate the current runtime path on real hardware as a locked baseline:
   - board parity
   - local button reliability
   - app today toggle latency
   - history `Draft + Save`
   - settings `Draft + Apply`
   - offline/reconnect snapshot healing
2. Finish the MVP onboarding flow with device-side Wi-Fi scan list plus manual hidden-network fallback.
3. Remove or hide all out-of-scope first-user v1 surfaces:
   - rewards
   - reminders
   - sharing
   - multi-device UX
4. Promote the current staging stack into a production-ready beta shape:
   - branded auth email
   - production Supabase project
   - broker hardening
   - release hardening
