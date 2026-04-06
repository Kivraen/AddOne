Required skills:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `building-native-ui` in `/Users/viktor/Desktop/DevProjects/Codex/AddOne/.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t057-no-device-positioning`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` has already been accepted and merged into the active launch-prep line, include it. Do not work on `main`.

Mode:
This is a narrow product-positioning and no-device UX task. Keep it focused on making AddOne honest as a hardware companion app for users who do not yet own a board.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/AddOne_UI_Direction.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-057-hardware-companion-positioning-and-no-device-ux.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Make AddOne clearly read as an app for the AddOne board by giving the no-device experience truthful messaging and clear next actions.

Locked decisions:
- no-device primary CTA: `Join waitlist`
- secondary CTA: `Learn how it works`
- tertiary CTA: `I already have a device`
- do not present AddOne like a generic software-only habit app

Success metrics:
- the no-device state clearly says AddOne requires the AddOne board
- the user sees meaningful actions instead of a dead-end empty state
- the copy is production-quality and consistent with later store-facing positioning

Required proof:
- `npm run typecheck`
- iPhone and Android proof of the new no-device state
- exact CTA destinations or config points for waitlist and learn-more
- exact files changed

Non-negotiables:
- keep scope narrow to no-device messaging and CTA structure
- do not widen into public web-page implementation yet
- do not widen into analytics, legal, or reviewer-access work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
