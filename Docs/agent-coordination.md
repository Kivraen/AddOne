# AddOne Agent Coordination

Last updated: March 20, 2026

This file defines how AddOne uses the coordinator-led stage workflow.

## Canonical Coordination Files

- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md): canonical master plan and project phase narrative
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

## UI Work Rule

- Every UI-facing task must explicitly require the `building-native-ui` skill in `.agents/skills/building-native-ui/SKILL.md`.
- UI briefs should bias toward native Expo Router patterns, safe-area-correct scroll roots, native tabs conventions, and restrained black-glass styling that fits the existing AddOne shell.
- Do not accept UI work that ignores the current visual direction or regresses the native navigation structure.

## Default Coordinator Loop

1. Confirm the active stage and the next execution task that belongs to it.
2. Generate or refresh a copy-paste brief for that task.
3. Delegate narrow work with explicit success metrics, required proof, and non-negotiables.
4. Review the returned report against the active stage note.
5. Decide only one of:
   - `accepted`
   - `revise and retry`
   - `blocked`
6. Update project memory, stage notes, the stage register, and the active-work registry.
7. Commit accepted or materially updated coordination state without mixing unrelated changes.
8. Push the durable checkpoint if the remote is available, or record why it is not pushed yet.

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
- report format

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

## Review Rules

- `accepted`: the report's evidence satisfies the active stage success metrics and proof requirements
- `revise and retry`: the work moved forward, but the proof is incomplete, the scope drifted, or the docs were not updated enough to accept
- `blocked`: the work cannot finish without an external dependency or a new coordinator decision

Do not advance a stage on implementation claims alone.
If a remote exists, acceptance should also consider whether the durable checkpoint has been pushed or whether the reason it is not pushed is recorded.

## Commit Policy

- Commit important accepted coordination state and accepted implementation state so git becomes durable project memory.
- Keep coordination commits scoped.
- Never absorb unrelated dirty files into a stage acceptance commit.
- Push accepted durable checkpoints when appropriate because this repo has a GitHub remote.
- Before risky multi-file changes or overnight stopping points, prefer checkpoint commits and optional tags.
- Keep `main` as the stable official branch and start new implementation slices from a fresh branch off `main`.
- Use worktrees only for explicit parallel tracks or when the user wants two active checkouts at once.
