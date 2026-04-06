Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch:
`codex/s4-t058-public-release-identity`

Stable baseline:
Start from the latest accepted launch-prep baseline. At time of writing that is:
- planning branch: `codex/s4-post-stable-followups` at `e122e5b`
- stable product baseline: `main` at `5abc1e3`

If `T-056` or `T-057` has already been accepted and merged into the active launch-prep line, include them. Do not work on `main`.

Mode:
This is a release-identity and build-config task. Keep it focused on production app identity, build profiles, and iPad exclusion.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/tasks/T-058-public-release-identity-and-build-configuration.md`
- `Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md`
- `app.config.js`
- `eas.json`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Lock the real public closed-testing identity for iOS and Android so the app cannot accidentally ship under beta-only identifiers.

Success metrics:
- a real `production` app variant exists
- exact public iOS bundle identifier is encoded
- exact public Android package name is encoded
- explicit iOS and Android closed-testing build profiles exist
- iPad is explicitly disabled for this launch if needed

Required proof:
- exact resolved `ios.bundleIdentifier`
- exact resolved `android.package`
- explicit `supportsTablet` result
- exact EAS profile names and commands
- `APP_VARIANT=production npx expo config --type public`
- exact files changed

Non-negotiables:
- do not leave public identity implied or half-configured
- do not silently reuse `beta` as the public identity
- keep scope on release identity and build configuration only
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
