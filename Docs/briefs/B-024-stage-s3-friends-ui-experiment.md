# B-024: Stage S3 Friends UI Experiment

Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-friends-ui-experiment`

Stable baseline:
`main` is the official stable branch at the restore point tagged `ui-experiment-start-20260325`. Do not work directly on `main`.

Mode:
This is an implementation experiment. Keep it narrow enough that we can either keep it or discard it cleanly.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-031-friends-ui-experiment-clarity-and-technical-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-031-friends-ui-experiment-clarity-and-technical-polish.md)
- [B-023-stage-s3-ui-skill-informed-beta-ui-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/briefs/B-023-stage-s3-ui-skill-informed-beta-ui-audit.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Improve the Friends surface with one narrow experiment: clearer first-glance action hierarchy plus the most important technical UI cleanup found in the audit.

Priority targets:
1. Make one primary Friends action visible on the main tab instead of menu-first interaction.
2. Improve Friends safe-area and scroll handling.
3. Remove obvious rendering waste in the Friends board path if it can be done cleanly.
4. Keep navigation and overlays more native where practical, but do not widen scope into a redesign.

Success metrics:
- The main Friends tab has a more obvious next action.
- The surface is less fragmented at first glance.
- Safe-area and scroll handling are cleaner.
- Technical cleanup improves quality without changing product scope.
- The result still feels like AddOne, not a generic social app.

Required proof:
- `npm run typecheck`
- manual UI proof of the Friends main tab after the experiment
- exact files changed
- explicit note of:
  - product-clarity changes
  - technical UI changes
  - any behavior intentionally left alone because it would cause too much churn

Non-negotiables:
- Keep this slice narrow and reversible.
- Do not add new Friends features.
- Do not reopen social architecture.
- Do not drift into Profile, Home, onboarding, or settings redesign unless a tiny shared helper change is strictly required.
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
