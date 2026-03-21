# AddOne Project Memory

Last updated: March 18, 2026

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
- Git reliability rules live in [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md).
- The live execution queue remains [Active_Work.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Active_Work.md).
- Stage memory now lives under [Docs/stages](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages).
- Worker-facing execution tasks remain under [Docs/tasks](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks).
- Worker reports remain under [Docs/agent-reports](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports).
- `origin` is configured as the GitHub remote for this repo.
- UI work in this repo must use the `building-native-ui` skill in `.agents/skills/building-native-ui/SKILL.md`.

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

## Current Repo Reality

- The app already has real auth, onboarding, Wi-Fi recovery, board-first home, settings `Draft + Apply`, and history `Draft + Save`.
- The app reads live runtime state from `device_runtime_snapshots` and Supabase realtime.
- The firmware v2 foundation exists with AP provisioning, claim redemption, heartbeat, MQTT realtime subscribe, fallback poll, and runtime snapshot upload.
- The realtime gateway exists and mirrors queued commands plus device-side runtime/presence events.
- The `Friends` tab is still visible placeholder UI even though the backend already has sharing primitives.
- Hosted beta documentation and config shape exist, but the full hosted baseline is not yet trusted enough to unblock real-device validation without ambiguity.
- The current profile surface is still just the email or demo session and a sign-out action.
- The backend profile model currently exposes `profiles.display_name` rather than a richer username or first/last-name shape.
- The accepted timezone audit confirms that the device timezone is the canonical scheduling/reset setting across app, backend, runtime projection, and firmware, while unsupported timezones still fall back to Los Angeles rules on-device because firmware only maps a small supported subset today.

## Current Active Stage

- `S3: Beta UI Completion And Social Shape`
- Stage note: [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- Next brief: [B-002-stage-s3-ui-audit-and-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/briefs/B-002-stage-s3-ui-audit-and-lock.md)
- First execution task: [T-005-beta-ui-audit-and-scope-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-005-beta-ui-audit-and-scope-lock.md)

## Current Blockers

- The main screen and settings still need a coordinated polish pass rather than isolated fixes.
- Onboarding and Wi-Fi recovery need a durable issue log and polish plan before implementation gets split.
- The profile identity model is not locked yet.
- The friends beta shape still has contradictory ideas and no accepted first-user connection model yet.
- The beta timezone policy is not locked yet: we still need to choose between a supported-zone picker with explicit fallback messaging or broader firmware timezone support.
- Release hardening and validation stages now depend on this UI lock pass being explicit enough to hand off cleanly.
- GitHub is not yet a full backup of the current local branch state because `codex/ui-skin-main-screen` is ahead of origin.

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
