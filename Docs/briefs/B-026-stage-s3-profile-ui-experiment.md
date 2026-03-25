# B-026: Stage S3 Profile UI Experiment

Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-profile-ui-experiment`

Stable baseline:
`main` is the official stable branch at the restore point tagged `ui-experiment-start-20260325`. Do not work directly on `main`.

Mode:
This is an implementation experiment. Keep it narrow enough that we can keep it or discard it cleanly.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-033-profile-ui-experiment-hierarchy-and-gate-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-033-profile-ui-experiment-hierarchy-and-gate-polish.md)
- [2026-03-25-profile-ui-audit-and-redesign-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-25-profile-ui-audit-and-redesign-plan.md)
- [2026-03-19-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-profile-identity-model-and-account-surface.md)
- [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)

Goal:
Improve the Profile surface with one narrow experiment: fix first-glance hierarchy, simplify the Friends gate path, and reduce administrative density without changing the accepted identity or auth model.

Priority targets:
1. In `from=friends` mode, make one obvious completion flow.
2. Put social identity first and account context second.
3. Trim repeated helper and status copy.
4. Keep the screen visually aligned with Home, Friends, and Settings instead of reading like a form-heavy admin page.

Required proof:
- `npm run typecheck`
- manual UI proof of:
  - normal profile state
  - `from=friends` gate state
- exact files changed
- explicit note of:
  - hierarchy changes
  - copy-density changes
  - anything intentionally left alone to avoid churn

Non-negotiables:
- Keep this slice narrow and reversible.
- Do not change auth flow.
- Do not change backend schema.
- Do not widen into Friends feature work, onboarding redesign, or settings redesign.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the master plan, the stage register, or `Active_Work.md`.

Iteration rule:
- This is explicitly an experiment.
- Expect live UI iteration with the user.
- The final report must reflect the final branch state after that iteration, not the first implementation pass.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
