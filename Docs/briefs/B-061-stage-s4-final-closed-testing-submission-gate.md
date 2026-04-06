Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t064-closed-testing-gate`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` through `T-063` have already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is the final coordinator gate for closed testing. Do not broaden scope. Review the assembled launch-prep candidate and return a direct readiness verdict.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-056-final-baseline-freeze-and-bug-gate.md`
- `Docs/tasks/T-057-hardware-companion-positioning-and-no-device-ux.md`
- `Docs/tasks/T-058-public-release-identity-and-build-configuration.md`
- `Docs/tasks/T-059-reviewer-access-and-demo-path.md`
- `Docs/tasks/T-060-legal-privacy-support-and-account-deletion.md`
- `Docs/tasks/T-061-launch-web-surfaces-in-same-repo.md`
- `Docs/tasks/T-062-analytics-crash-reporting-feedback-and-basic-email.md`
- `Docs/tasks/T-063-store-listing-assets-and-metadata-pack.md`
- all latest reports from those tasks if they exist

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Decide whether the current AddOne launch-prep candidate is ready for TestFlight closed testing and Google Play closed testing.

Success metrics:
- final pass/fail matrix covers product flows, no-device flows, legal URLs, reviewer access, analytics/Sentry, OTA surface, and build identity
- verdict is explicit:
  - ready for TestFlight closed testing
  - ready for Google Play closed testing
  - or blocked, with concrete blockers
- if ready, exact next steps are stated for both stores

Required proof:
- final launch-prep matrix
- verification of reviewer access, legal URLs, analytics, crash reporting, and build identity
- exact remaining blockers if not ready
- exact next commands or console steps if ready

Non-negotiables:
- do not accept on “it feels done”
- do not reopen broad implementation unless a concrete blocker forces it
- keep the verdict binary and evidence-based
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md` unless the gate result materially changes durable state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
