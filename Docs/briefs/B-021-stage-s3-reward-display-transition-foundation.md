# B-021: Stage S3 Reward Display And Transition Foundation

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`TBD from main before execution`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-024-reward-display-modes-and-transition-foundation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-024-reward-display-modes-and-transition-foundation.md)
- [2026-03-24-reward-display-and-friends-celebration-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Implement the first bounded reward-display expansion for beta: a real user-facing choice between `Clock` and `Artwork`, backed by a reusable board transition engine and preset artwork only.

Success metrics:
- The reward display is a visible user choice in settings.
- The device can switch cleanly into the selected reward display after a successful record.
- The transition language is reusable and not hardcoded only to one screen pair.
- The first `Artwork` mode is real and preset-backed, not the old generic paint-wave fallback.

Required proof:
- `npm run typecheck`
- exact files changed
- manual proof of:
  - selecting `Clock`
  - selecting `Artwork`
  - triggering both on the real device or a credible simulator-plus-device split where needed
  - the transition effect running cleanly
- explicit statement of firmware and backend contract changes

Non-negotiables:
- Keep this slice narrow.
- Do not widen into AI generation.
- Do not widen into the custom artwork editor.
- Do not widen into Friends ambient playback yet.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.

Iteration rule:
- This task is expected to iterate visually with the user.
- The final report must reflect the actual final branch state after visual feedback, not the first pass.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
