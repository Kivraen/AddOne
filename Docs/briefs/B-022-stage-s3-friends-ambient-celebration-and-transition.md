# B-022: Stage S3 Friends Ambient Celebration And Transition

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
- [T-027-friends-ambient-celebration-playback.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-027-friends-ambient-celebration-playback.md)
- [2026-03-24-reward-display-and-friends-celebration-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md)
- [2026-03-16-app-beta-friends-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-16-app-beta-friends-surface.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Add one reusable board transition primitive and use it for the first ambient social celebration: when a connected friend records a habit, briefly reveal that friend's board on the physical device, then return to the owner's board cleanly.

Success metrics:
- The reusable random dissolve transition exists and is not hardcoded only to one screen pair.
- A connected friend's successful record can trigger a temporary board reveal on the owner's physical board.
- Timing, cooldown, and opt-in behavior feel controlled rather than chaotic.
- No broader Friends or reward scope is added.

Required proof:
- `npm run typecheck`
- exact files changed
- manual proof of:
  - the transition effect itself
  - one successful friend-triggered playback flow
  - clean automatic return to the owner's board
- explicit note of any backend or firmware contract additions

Non-negotiables:
- Keep this slice narrow.
- Do not widen into reward-display selection UI.
- Do not widen into custom artwork editing.
- Do not widen into AI artwork generation.
- Do not reopen Friends architecture, feed, messaging, reactions, or challenge scope.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.

Iteration rule:
- This is a visually sensitive feature and should iterate with real user feedback.
- The final report must reflect the actual final branch state after those iterations.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
