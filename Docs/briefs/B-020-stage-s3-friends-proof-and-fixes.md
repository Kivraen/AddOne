# B-020: Stage S3 Friends Proof And Narrow Fixes

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-friends-proof-and-fixes`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md)
- [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md)
- [2026-03-24-friends-finalization-plan-and-proof-strategy.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-24-friends-finalization-plan-and-proof-strategy.md)
- [friends-beta-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/friends-beta-plan.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Close the `T-001` proof gap with a narrow Friends pass: make any small pre-proof fixes that are actually needed, then run the live two-account verification sweep and refresh the Friends report to match the final branch state.

Success metrics:
- The current Friends implementation is verified through fresh live proof, not only code inspection.
- The proof pack explicitly covers:
  - incomplete profile gate
  - owner empty state
  - no pending requests
  - pending requests
  - approved viewers
  - shared boards present and read-only
- Only narrow fixes are made.
- No new social scope is introduced.

Required proof:
- `npm run typecheck`
- fresh live manual proof for the six required `T-001` states
- exact files changed
- if any fix is needed, explain whether it was:
  - a verification-only repair
  - or a broader product gap
- update the existing report at [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md) so it reflects the final branch state

Non-negotiables:
- Treat this as a proof-and-fixes pass, not a new Friends feature pass.
- Do not widen into feed, reactions, comments, notifications, discovery, challenge groups, or messaging.
- Do not redesign Friends information architecture unless a concrete bug forces a minimal repair.
- Do not rewrite coordinator docs like `project-memory.md`, the master plan, the stage register, or `Active_Work.md`.
- If the empty-state preview fallback is misleading, fix that before claiming proof is complete.

Scope:
- In scope:
  - live verification
  - narrow Friends fixes uncovered by verification
  - empty-state truthfulness
  - Android entry-path repair only if it matters for the intended beta proof
- Out of scope:
  - new Friends features
  - backend redesign
  - feed/reactions/comments/challenges
  - onboarding polish
  - timezone work

Iteration rule:
- This task is collaborative and iterative by default.
- If the user gives live UI feedback during proof, incorporate it and keep the final report aligned to the actual branch state.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
