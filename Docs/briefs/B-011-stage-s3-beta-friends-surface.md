# B-011: Stage S3 Beta Friends Surface

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
- [T-009-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-009-profile-identity-model-and-account-surface.md)
- [2026-03-19-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-profile-identity-model-and-account-surface.md)
- [friends-beta-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/friends-beta-plan.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Replace the placeholder Friends lane with the first real beta sharing flow: profile-gated code sharing, owner approval, and live read-only board browsing.`

Success metrics:
- The visible `Friends` tab is no longer placeholder copy.
- A completed-profile user can enter a share code, request access, and browse approved shared boards in one coherent flow.
- Owners can see the share code, pending requests, and approved viewers for the active board.
- The implementation stays within the first-beta social floor and does not drift into feed, reactions, comments, or open discovery.

Required proof:
- `npm run typecheck`
- manual UI proof for:
  - incomplete profile user is still gated to Profile
  - no linked boards / empty state
  - pending requests present
  - approved viewers present
  - shared boards present and read-only
- exact files changed
- explicit note of whether the existing sharing RPCs were sufficient or whether one narrow backend follow-up is still needed

Non-negotiables:
- Use the `building-native-ui` skill.
- Reuse the existing code-based sharing and approval model where possible.
- Do not widen this into feed, reactions, comments, threaded discussion, challenge groups, or username discovery.
- Do not redesign profile identity again inside this task.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.

Scope:
- In scope: Friends entry flow, share-code request flow, owner sharing controls, pending requests, approved viewers, shared-board browsing, and clean loading/empty/error states.
- Out of scope: feed, reactions, comments, notifications, challenge groups, onboarding polish, and auth redesign.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in [T-001-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-001-beta-friends-surface.md).
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
