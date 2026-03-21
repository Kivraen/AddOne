# B-012: Stage S3 Beta Friends Verification Pass

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-profile-identity`

Stable baseline:
`main` is the official stable branch and already includes the recovered latest UI baseline plus a working TestFlight install.
Do not work directly on `main`.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md)
- [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md)
- [friends-beta-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/friends-beta-plan.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Close the T-001 proof gap with a verification-only pass across the implemented Friends flow.`

Success metrics:
- The implemented Friends surface is verified through fresh manual runtime proof, not only code inspection.
- Each required T-001 state is exercised or explicitly reduced to a narrow blocker.
- No new social scope is added during this pass.

Required proof:
- `npm run typecheck`
- fresh manual UI proof for:
  - incomplete profile user is gated to Profile
  - no linked boards / empty state
  - no pending requests
  - pending requests present
  - approved viewers present
  - shared boards present and read-only
- exact files changed
- if any fix is needed, explain whether it was only a verification repair or a broader product gap

Non-negotiables:
- Use the `building-native-ui` skill.
- Treat this as a verification pass first, not a new implementation pass.
- Do not widen into feed, reactions, comments, notifications, challenge groups, or username discovery.
- Do not redesign the Friends information architecture unless a concrete bug forces a minimal repair.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.

Scope:
- In scope: verification, narrow bug fixes uncovered by verification, and scoped product/docs updates named by [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md).
- Out of scope: new Friends features, backend redesign, new migrations unless a concrete blocker is found, onboarding polish, and timezone work.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md).
- Update the existing report at [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md) instead of creating a second T-001 implementation report unless the coordinator explicitly asks for a new file.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
