# AddOne Agent Coordination

Last updated: April 4, 2026

This file defines how AddOne uses the coordinator-led stage workflow.

## Canonical Coordination Files

- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md): canonical master plan and project phase narrative
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md): AddOne-specific visual and UX direction for all user-facing work
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md): stable facts and accepted coordination decisions
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md): git and GitHub reliability rules plus current backup status
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md): current stage map and active stage pointer
- Current active stage note under [Docs/stages](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages)
- [Active_Work.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/Active_Work.md): live execution queue
- [Docs/tasks](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks): decision-complete worker task briefs
- [Docs/agent-reports](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports): durable worker reports

## Operating Rules

- One active stage at a time unless the user explicitly opens a parallel track.
- Stages are outcome gates. Tasks are execution units inside a stage.
- Treat repo docs and git history as one memory system.
- Only the coordinator updates:
  - `Docs/project-memory.md`
  - `Docs/git-operations.md`
  - `Docs/stages/stage-register.md`
  - stage note status and recommendation
  - `Docs/AddOne_Main_Plan.md`
  - `Docs/Active_Work.md`
- Workers may update scoped implementation files and scoped product or engineering docs named in the brief.
- Workers do not advance a stage by themselves.
- If a beta-scope product slice is implemented on the task branch, the coordinator treats it as part of the candidate beta surface even if acceptance is still pending proof.
- `Revise and retry` means preserve the implementation checkpoint, record the missing proof or support work, and continue from that state unless the user explicitly wants rollback.
- User-facing execution work is iterative by default. A worker should not assume the first implementation pass is the final accepted result.
- For visible product work, a task is only truly ready for coordinator review when:
  - the user explicitly says the current result is acceptable, or
  - the user explicitly wants a checkpoint review even though more iteration may follow.
- If the user keeps refining a worker-owned slice after the first pass, the worker report must be refreshed so it reflects the actual final state of the branch, the user's feedback, and the decisions made during iteration.

## UI Work Rule

- Every UI-facing task must explicitly require the `building-native-ui` skill in `.agents/skills/building-native-ui/SKILL.md`.
- Every UI-facing task must explicitly require [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md) as a read-first source of truth for taste, hierarchy, copy density, and interaction choices.
- UI briefs should bias toward native Expo Router patterns, safe-area-correct scroll roots, native tabs conventions, and restrained black-glass styling that fits the existing AddOne shell.
- Do not accept UI work that ignores the current visual direction or regresses the native navigation structure.

## Native App Proof Rule

- For native app visual proof in this repo, default to simulator-first validation, not Playwright-first validation.
- On this machine, local Expo or Metro work should use Node 22 (`/opt/homebrew/opt/node@22/bin/node`) unless there is a concrete reason not to. Do not default to Node 24 for local AddOne simulator work.
- If Expo shows a macOS popup saying `React Native DevTools quit unexpectedly`, treat that as external debugger noise first, not as proof that the AddOne app crashed.
- Preferred proof path for Expo app screens:
  - check whether Metro is already running and reuse it if possible
  - boot or open the iOS Simulator
  - open the app route in the simulator via `xcrun simctl openurl booted <exp://...>` or the installed app target
  - capture proof with `xcrun simctl io booted screenshot ...`
- Use Playwright only for:
  - true web surfaces
  - external hosted pages
  - cases where the proof target is not a native Expo screen
- Do not default to browser or Chrome automation for native AddOne app proof when the same proof can be captured from the simulator.
- If simulator proof is blocked, the worker should say exactly what is blocked instead of silently switching to browser proof.

### Local Simulator Startup Rule

Incorrect local actions from the April 5 simulator regression:

- starting Expo or Metro with the shell-default Node 24
- treating the `React Native DevTools quit unexpectedly` popup as proof that AddOne crashed
- changing checked-in Expo config files like `app.config.js` or `metro.config.js` before first restoring the known-good runtime path
- assuming Expo Go is disconnected just because the first cold Hermes bundle is slow after cleanup or repo moves

Correct local setup on this machine:

1. Reset local watcher and Expo state:
   - `watchman watch-del-all`
   - `watchman watch-project /Users/viktor/Desktop/DevProjects/Codex/AddOne`
   - `rm -rf .expo`
2. Start Metro under Node 22:
   - `env EXPO_NO_DEPENDENCY_VALIDATION=1 EXPO_NO_GIT_STATUS=1 /opt/homebrew/opt/node@22/bin/node node_modules/.bin/expo start --host lan --clear`
3. Attach iOS Expo Go:
   - `xcrun simctl launch booted host.exp.Exponent`
   - `xcrun simctl openurl booted 'exp://<LAN-IP>:8081'`
4. Attach Android Expo Go:
   - `adb reverse --remove-all`
   - `adb reverse tcp:8081 tcp:8081`
   - `adb shell am start -a android.intent.action.VIEW -d 'exp://<LAN-IP>:8081' host.exp.exponent`

Expected behavior:

- iOS and Android may take time on the first cold bundle after cache resets
- Android may show `127.0.0.1:8081` inside Expo Go; that is valid when `adb reverse tcp:8081 tcp:8081` is active
- if Metro stays alive and the bundle continues compiling, wait for the first cold attach before changing repo config

Copy-paste brief snippet for native UI tasks:

```md
Native proof rule:
- For native AddOne app proof, prefer Metro + iOS Simulator, not Playwright/browser automation.
- For local Expo or Metro runs on this machine, use Node 22 (`/opt/homebrew/opt/node@22/bin/node`) unless a task proves another runtime is safe.
- If macOS shows `React Native DevTools quit unexpectedly`, do not treat that as an AddOne crash without separate app evidence.
- Before starting a new dev server, check whether Metro is already running and reuse it if possible.
- Preferred proof flow:
  1. verify or start Metro
  2. open or boot the iOS Simulator
  3. open the target route with `xcrun simctl openurl booted <exp://...>` or the installed app target
  4. capture proof with `xcrun simctl io booted screenshot ...`
- Use Playwright only if the proof target is a real web surface or an external hosted page.
- If simulator proof is blocked, say exactly what is blocked instead of switching silently to browser proof.
```

## Hosted Backend Access Rule

- On this machine, workers should assume hosted backend access is available unless a concrete command proves otherwise.
- Do not claim "no backend access" or skip backend work preemptively.
- For `S4`-style work, the normal backend paths are:
  - linked Supabase migrations from repo-local files in `supabase/migrations/`
  - read-only or write RPC checks against the hosted beta Supabase project
  - beta VPS checks or deploys under `deploy/beta-vps/`
- If a worker needs backend work, the default expectation is to try the real command first and only report lack of access if it actually fails.

### Supabase Workflow

- Create or edit migrations under `supabase/migrations/`.
- Apply linked hosted migrations with:
  - `npx supabase db push --linked`
- Inspect migration state with:
  - `npx supabase migration list`
- Use local reset or local debug only when the task actually needs it:
  - `npx supabase db reset`
  - `npx supabase start --debug`

### Hosted Beta Env Workflow

- Source hosted beta environment values from:
  - `.codex-tmp/realtime-gateway.env`
- Standard shell pattern:

```bash
set -a
source .codex-tmp/realtime-gateway.env
set +a
```

- After sourcing, use `curl` against:
  - `$SUPABASE_URL/rest/v1/...`
  - `$SUPABASE_URL/rest/v1/rpc/...`
- Use the correct auth headers for the task, typically the service-role key for operator or migration-adjacent checks.

### VPS Workflow

- Beta VPS access from this machine is already part of the established workflow:
  - `ssh root@72.62.200.12`
- Hosted broker or gateway deploy files live under:
  - `deploy/beta-vps/`
- Do not assume VPS work is blocked unless SSH or the required remote command actually fails.

Copy-paste brief snippet for backend-capable tasks:

```md
Hosted backend access rule:
- On this machine, assume hosted backend access is available unless a real command fails.
- For Supabase schema work, use repo-local migrations in `supabase/migrations/` and apply them with `npx supabase db push --linked`.
- For hosted beta checks, source `.codex-tmp/realtime-gateway.env` and use `curl` against `$SUPABASE_URL/rest/v1/...` and `$SUPABASE_URL/rest/v1/rpc/...`.
- For beta VPS work, use `ssh root@72.62.200.12` and the files under `deploy/beta-vps/`.
- Do not report "no backend access" unless the actual command path fails.
```

## Default Coordinator Loop

1. Confirm the active stage and the next execution task that belongs to it.
2. Generate or refresh a copy-paste brief for that task.
3. Delegate narrow work with explicit success metrics, required proof, and non-negotiables.
4. Keep user-facing execution work in iteration mode until the user approves the result or explicitly asks for a checkpoint review.
5. Review the returned report against the active stage note.
6. Decide only one of:
   - `accepted`
   - `revise and retry`
   - `blocked`
7. Update project memory, stage notes, the stage register, and the active-work registry.
8. Commit accepted or materially updated coordination state without mixing unrelated changes.
9. Push the durable checkpoint if the remote is available, or record why it is not pushed yet.

## Stage To Task Mapping

- `S0 Coordination Bootstrap` -> [T-000-project-dashboard-foundation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-000-project-dashboard-foundation.md)
- `S1 Validation Baseline Ready` -> [T-002-hosted-beta-bring-up.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-002-hosted-beta-bring-up.md)
- `S2 Trusted Real-Device Validation` -> [T-003-real-device-validation-pass.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-003-real-device-validation-pass.md)
- `S3 Beta UI Completion And Social Shape` -> [T-005-beta-ui-audit-and-scope-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-005-beta-ui-audit-and-scope-lock.md) as accepted entrypoint work, then [T-009-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-009-profile-identity-model-and-account-surface.md), then [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md), then later UI implementation batches
- `S4 Beta Hardening And Durable Release Memory` -> [T-004-truth-cleanup-after-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-004-truth-cleanup-after-validation.md)

## Required Brief Contents

Every delegated brief must include:

- repo path
- stage id and stage name
- stage goal
- exact success metrics
- required proof
- non-negotiables
- active stage note path
- scoped files and docs
- explicit proof-path preference when the task touches visible native app UI:
  - prefer Metro plus simulator plus `xcrun simctl` screenshots over browser automation
- report format
- explicit iteration rule for user-facing work when the slice is likely to need aesthetic or usability feedback
- AddOne-specific UI direction doc when the task changes visible product UI

## Required Report Format For Staged Work

Every staged worker report must include:

1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`

If the report is stored under `Docs/agent-reports`, keep the existing frontmatter and add the staged report block in the body.
For iterative work, `Changes made`, `Evidence`, and `Recommendation` must reflect the final branch state after user feedback, not only the first pass.

## Review Rules

- `accepted`: the report's evidence satisfies the active stage success metrics and proof requirements
- `revise and retry`: the work moved forward, but the proof is incomplete, the scope drifted, or the docs were not updated enough to accept
- `blocked`: the work cannot finish without an external dependency or a new coordinator decision

Do not advance a stage on implementation claims alone.
If a remote exists, acceptance should also consider whether the durable checkpoint has been pushed or whether the reason it is not pushed is recorded.
Do not treat `revise and retry` as a reason to discard implemented beta work; instead, preserve it, update the plan to include it, and define the exact next proof or support task.
If visible work changed materially after the original worker report, require a refreshed report before treating the checkpoint as coordinator-ready.

## Commit Policy

- Commit important accepted coordination state and accepted implementation state so git becomes durable project memory.
- Keep coordination commits scoped.
- Never absorb unrelated dirty files into a stage acceptance commit.
- Push accepted durable checkpoints when appropriate because this repo has a GitHub remote.
- Before risky multi-file changes or overnight stopping points, prefer checkpoint commits and optional tags.
- Keep `main` as the stable official branch and start new implementation slices from a fresh branch off `main`.
- Use worktrees only for explicit parallel tracks or when the user wants two active checkouts at once.
- If a beta-scope slice is implemented but not yet accepted, prefer a clearly labeled checkpoint commit on the task branch so the work is saved and the follow-up proof pass starts from a stable base.
