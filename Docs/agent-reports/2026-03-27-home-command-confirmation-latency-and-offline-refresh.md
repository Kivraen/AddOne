Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-home-confirmation-latency`.

The original Home command-confirmation and stale-refresh truth issues are fixed. The final unplug-and-pull-to-refresh proof has now also been completed successfully, so the Home-only offline refresh contract is considered validated for this slice.

Changes made
- Tightened the Home toggle confirmation path in [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts) so it no longer waits only on mirrored runtime state first. It now races mirror visibility against `device_commands.status = applied`, logs a `home-toggle-trace`, and completes on the first truthful confirmation.
- Added explicit pending phases in [store/app-ui-store.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/store/app-ui-store.ts), and updated [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) plus [components/ui/primary-action-button.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/ui/primary-action-button.tsx) so Home shows a calmer confirmed-but-mirror-pending state instead of a long ambiguous applying animation.
- Fixed the stale refresh or reload truth gap in [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts) by overlaying today’s state from `device_day_states` for owner devices. This addressed the case where the board had already applied but Home refresh or reload still showed the old off pixel.
- Added owner realtime invalidation for `device_day_states` in [providers/cloud-realtime-provider.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/providers/cloud-realtime-provider.tsx), so owner-device refreshes are not waiting only on `devices` and `device_runtime_snapshots`.
- Polished the offline Recovery chip in [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) with a restrained amber accent so it is more visible and no longer reads like a disabled gray pill.
- Tightened Home connection-state timing in [lib/device-connection.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-connection.ts) so the board leaves the calm online state after one missed heartbeat instead of staying green longer than necessary.
- Added a quiet Home-side reachability probe in [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) when the board enters checking, so Home can settle into offline or recovery faster.
- Changed manual pull-to-refresh semantics in [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts), [store/app-ui-store.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/store/app-ui-store.ts), and [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) so refresh now performs a real runtime-snapshot probe and, if that explicit probe times out, marks the board offline immediately instead of falling back to the passive grace model.

Exact files changed:
- [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx)
- [components/ui/primary-action-button.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/ui/primary-action-button.tsx)
- [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts)
- [lib/device-connection.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/device-connection.ts)
- [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts)
- [providers/cloud-realtime-provider.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/providers/cloud-realtime-provider.tsx)
- [store/app-ui-store.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/store/app-ui-store.ts)

Commands run
- `git switch -c codex/s4-home-confirmation-latency`
- `npm run typecheck` multiple times after each change set
- `xcrun simctl io booted screenshot /tmp/addone-home-proof.png`
- `xcrun simctl help io`
- `ps -o pid=,command= -ax | rg 'expo|metro|react-native|xcodebuild|Simulator.app'`
- `which cliclick`
- `ls /dev/cu.*`
- `pio device list`
- `lsof -nP /dev/cu.usbserial-210`
- `pio device monitor --port /dev/cu.usbserial-210 --baud 115200`
- targeted `rg`, `nl`, and `sed` inspections across app, Supabase, docs, and firmware

Evidence
- Old bottleneck: the device was applying quickly, but the app was waiting on mirrored snapshot or query state first and only treated command `applied` as a fallback after that mirror wait had already failed. Refresh or reload also ignored `device_day_states`, so Home could still show the old off state even after backend truth had updated.
- Before confirmation trace: tap -> command queued -> command applied -> runtime snapshot visible -> app confirmation complete. In the bad path, that degraded into tap -> command queued -> device applied -> long applying animation -> timeout or failure -> off pixel on refresh or reload.
- After confirmation trace: tap -> command queued -> command applied -> app confirmation complete -> runtime snapshot visible when the command ack wins, or tap -> command queued -> runtime snapshot visible -> app confirmation complete when mirror state wins first. Refresh or reload truth is now also corrected by `device_day_states`.
- Real-device monitor proof on `/dev/cu.usbserial-210` showed the board path was healthy. Observed sequences included:
  - `MQTT command queued: ... (set_day_state)`
  - `Applied cloud day state 2026-03-27 -> not_done`
  - `Uploaded runtime snapshot revision 125`
  - `Acked command ... as applied`
  - additional toggles also succeeded with revisions `126`, `127`, and `128`
- Manual proof from the user side: after the sync or reload fix, the updated path was reported as “working well now.”
- Final manual proof from the user side:
  - unplug-and-pull-to-refresh behavior is now confirmed good
  - the slice no longer has an outstanding proof gap on the Home-only offline refresh path

Open risks / blockers
- The broader connection model still depends on heartbeat and presence timestamps; this pass tightened Home specifically, not every screen in the app.

Recommendation
Accept this branch as the narrow `S4` Home confirmation-latency slice. The command-confirmation path is materially tighter, reload truth is fixed, and the unplug-and-pull-to-refresh behavior is now manually validated.
