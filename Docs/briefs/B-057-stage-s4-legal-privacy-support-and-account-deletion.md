Required skills:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `building-native-ui` in `/Users/viktor/Desktop/DevProjects/Codex/AddOne/.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t060-legal-and-account-deletion`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` through `T-059` have already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is a launch-blocker closure task. Focus on privacy, terms, support, and account deletion surfaces and on making the deletion path reachable from the app.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/AddOne_UI_Direction.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-060-legal-privacy-support-and-account-deletion.md`
- `components/app/profile-tab-content.tsx`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Close the biggest store-policy blockers by adding real privacy, terms, support, and account-deletion surfaces and wiring them into the app.

Success metrics:
- public URLs exist for privacy, terms, support, and account deletion
- the app exposes those surfaces directly
- account deletion can be initiated from inside the app
- terms and support copy are strong enough to support launch metadata and user-facing links

Required proof:
- exact URLs created
- exact in-app entry points
- proof of account-deletion initiation
- `npm run typecheck` if app code changes
- exact files changed

Non-negotiables:
- do not leave account deletion as a console-only or support-only promise if the app creates accounts
- do not treat legal URLs as “later”
- keep scope on legal, privacy, support, and deletion work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
