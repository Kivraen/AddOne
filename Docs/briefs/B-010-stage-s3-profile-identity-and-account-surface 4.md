# B-010 Stage S3 Profile Identity And Account Surface

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Required skill:
- `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/tasks/T-009-profile-identity-model-and-account-surface.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/AddOne_Backend_Model.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Implement the social-facing profile identity layer that first-beta Friends now depends on.

Success metrics:
- the profile surface supports `display_name` plus unique `username`
- Friends can rely on the profile being complete before entry
- backend or repository support exists for uniqueness and retrieval
- the result is scoped and beta-appropriate

Required proof:
- exact files changed
- commands run
- manual proof for creating or editing the social profile
- uniqueness validation proof
- repo-wide `npm run typecheck`
- durable report in `Docs/agent-reports/`

Non-negotiables:
- use `.agents/skills/building-native-ui/SKILL.md`
- do not implement username search or discovery
- do not broaden into Friends implementation in the same slice
- do not rewrite coordinator-owned docs directly
