# B-023: Stage S3 UI Skill-Informed Beta UI Audit

Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Audit branch:
`codex/s3-ui-skill-audit`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is an audit and planning task, not an implementation task.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-030-ui-skill-informed-beta-ui-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-030-ui-skill-informed-beta-ui-audit.md)
- [AddOne_UI_Direction.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_UI_Direction.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Also inspect directly:
- the surfaced routes in `app/`
- the main page shells in `components/app/`
- navigation and transition-related code paths

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Produce a concrete, prioritized UI audit of the current beta app based on the repo UI direction and the available UI guidance sources, with emphasis on real improvements we can actually make.

What to review:
- page hierarchy
- information density
- clarity of actions
- transitions
- animations
- navigation flow
- spacing and rhythm
- platform-native feel
- performance-sensitive UI patterns
- consistency across Home, Friends, Profile, Settings, onboarding, and recovery

Success metrics:
- Explain the differences between the three UI guidance sources and which one should dominate where.
- Identify the strongest current UI areas.
- Identify real weaknesses with code references.
- Prioritize improvements by:
  - user impact
  - implementation cost
  - risk of churn
- Separate:
  - quick wins
  - next polish-slice candidates
  - later structural improvements

Required proof:
- exact code references
- explicit comparison of:
  - project-local `building-native-ui`
  - global `react-native-design`
  - installed `vercel-react-native-skills` reference
  - repo-specific `AddOne_UI_Direction`
- explicit statement of which source should dominate when they disagree

Non-negotiables:
- Do not implement fixes in this task.
- Do not drift into generic “modernize the app” advice.
- Keep the audit grounded in AddOne’s actual product shape and codebase.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the master plan, the stage register, or `Active_Work.md`.

Iteration rule:
- This audit is expected to be refined with the user.
- The final report must reflect the final recommendations after discussion, not only the first draft.

Required report format:
1. `Stage`
2. `Status`
3. `Skill comparison`
4. `Current strengths`
5. `Priority improvements`
6. `Quick wins vs later refactors`
7. `Open risks / disagreements`
8. `Recommendation`
