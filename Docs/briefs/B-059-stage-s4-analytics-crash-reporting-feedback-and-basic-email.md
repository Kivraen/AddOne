Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t062-launch-instrumentation`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` through `T-061` have already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is a launch-instrumentation task. Use current official docs for PostHog and Sentry instead of stale memory, and keep scope on minimum viable closed-testing instrumentation.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-062-analytics-crash-reporting-feedback-and-basic-email.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Install the minimum useful product analytics, crash reporting, feedback intake, and basic waitlist email flow before broader external testing.

Locked decisions:
- analytics stack: `PostHog + Sentry`
- email scope: basic launch-ready email only

Success metrics:
- the minimum launch event taxonomy is implemented
- Sentry is configured and verified
- one feedback intake destination exists
- waitlist email confirmation or launch-notice path exists
- privacy and data-safety implications are called out clearly

Required proof:
- exact events wired
- exact Sentry proof
- one analytics-fire proof and one error-capture proof
- exact feedback destination
- exact email provider or workflow path
- exact files changed

Non-negotiables:
- do not overbuild a CRM
- do not collect unnecessary PII
- use official current docs for SDK setup
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
