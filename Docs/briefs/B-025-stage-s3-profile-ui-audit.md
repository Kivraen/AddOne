# B-025: Stage S3 Profile UI Audit

Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Audit branch:
`codex/s3-profile-ui-audit`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a read-only audit and redesign-planning task, not an implementation task.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-032-profile-ui-audit-and-redesign-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-032-profile-ui-audit-and-redesign-plan.md)
- [B-023-stage-s3-ui-skill-informed-beta-ui-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/briefs/B-023-stage-s3-ui-skill-informed-beta-ui-audit.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Also inspect directly:
- the Profile tab route and related Profile components
- any account and social-identity subflows connected to Profile

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Produce a concrete, profile-only audit and redesign plan for a cleaner, calmer, more AddOne-native identity and account surface.

What to review:
- first-glance hierarchy
- density of copy and fields
- gate/banner behavior
- account-only vs friend-facing identity separation
- avatar flow placement
- CTA clarity
- spacing/rhythm
- whether Profile feels too administrative compared to the rest of the app

Success metrics:
- Explain why the current Profile surface feels wrong.
- Identify what must change first.
- Separate:
  - quick simplifications
  - medium redesign moves
  - later structural changes
- Ground every point in the current codebase.

Required proof:
- exact code references
- explicit comparison against AddOne UI direction and the UI guidance sources
- a concrete redesign recommendation that could later become an implementation brief

Non-negotiables:
- Do not implement the redesign in this task.
- Do not drift into Friends, Home, onboarding, or settings redesign.
- Do not reopen auth architecture.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the master plan, the stage register, or `Active_Work.md`.

Iteration rule:
- This is an audit and redesign-planning task.
- The final report must reflect the final agreed redesign direction after user discussion, not only the first critique pass.

Required report format:
1. `Stage`
2. `Status`
3. `Current Profile problems`
4. `What should stay`
5. `Priority redesign moves`
6. `Quick wins vs later refactors`
7. `Open risks / disagreements`
8. `Recommendation`
