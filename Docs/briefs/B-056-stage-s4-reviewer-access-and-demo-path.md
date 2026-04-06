Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t059-reviewer-demo-access`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` through `T-058` have already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is a narrow review-access task. Reuse the existing demo-mode foundations already in the repo and give store reviewers a stable path that does not depend on expiring OTP or physical hardware.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-059-reviewer-access-and-demo-path.md`
- `lib/env.ts`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Implement and document a reviewer/demo path that supports app review and no-device preview without live OTP or hardware dependency.

Success metrics:
- reviewer access does not rely on expiring OTP
- reviewer access does not require physical hardware
- exact Apple and Google review notes are ready to paste
- the preview path makes clear what is real device functionality versus demo or no-device preview

Required proof:
- exact reviewer entry path
- exact reviewer notes text
- end-to-end proof of the review path
- exact files changed

Non-negotiables:
- reuse existing demo-mode foundations instead of inventing a second parallel architecture
- keep scope narrow to review and preview access
- do not widen into marketing pages, analytics, or store-copy work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
