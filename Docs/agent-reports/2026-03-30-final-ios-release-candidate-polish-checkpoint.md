## Stage

`S4: Beta Hardening And Durable Release Memory`

## Status

Checkpointed on `codex/s4-final-ios-rc-polish`, not yet accepted as a locked RC baseline.

Substantial final-RC polish is implemented, but the main unfinished area is still the Home today-toggle and KPI consistency path, especially `Recorded` and the feel of the transition after a press.

Current branch state at the time of this checkpoint:

- branch: `codex/s4-final-ios-rc-polish`
- baseline head before checkpoint: `09845c2f524b4c3e47fbee1c77dbb19ec34e536f`
- all current polish work was originally uncommitted in the working tree

## Changes made

Main areas touched in the current checkpointed work:

- sign-in and auth polish across copy, layout, branding, splash, and OTP alignment
- onboarding and setup polish across step headers, centered text, Wi-Fi animation, validation behavior, and final handoff
- device removal and recovery flow polish
- Home screen polish across board presentation, insight transitions, KPI transitions, today-toggle behavior, and summary or KPI sync work
- firmware polish across boot or checkmark animation, onboarding hold behavior, Wi-Fi connect or fail states, reset-path fixes, and board-side dismissal behavior
- dependency and baseline alignment work including React Native or Expo patch-set cleanup and branding assets

Exact files in the checkpoint worktree:

- `app.config.js`
- `app/(app)/devices/[deviceId]/recovery.tsx`
- `app/(app)/devices/[deviceId]/settings/index.tsx`
- `app/(app)/onboarding/index.tsx`
- `app/sign-in.tsx`
- `components/app/home-screen.tsx`
- `components/board/device-board-stage.tsx`
- `components/settings/palette-color-editor.tsx`
- `components/setup/setup-flow.tsx`
- `firmware/src/ap_server.cpp`
- `firmware/src/ap_server.h`
- `firmware/src/board_renderer.cpp`
- `firmware/src/board_renderer.h`
- `firmware/src/cloud_client.cpp`
- `firmware/src/cloud_client.h`
- `firmware/src/firmware_app.cpp`
- `firmware/src/firmware_app.h`
- `hooks/use-devices.ts`
- `hooks/use-route-device.ts`
- `hooks/use-setup-flow-controller.ts`
- `lib/supabase/addone-repository.ts`
- `package-lock.json`
- `package.json`
- `store/app-ui-store.ts`
- `assets/animations/add-button.json`
- `assets/animations/wifi-connection.json`
- `components/branding/addone-logo.tsx`
- `components/setup/onboarding-handoff-animation.tsx`

## Commands run

Notable commands reported during this checkpoint:

- `npm run typecheck`
- `npx expo install --check`
- `npx expo-doctor`
- `npx expo config --type public`
- `xcrun simctl openurl booted exp://127.0.0.1:8081`
- `xcrun simctl spawn booted log stream ...`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-10`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-210`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`

## Evidence

- `npm run typecheck` passes on the checkpointed worktree.
- Earlier dependency validation in this pass brought `npx expo install --check` and `npx expo-doctor` clean after dependency alignment.
- Native proof path used Metro plus iOS Simulator and live firmware serial monitors on `/dev/cu.usbserial-10` and `/dev/cu.usbserial-210`.
- Serial evidence included live command application and runtime snapshot uploads during testing.
- The `Recorded` KPI issue was traced to a real multi-source timing problem:
  - optimistic local Home projection
  - fetched `device_day_states` or runtime snapshot overlay
  - slower history-metrics totals
  - an extra full-device invalidation after successful toggle
- The latest structural fix moved summary reconciliation into `lib/supabase/addone-repository.ts` and removed the redundant post-confirmation invalidation in `hooks/use-devices.ts`.

## Open risks / blockers

- The Home today-toggle path still needs final regression confirmation on real-device behavior.
- This remains the main reason the branch should not yet be treated as a locked RC baseline.
- No acceptance commit existed before this checkpoint; the main purpose of this slice is to preserve the work before a narrower follow-up pass continues.
- `.npm-cache/` remains untracked local noise and is not part of the checkpoint.

## Recommendation

Keep `T-049` in progress on `codex/s4-final-ios-rc-polish`, but preserve the current state as a checkpoint before doing anything else.

The next narrow follow-up should continue from this checkpoint and focus only on the remaining Home interaction and KPI consistency cleanup. Do not reopen broader sign-in, onboarding, or firmware polish unless the Home follow-up proves another real regression.
