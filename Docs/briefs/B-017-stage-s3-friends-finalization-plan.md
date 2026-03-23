# B-017: Stage S3 Friends Finalization Plan

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s3-friends-finalization`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning and audit task. Do not jump into broad implementation. Start by mapping the current Friends feature and the exact proof gap that still blocks `T-001` acceptance.

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-001-beta-friends-surface.md`
- `Docs/tasks/T-020-friends-finalization-plan-and-proof-strategy.md`
- `Docs/agent-reports/2026-03-16-app-beta-friends-surface.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/AddOne_Backend_Model.md`
- `Docs/ui-beta-issue-log.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Planning goal:
Figure out how we are actually going to finish Friends from the current implementation, with a concrete proof strategy and execution plan.

What the user wants from this planning pass:
- understand exactly what the current Friends implementation already does
- identify what still blocks acceptance
- map the required proof states clearly
- understand what testing setup is needed:
  - one account vs two accounts
  - one device vs two devices
- identify whether any narrow fixes are still likely before acceptance
- avoid drifting into new social features that are still out of scope

Success metrics:
- explain the current Friends implementation with exact code references
- separate implemented behavior from unverified behavior
- produce a clean proof matrix for `T-001`
- recommend a concrete execution sequence for closing the Friends slice

Required proof:
- exact references to the current Friends implementation
- explicit coverage of the `T-001` required proof states
- a clear test-setup recommendation
- a recommended next implementation or verification step

Non-negotiables:
- This is a planning and audit task first, not a broad implementation pass.
- Do not widen scope into feed, reactions, comments, notifications, discovery, or challenge groups.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Stay grounded in the current codebase and reports, not generic social-product theory.

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine the plan with the user.
- Do not treat your first planning answer as final if the user is still shaping the Friends path.
- If you produce a report, it must reflect the final agreed planning state.

Required report format:
1. `Stage`
2. `Status`
3. `Current Friends implementation`
4. `Proof gap`
5. `Required test setup`
6. `Open risks / blockers`
7. `Recommended execution order`
