# AddOne Project Memory

Last updated: March 26, 2026

This file is durable coordinator memory for AddOne.
Use it for stable facts, accepted coordination decisions, active stage context, and recovery notes for fresh agents with no chat history.

## Stable Facts

- AddOne is a device-first habit tracker with:
  - an Expo app
  - ESP32 firmware
  - a Supabase backend
  - an MQTT-based realtime path
- The repo already uses `Docs/` as its durable doc root.
- The stage-coordinator convention's lowercase `docs/` paths map to `Docs/` in this repo so we do not create a second coordination tree on case-insensitive filesystems.
- The canonical master plan remains [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md).
- The canonical AddOne-specific UI direction now lives in [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md).
- Git reliability rules live in [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md).
- The live execution queue remains [Active_Work.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Active_Work.md).
- Stage memory now lives under [Docs/stages](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages).
- Worker-facing execution tasks remain under [Docs/tasks](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks).
- Worker reports remain under [Docs/agent-reports](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports).
- `origin` is configured as the GitHub remote for this repo.
- UI work in this repo must use the `building-native-ui` skill in `.agents/skills/building-native-ui/SKILL.md`.
- Visible UI work should also read [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md) so agents stop guessing the product's taste and hierarchy rules.

## Accepted Coordination Decisions

- Keep one active stage at a time unless the user explicitly opens a parallel track.
- Treat stages as outcome gates and tasks as execution units inside a stage.
- Do not advance a stage without explicit coordinator review and acceptance.
- Workers do not update project memory, the stage register, or the master plan directly.
- The coordinator updates the source-of-truth docs after reviewing each report.
- Treat repo docs plus git history as one memory system.
- Important accepted coordination state should be committed without mixing in unrelated dirty files.
- Accepted durable checkpoints should be pushed when appropriate because a GitHub remote exists for this repo.
- Before risky redesigns, broad refactors, or overnight stopping points, prefer checkpoint commits and optional tags.
- Implemented beta-scope product work is not discarded just because the coordinator verdict is `revise and retry`.
- When a beta slice is implemented but not yet accepted, keep it checkpointed in git, keep it in the beta plan, and add the required verification or support follow-up explicitly.
- User-facing task work is iterative by default. Do not treat the first worker pass as final if the user is still refining the result.
- A worker report should describe the actual final state after user iteration, not just the first implementation pass.

## Current Repo Reality

- The app already has real auth, onboarding, Wi-Fi recovery, board-first home, settings `Draft + Apply`, and history `Draft + Save`.
- The app reads live runtime state from `device_runtime_snapshots` and Supabase realtime.
- The firmware v2 foundation exists with AP provisioning, claim redemption, heartbeat, MQTT realtime subscribe, fallback poll, and runtime snapshot upload.
- The realtime gateway exists and mirrors queued commands plus device-side runtime/presence events.
- The recovered latest UI baseline is now restored and promoted to `main`.
- A real TestFlight install from that baseline now works.
- The friend-facing profile model now exists in the app, including the Friends gate and email-private account surface.
- The first Friends sharing flow is now implemented and live-verified on `codex/s3-friends-proof-and-fixes`, including owner approve, reject, revoke, viewer leave, and read-only shared-board browsing.
- The friend-celebration slice is now merged into `main`, including the reusable board transition primitive, friend-triggered temporary board reveal, backend fanout, per-friend `celebration_enabled`, the expanded transition library, per-board timing controls, and final restored once-per-day dedupe.
- Hosted beta infrastructure is alive and the app is using real backend data, but the device reconnect/offline problem is still a real hardware or Wi-Fi behavior issue.
- The backend profile model now includes `display_name`, `username`, `first_name`, `last_name`, and avatar-backed storage for the beta social profile.
- The accepted timezone audit confirms that the device timezone is the canonical scheduling/reset setting across app, backend, runtime projection, and firmware, while unsupported timezones still fall back to Los Angeles rules on-device because firmware only maps a small supported subset today.
- The March 22 setup follow-up stabilized the shared onboarding or recovery controller on real hardware, fixed wrong-password retry behavior, and implemented `Reset history` as `Start new habit` with backend era preservation.
- The March 22 factory-reset slice is now also live-validated: destructive account removal, fresh post-removal add flow, prereg-required claim behavior, post-reset runtime-state repair, stale-command cancellation on re-claim, and editable earlier habit-start correction all work on real hardware.
- The March 24 factory-QA slice added a real beta factory station on `codex/s2-factory-qa-plan`, including a release manifest, local Node plus browser operator tool, backend `factory_device_runs` support, firmware manufacturing-QA serial commands, and one successful live ship-ready bench run on a newly built board.

## Current Active Stage

- `S4: Beta Hardening And Durable Release Memory`
- Stage note: [stage-04-beta-hardening-and-durable-release-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md)
- Next brief: `T-041` firmware OTA artifact hosting and hardware validation
- Current execution task: apply the accepted `T-039` OTA control-plane migration to the hosted beta backend, confirm the hosted REST or RPC schema exposes the OTA tables and functions, then rerun `T-041` on the same validation branch

## Current Blockers

- `T-001` is accepted and merged into `main`.
- `T-027` is accepted and merged into `main`.
- `T-032` is complete as a read-only audit and recommends cleaning up Profile before the Friends UI experiment.
- `T-033` is now accepted and merged into `main`: tighter Profile hierarchy, simpler Friends gate flow, reduced administrative density, and improved shared CTA typography without changing the accepted identity or auth model.
- `T-024` reward-display selection remains preserved but intentionally deferred until after the accepted transition foundation.
- `T-028` beta security and production readiness audit is now one of the first explicit `S4` priorities.
- `T-029` app and firmware update strategy is also a first explicit `S4` priority because wider distribution without a clear update model is operationally risky.
- `T-034` now packages the first publish-readiness planning pass across deployment, security, and update strategy.
- `T-034` is now accepted as planning-complete enough to start implementation slices.
- `T-035` is now accepted on `codex/s4-transport-trust-and-device-identity` as the first implementation slice coming out of launch planning.
- `T-035` fixed the shipped firmware trust path: no `setInsecure()` in firmware, no fleet-shared MQTT credential model, broker ACLs now exist, and runtime self-reregistration is removed from the field-device path.
- `T-035` is still operationally incomplete until the hosted beta stack has the new migration applied, real CA PEM material in the ignored firmware headers, and a rendered or installed Mosquitto `passwords.txt` generated from the new credential source.
- `T-036` is now accepted on `codex/s4-release-operations-baseline`: the migration is applied, the broker password render/install flow is live, the hosted command loop is proven, and the hosted MQTT reconnect path is now real on the hardened model.
- `T-037` is now accepted on the same branch: both beta boards reconnect over TLS on per-device MQTT usernames, the broker helper now forces a Mosquitto recreate after password sync, and MQTT prefers `mqtt-beta.addone.studio` instead of the raw IP bootstrap path.
- `T-038` is now accepted on `codex/s4-firmware-ota-safety`: the OTA safety contract is locked in-repo, the dual-slot OTA partition layout is tracked explicitly in the firmware build, and the OTA release envelope is concrete enough for implementation.
- `T-039` is now accepted on `codex/s4-firmware-ota-control-plane`: the release registry schema, OTA progress sink, trigger path, and same-target in-progress re-check enforcement are now aligned with the frozen `T-038` safety contract.
- `T-040` is now accepted on `codex/s4-firmware-ota-client`: the firmware now has a concrete OTA client path for HTTPS release checks, inactive-slot staging, provisional boot, local confirmation, and rollback reporting, but it is compile-proven rather than hardware-proven.
- `T-041` now has a blocked checkpoint on `codex/s4-firmware-ota-validation`: the real immutable firmware artifact and release envelope exist, but the hosted beta backend still does not expose `devices.firmware_channel`, `firmware_releases`, or `check_device_firmware_release(...)`, so the real OTA device loop cannot enter the accepted control plane yet.
- Residual rollout notes remain, but they are no longer `T-036`/`T-037` blockers:
  - keep the broker cert SAN aligned with `mqtt-beta.addone.studio`
  - repair the public `gateway-beta.addone.studio` HTTPS path before relying on it externally
  - tighten Mosquitto host-file ownership and mode warnings before broader rollout
- `T-041` remains the active slice, but it is currently blocked on hosted environment drift: the accepted `T-039` OTA control-plane migration is not actually applied on the beta backend.
- `T-008` and `T-011` are intentionally deferred while release planning and hardening take priority.
- `T-018` is now accepted and no longer a lifecycle blocker.
- `T-021` is now accepted as the first beta factory-station checkpoint, but it still needs stable-release promotion, broader bench validation, and security hardening follow-up before wider operator use.
- Friends realtime subscriptions still show noisy `SUBSCRIBED` / `CLOSED` churn and occasional `CHANNEL_ERROR` binding mismatches in development logs, but the verified owner/viewer flows complete successfully, so that is follow-up polish rather than a `T-001` blocker.
- The timezone implementation loop still needs its revision pass accepted if that surface stays in the active UI queue.
- Onboarding and Wi-Fi recovery still need the final polish slice, but the remaining work is now polish rather than core lifecycle correctness.
- The device offline or Wi-Fi reconnect issue is still unresolved and should be treated as a real device-validation problem, not a fake app state problem.
- `main` is now fully backed up on GitHub, so there is no current backup gap.

## Fresh Agent Read Order

1. [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
2. [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
3. The current active stage note
4. [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
5. [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
6. The assigned task brief
7. Only the scoped product, contract, and implementation docs named in that brief

## Recovery Rules

- If the existing plan becomes outdated, revise the docs before delegating more work.
- If a report lacks the required proof, the outcome is `revise and retry`, not `accepted`.
- If a stage depends on secrets, infrastructure, or accounts outside the repo, record the dependency explicitly and mark the work `blocked` if proof cannot be completed.
- Prefer updating durable docs over relying on coordinator chat memory.
- If accepted state is committed but not pushed, record the backup gap explicitly until it is resolved.
