# B-010: Stage S3 Profile Identity And Account Surface

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
- [T-009-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-009-profile-identity-model-and-account-surface.md)
- [friends-beta-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/friends-beta-plan.md)
- [2026-03-19-friends-beta-plan-and-model-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Turn the current email-only account surface into the friend-facing profile model that Friends now depends on, without redesigning auth or widening into open discovery.`

Success metrics:
- The app has a real friend-facing identity model: required `display_name` and required unique `username`, with optional avatar/name fields as planned.
- Email stays private/auth-only and is no longer the only visible identity surface.
- A user who tries to open `Friends` without a completed social profile is routed into the expected gate/handoff cleanly.
- The implementation stays tightly scoped to profile identity and does not drift into full Friends sharing UI.
- If backend schema changes are required for unique usernames, they are narrow, explicit, and wired through the app cleanly.

Required proof:
- `npm run typecheck`
- manual UI proof for:
  - signed-in user with no completed social profile
  - signed-in user with completed profile
  - username uniqueness conflict
- `Friends` handoff when profile is incomplete
- exact files changed
- explicit note of any schema/repository addition required for unique usernames
- explicit note of whether `lib/supabase/database.types.ts` needed to be updated for the chosen schema change

Non-negotiables:
- Use the `building-native-ui` skill.
- Do not redesign `email OTP` auth.
- Do not add username search/discovery.
- Do not implement the full Friends sharing surface in this task.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.
- Do not mix unrelated device, onboarding, recovery, timezone, or TestFlight work into this task.

Scope:
- In scope: social profile model, account/profile UI, unique username support, and the Friends entry gate/handoff.
- Out of scope: board sharing implementation, feed/reactions/comments, challenge groups, onboarding polish, and auth redesign.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in [T-009-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-009-profile-identity-model-and-account-surface.md).
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.
- If you add a migration for usernames or profile shape, update the scoped contract docs and generated types in the same task.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
