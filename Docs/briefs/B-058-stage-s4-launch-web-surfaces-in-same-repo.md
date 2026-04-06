Required skills:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `building-native-ui` in `/Users/viktor/Desktop/DevProjects/Codex/AddOne/.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t061-launch-web-surfaces`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` through `T-060` have already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is a minimum viable launch-web task. Build only the simple, stable surfaces required for closed testing and store metadata inside the same repo.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/AddOne_UI_Direction.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-061-launch-web-surfaces-in-same-repo.md`
- `Docs/tasks/T-057-hardware-companion-positioning-and-no-device-ux.md`
- `Docs/tasks/T-060-legal-privacy-support-and-account-deletion.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Create the minimum external web layer in this same repo so AddOne has real waitlist, learn-more, privacy, terms, support, and account-deletion URLs.

Success metrics:
- every required store-facing URL resolves to a real page
- the landing copy clearly explains the hardware relationship
- the waitlist path is real and usable
- the surfaces remain simple and stable rather than turning into a full marketing site

Required proof:
- exact route list
- proof each page renders
- exact waitlist submission destination
- exact files changed

Non-negotiables:
- same repo/app, not a second project
- no fake placeholder routes
- no e-commerce or wider marketing expansion here
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
