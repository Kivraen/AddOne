# AddOne Main Plan

Last locked: March 27, 2026

This is the canonical master plan for AddOne.
Use it to answer:
- where the project stands right now
- which stage is active right now
- which docs are source-of-truth vs reference-only
- what the next workstreams are
- how to split work across agents and keep handoffs clean
- where agent reports should live after each task

If this file conflicts with older planning or status notes, this file wins.
Product decisions still defer to [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md).
Stage memory and coordinator workflow now live under [Docs/stages](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages), [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md), and [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md).

## Source Of Truth Map

### Live product and engineering docs
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [master-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/master-plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [Docs/Active_Work.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Active_Work.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
- [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md)
- [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
- [AddOne_Runtime_Simplification_Reset.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Simplification_Reset.md)
- [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [services/realtime-gateway/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/README.md)
- [supabase/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/README.md)
- [Docs/tasks/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/README.md)
- [Docs/agent-reports/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/README.md)

### Reference-only background docs
- [PROJECT_HABIT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/PROJECT_HABIT.md)
- [AddOne_Full_Session_Knowledge.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Full_Session_Knowledge.md)
- [AddOne_Page_Architecture_v3.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Page_Architecture_v3.md)
- [BRAND_HABIT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/BRAND_HABIT.md)
- [MARKET_PAIN.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/MARKET_PAIN.md)
- [COMPETITORS.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/COMPETITORS.md)
- [Docs/Reserch](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Reserch)

These are useful context, but they are not the live engineering plan.

Ignore for current planning:
- `.claude/worktrees/**`

Those files are duplicate worktree snapshots and should not be treated as the current doc set.

## Current Phase
- AddOne is in `post-architecture, pre-beta validation`.
- The stage-coordinator system is now active.
- The current active stage is `S4: Beta Hardening And Durable Release Memory`.
- The recovered latest UI baseline is now restored, promoted to `main`, and verified through a working TestFlight install.
- The core app, backend, realtime gateway, and firmware v2 foundations are now real.
- The remaining work is mostly:
  - production deployment readiness planning
  - security hardening
  - app and firmware update strategy
  - always-on beta environment bring-up
  - real-device and router validation
  - doc cleanup that reflects the current codebase

## Stage Map

- `S0: Coordination Bootstrap` -> accepted
- `S1: Validation Baseline Ready` -> pending
- `S2: Trusted Real-Device Validation` -> pending
- `S3: Beta UI Completion And Social Shape` -> pending
- `S4: Beta Hardening And Durable Release Memory` -> active

See [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md) for the live stage map and [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) for the current gate.

## Current Active Stage

- `S4: Beta Hardening And Durable Release Memory`
- Goal:
  make AddOne publish-ready by auditing the real deployment path, security posture, and app or firmware update model before more feature or polish work resumes.
- Current execution brief:
  `T-045` publish blocker remediation and release-candidate rerun
- Current execution task:
  treat `T-035`, `T-036`, and `T-037` as the accepted hardened rollout baseline, treat `T-038` as the accepted OTA safety baseline, treat `T-039` as the accepted backend control-plane baseline, treat `T-040` as the accepted firmware OTA client baseline, treat `T-041` as the accepted real OTA validation baseline on immutable release `fw-beta-20260327-05`, treat `T-042` as the accepted minimum owner-facing update surface, treat `T-043` as the accepted operator rollout/rollback baseline, and treat `T-044` as the accepted blocker audit baseline; then finish the single remaining iOS artifact blocker on `T-045` before rerunning the release-candidate matrix and moving to store-submission prep, while keeping Android on a follow-up track unless it is intentionally pulled back into the same launch wave
- Parallel exception:
  `T-046` is now accepted as a narrow UI-only cleanup slice and does not change the current release gate; weekly-minimum semantics, offline-sync reliability, and broader Friends-controls redesign remain later follow-up work
  `T-047` is now also accepted as a bounded user-guided RC UI iteration slice on top of `T-046`; it improves the Friends actions surface plus adjacent Home and settings UI, carries one small confirmation-path stabilization in `hooks/use-devices.ts`, and still does not change the blocked `T-045` iOS-artifact gate
- Git durability note:
  `main` now includes the accepted T-027 celebration slice plus the accepted T-033 Profile polish slice, `origin/main` matches it, and `S4` should start from this merged baseline while remaining `S3` polish stays deferred.

## Where We Are Now

### App
- Real cloud-backed app exists with auth, onboarding, Wi-Fi recovery, board-first home, settings `Draft + Apply`, and history `Draft + Save`.
- The shared setup flow is now stabilized on real hardware, `Reset history` now means `Start new habit` with backend era preservation, and destructive factory reset plus fresh re-add now work end to end on physical hardware.
- App runtime reads from `device_runtime_snapshots` and listens for snapshot and device updates through Supabase realtime.
- Current scope drift:
  - the home pager still exposes `Friends` and `Profile` tabs
  - `Profile` now has the friend-facing social identity model and the Friends entry gate
  - the March 25 Profile audit concluded that Profile should be cleaned up before the Friends UI experiment because the current gate target is too dense and admin-first
  - the March 25 Profile experiment is now merged into `main`: cleaner hierarchy, simpler `from=friends` CTA flow, quieter account treatment, and stronger CTA typography across the shared button family
  - `Friends` now has the profile gate and an accepted beta implementation of code-sharing and live read-only shared boards, merged into `main`
  - a reusable board transition plus friend-triggered temporary board reveal is now merged into `main`, including the transition library, per-board settings, preview controls, and extended dwell options
  - later reward-display choice is preserved as a separate follow-up, not part of the accepted celebration slice
  - the main surfaced history flow is now the inline board editor from device settings, while the dedicated `/history` route still exists in code

### Backend and cloud
- Supabase migrations cover onboarding, device-authoritative runtime, runtime snapshots, Wi-Fi recovery, realtime publication, and custom palette snapshot fields.
- The app already uses real repository-backed reads and writes.
- The realtime gateway now handles both directions:
  - `Supabase queued commands -> MQTT`
  - `MQTT ack / presence / day-state / runtime snapshots -> Supabase RPCs`
- The TestFlight path is now real and working for the recovered latest app baseline.
- The beta backend now also has factory preregistration support plus `factory_device_runs` records for bench QA notes and ship-ready signoff.
- The first `S4` hardening slice now exists on `codex/s4-transport-trust-and-device-identity`: firmware HTTPS/MQTT fail closed without CA material, devices fetch per-device MQTT credentials over authenticated HTTPS, broker ACLs isolate device topics, and runtime self-reregistration is removed from the field-device path.
- The hosted rollout follow-up now exists on `codex/s4-release-operations-baseline`: the migration is applied, the broker password render/install flow is live, and one hardened device completed a hosted command/apply loop, but MQTT TLS acceptance is still failing and blocks acceptance of that slice.
- The hosted rollout baseline on `codex/s4-release-operations-baseline` is now accepted: migration applied, broker password render/install flow fixed, both beta boards on per-device MQTT credentials, and MQTT cut over to `mqtt-beta.addone.studio`.
- The OTA safety baseline on `codex/s4-firmware-ota-safety` is now accepted: the safety contract is explicit, the OTA partition layout is tracked, and the release envelope is concrete enough for implementation.
- The OTA control-plane branch on `codex/s4-firmware-ota-control-plane` now contains the release registry, OTA progress sink, and trigger path, but it still needs one more safety-enforcement pass before acceptance.
- The public gateway hostname still needs server-side repair before it becomes the external health target, and the Mosquitto host-file ownership warnings still need cleanup, but those are now residual operator items rather than launch-baseline blockers.
- Remaining backend work is mostly hosted-beta validation and hardening, not foundational schema design.

### Firmware
- Firmware v2 exists in a clean workspace with AP provisioning, claim redemption, heartbeat, fallback command poll, MQTT realtime subscribe, runtime snapshots, local button handling, settings sync, and reward rendering.
- Button handling and normal board rendering now run separately from blocking cloud work through the background sync task.
- A first beta factory station now exists off the main app path:
  - approved-manifest flashing
  - local Node plus browser operator flow
  - firmware manufacturing-QA serial commands for button, LED, ambient, RTC, and final ship-ready reset
- Remaining firmware work is real-device validation, broker and beta config validation, telemetry polish for celebration playback, and later custom reward asset sync.

## Main Plan
1. Lock first-user beta scope.
- audit and close the remaining UI gaps on the visible beta surfaces
- lock the first-user profile identity model
- create and accept a dedicated friends planning checkpoint before implementation:
  - current beta target
  - deferred social layers
  - backend starting point and likely gaps
- implement the friend-facing profile identity layer that `Friends` now depends on
- Define and implement the first-user beta `Friends` / sharing scope instead of treating it as placeholder UI:
  - deliberate linking between people
  - browsing friends' boards and progress
  - one bounded lightweight social lane for beta
- Preserve the post-beta challenge-group direction so the beta social implementation does not block:
  - shared-goal groups
  - aggregated group boards
  - challenge communication
- Pick one history-editing surface as the real shipped path and align docs and code around it.
- add the next beta-visible social and reward foundation slice:
  - reusable random dissolve board transition
  - friend-triggered temporary board reveal on connected devices
  - after that foundation, keep selectable `Clock` vs preset-backed `Artwork` reward display as a separate later slice
  - keep AI generation behind the local artwork model
- defer remaining onboarding or Wi-Fi recovery polish and timezone revision until publish-readiness planning determines whether either is a real release blocker
- Rewards are now explicitly in beta scope; reminders and broader multi-device UX remain out unless we explicitly bring them in.

2. Bring the hosted beta stack fully online.
- Confirm beta app config, gateway env, broker credentials, and firmware beta headers.
- Validate `device_runtime_snapshots` realtime publication and gateway health.
- Remove laptop dependency from normal app and device testing.

3. Run a real-device validation pass.
- Onboarding across different Wi-Fi networks
- Today toggle latency and reliability
- History save behavior
- Settings apply behavior
- Wi-Fi recovery
- Offline to reconnect healing
- Realtime and polling fallback behavior

4. Harden for beta and production rollout.
- accept and checkpoint the transport trust and device identity baseline
- clean release operations and the hosted launch baseline on top of that hardened transport path
- resolve the hardened-device MQTT TLS acceptance and finish reprovisioning the second beta device off the legacy fleet credential
- lock the firmware OTA safety model and release contract
- build the OTA control plane in Supabase
- implement the firmware OTA client
- host the immutable OTA artifact and prove the OTA path on real hardware
- add the minimum app update and status surfaces
- build operator rollout and rollback tooling
- run internal, then small-cohort, then broader launch validation

## Delegation Model

Only one stage is active at a time unless the user explicitly opens a parallel track.
The split below is the default domain ownership map used when the active stage is delegated. It is not a standing instruction to run parallel active tracks.

## Suggested Agent Split

### Agent A: App scope and UX cleanup
Owns:
- `app/`
- `components/`
- `hooks/`
- UI tasks in this area must use `.agents/skills/building-native-ui/SKILL.md`

Primary goals:
- implement the planned `Friends` / sharing surface:
  - connection flow
  - friend-board browsing
  - bounded beta social lane
- reconcile inline history editor vs dedicated route
- polish onboarding and recovery copy and states after validation findings

### Agent B: Beta infrastructure
Owns:
- [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [AddOne_Beta_Hosting_Recommendation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Hosting_Recommendation.md)
- `services/realtime-gateway/`
- `deploy/beta-vps/`
- beta env examples
- [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
- [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json)

Primary goals:
- hosted broker and gateway bring-up
- beta config audit
- deployment checklist and rollback notes

### Agent C: Firmware and hardware validation
Owns:
- `firmware/`
- device-facing contract docs when firmware behavior changes

Primary goals:
- real-device validation
- AP and recovery reliability
- realtime vs fallback behavior
- firmware bugs found during validation

### Agent D: Backend, data, and docs integrity
Owns:
- `supabase/`
- `lib/supabase/`
- docs that describe contracts and current project state

Primary goals:
- keep schema and contract docs current
- confirm runtime snapshot mirror behavior
- track beta vs production environment split decisions
- remove stale planning text that no longer matches code

## Agent Handoff Contract
Every agent report should include:
- `Goal`
- `Owned files`
- `Docs used as source of truth`
- `What changed`
- `Verification performed`
- `Open issues or follow-ups`
- `Doc updates made or still needed`

Rules:
- Each agent gets only the docs and files relevant to its task.
- Do not hand every agent the full session dump unless the task is brand or copy related.
- If a task changes product behavior or delivery flow, update the matching doc in the same task.
- If a finding affects another agent, record it here or in the canonical spec instead of leaving it only in chat.
- Store one short handoff report per finished task under [Docs/agent-reports](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports).
- Write one handoff report in [Docs/agent-reports/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/README.md) format when the task finishes.
- Keep the live queue in [Docs/Active_Work.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Active_Work.md) and the decision-complete worker briefs in [Docs/tasks](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks).

## Recommended Context Packages
- For app UI work, provide:
  - [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
  - [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
  - only the relevant app files
- For firmware and runtime work, provide:
  - [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
  - [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md)
  - [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - [AddOne_Runtime_Simplification_Reset.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Simplification_Reset.md)
  - [AddOne_Runtime_Consistency_Rebuild.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Runtime_Consistency_Rebuild.md)
  - only the relevant firmware files
- For infra work, provide:
  - [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
  - [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [AddOne_Beta_Hosting_Recommendation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Hosting_Recommendation.md)
  - the relevant gateway and deploy files

## Update Rule
- After any meaningful task lands, update this file if the project phase or priorities changed.
- Update the stage register and the active stage note when a stage is accepted, blocked, or revised.
- Update the canonical spec if user-visible scope changed.
- Update the contract doc if app, cloud, or firmware behavior changed.
