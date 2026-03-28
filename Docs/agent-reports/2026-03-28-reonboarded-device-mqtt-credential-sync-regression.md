Stage
S4: Beta Hardening And Durable Release Memory

Status
Checkpointed on `codex/s4-final-ios-rc-polish`.

This is an in-progress coordinator report and save point, not a final acceptance report for the next slice. The current RC/UI branch now includes the latest sign-in and onboarding polish plus a live investigation of the re-onboarded-device control regression. The permanent fix still pending is broker credential-sync automation plus a full re-onboarding retest on a separate branch.

Changes made
- Continued the RC polish pass across sign-in, onboarding, Home, and setup UI, including the later user-driven refinements already present on `codex/s4-final-ios-rc-polish`.
- Verified live backend ownership transfer for `AO_B0CBD8CFABB0` after re-onboarding to a different account. The device now has one approved owner membership for the new user, and the prior memberships on that same device were revoked.
- Isolated the post-re-onboarding control issue to stale broker credentials on the hosted MQTT broker after a fresh claim/reset. The board had a valid newly issued row in `list_active_device_mqtt_credentials()`, but the broker was still rejecting that device with `MQTT connect failed, state=5`, which forced the board onto slow HTTP polling.
- Confirmed the hosted environment-side recovery by running the documented broker password refresh on the beta VPS with [sync-passwords.sh](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/sync-passwords.sh), which rewrote `passwords.txt` and recreated Mosquitto.
- Added a firmware-side safeguard in [habit_tracker.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/habit_tracker.cpp) and [habit_tracker.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/habit_tracker.h) so replayed `set_day_state` commands are treated as already successful when the requested state is already present locally. This avoids bogus `Runtime revision conflict.` failures after a transport interruption delays command acknowledgement.
- Built and flashed the beta firmware to the connected device after that safeguard patch.

Exact files changed:
- [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md)
- [Docs/agent-reports/2026-03-28-reonboarded-device-mqtt-credential-sync-regression.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-28-reonboarded-device-mqtt-credential-sync-regression.md)
- [app/(app)/(tabs)/_layout.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/(tabs)/_layout.tsx)
- [app/(app)/_layout.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/_layout.tsx)
- [app/(app)/devices/[deviceId]/recovery.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/recovery.tsx)
- [app/(app)/onboarding/index.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/onboarding/index.tsx)
- [app/sign-in.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/sign-in.tsx)
- [assets/branding/sign-in-logo.png](/Users/viktor/Desktop/DevProjects/Codex/AddOne/assets/branding/sign-in-logo.png)
- [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx)
- [components/settings/palette-color-editor.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/palette-color-editor.tsx)
- [components/setup/setup-flow.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/setup/setup-flow.tsx)
- [components/ui/choice-pill.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/ui/choice-pill.tsx)
- [components/ui/icon-button.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/ui/icon-button.tsx)
- [firmware/src/habit_tracker.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/habit_tracker.cpp)
- [firmware/src/habit_tracker.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/habit_tracker.h)
- [hooks/use-setup-flow-controller.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-setup-flow-controller.ts)
- [hooks/use-social-profile.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-social-profile.ts)
- [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts)
- [package-lock.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/package-lock.json)
- [package.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/package.json)
- [providers/auth-provider.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/providers/auth-provider.tsx)
- [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)

Commands run
- `npm run typecheck`
- `node .codex-tmp/query-device-heartbeat.mjs .codex-tmp/realtime-gateway.env`
- multiple read-only `curl` queries against:
  - `devices`
  - `device_commands`
  - `device_memberships`
  - `device_runtime_snapshots`
  - `rpc/list_active_device_mqtt_credentials`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-210`
- `ssh root@72.62.200.12 "cd /opt/addone-beta-src/deploy/beta-vps && ./sync-passwords.sh --compose-file ./docker-compose.bootstrap.yml"`
- `ssh root@72.62.200.12 "docker logs --since 10m addone-beta-mosquitto-1 2>&1 | tail -n 120"`
- targeted `rg`, `sed`, `git diff --stat`, and `git status --short --branch` inspections across firmware, Supabase migrations, gateway, and docs

Evidence
- Live backend ownership verification for `AO_B0CBD8CFABB0`:
  - `device_memberships` now shows one approved owner membership for the new user created on `2026-03-28T06:05:11.449719+00:00`
  - older memberships on that same device show `status = revoked`
- Live credential-source proof:
  - `rpc/list_active_device_mqtt_credentials` returned an active credential row for `AO_B0CBD8CFABB0`
- Live failure proof before broker sync:
  - serial monitor showed `MQTT connect failed, state=5`
  - serial monitor also showed `Cloud RPC ack_device_command -> HTTP -1`, `Cloud RPC upload_device_runtime_snapshot -> HTTP -1`, and `Cloud RPC pull_device_commands -> HTTP -1`
  - backend command rows showed commands stuck in `queued` or later failing with `Runtime revision conflict.`
- Root-cause interpretation:
  - cross-account re-onboarding revoked and reissued per-device MQTT credentials as designed
  - the hosted broker password file had not yet been refreshed from the new credential source of truth
  - the board therefore lost fast MQTT delivery and fell back to slow HTTP polling, which exposed command replay and stale-ack edge cases
- Hosted environment recovery proof:
  - `sync-passwords.sh` rewrote `passwords.txt` with three broker accounts: `addone-beta-gateway`, `AO_A4F00F767008`, and `AO_B0CBD8CFABB0`
  - Mosquitto was recreated successfully on the beta VPS
  - hosted broker logs then showed:
    - `New client connected ... as addone-AO_B0CBD8CFABB0`
    - TLS negotiated successfully
- Post-recovery runtime proof from serial:
  - `MQTT command queued: ... (set_day_state)`
  - `Applied cloud day state 2026-03-28 -> not_done`
  - `Uploaded runtime snapshot revision 10`
  - `Acked command ... as applied`
  - repeated again for a second toggle with revision `11`
- Post-flash proof with the safeguard build:
  - the board accepted commands and uploaded fresh runtime snapshots on the new firmware
  - latest observed serial lines included:
    - `Applied cloud day state 2026-03-28 -> not_done`
    - `Uploaded runtime snapshot revision 14`
    - `Acked command ... as applied`
    - `Applied cloud day state 2026-03-28 -> done`
    - `Uploaded runtime snapshot revision 15`
    - `Acked command ... as applied`

Open risks / blockers
- The permanent environment fix is not implemented yet. Freshly re-onboarded devices can still regress if the hosted broker password file is not automatically refreshed after new MQTT credentials are issued or revoked.
- The current firmware safeguard reduces false conflicts on replayed day-state commands, but it does not replace the need for automated broker credential rollout.
- A full end-to-end retest of the complete “different account -> onboard same device -> control board” flow still needs to be run after the permanent broker-sync automation is built.

Recommendation
Checkpoint and save the current RC/UI branch now, then implement the permanent broker credential-sync automation on a separate branch before the next cross-account onboarding validation. After that automation lands, rerun the full different-account onboarding flow on this same device and verify:
- broker credentials are refreshed without a manual VPS step
- the device reconnects to MQTT immediately after claim
- Home toggles complete without timeout or replay-induced false conflicts
