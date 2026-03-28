Required skills:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the latest accepted app baseline:
`codex/s4-final-ios-rc-polish`

Stable baseline:
Base this work on `codex/s4-home-confirmation-latency`, because that branch now includes the accepted `T-047` UI iteration, the accepted `T-048` Home confirmation/offline refresh fixes, and the current app icon configuration. Do not work directly on `main`.

Mode:
This is a narrow release-candidate implementation task. Keep it focused on final iOS RC polish and baseline lock.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md`
- `Docs/tasks/T-045-publish-blocker-remediation-and-release-candidate-rerun.md`
- `Docs/tasks/T-046-release-candidate-easy-ui-cleanup.md`
- `Docs/tasks/T-047-friends-controls-and-release-candidate-ui-iteration.md`
- `Docs/tasks/T-048-home-command-confirmation-latency-and-offline-refresh.md`
- `Docs/agent-reports/2026-03-27-publish-blocker-remediation-and-release-candidate-rerun.md`
- `Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md`
- `Docs/agent-reports/2026-03-27-friends-controls-and-release-candidate-ui-iteration.md`
- `Docs/agent-reports/2026-03-27-home-command-confirmation-latency-and-offline-refresh.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_UI_Direction.md`
- `app/sign-in.tsx`
- `app.config.js`
- `package.json`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Create the final intended iOS release-candidate app baseline by cleaning up the sign-in/auth surface, including the accepted RC UI fixes the team wants to ship, and aligning Expo SDK 55 patch dependencies so the next build comes from one explicit polished commit.

Current known state:
- the old `T-045` blocker is cleared externally because the iOS EAS artifacts for `dce8541` finished successfully
- that build is no longer the best ship candidate, because accepted RC work since then includes:
  - `T-046` easy settings cleanup
  - `T-047` Friends controls and adjacent RC UI cleanup
  - `T-048` Home confirmation and offline-refresh truth fixes
- the current sign-in screen still contains staging or Supabase-internal wording that is too raw for submission
- `expo doctor` still reports SDK 55 patch-version drift in a handful of Expo packages
- Android remains deferred for this launch wave unless the user explicitly reopens it

Success metrics:
- sign-in and auth copy are submission-quality
- the final intended ship baseline includes the accepted RC fixes the team wants
- `expo doctor` no longer fails on SDK 55 patch mismatches
- the task ends with one explicit commit hash to use for the next iOS RC build

Required proof:
- `npm run typecheck`
- `npx expo install --check`
- `npx expo doctor`
- exact files changed
- Metro + Simulator proof of the finalized sign-in/auth surface
- explicit note of which accepted RC slices are now included in the final ship baseline
- explicit final commit hash recommended for the next iOS build

Non-negotiables:
- keep scope narrow to final RC polish and baseline lock
- do not widen into weekly minimum/history behavior work
- do not widen into offline-sync/reliability redesign beyond the accepted `T-048` changes
- do not reopen Android for this gate
- do not start App Store metadata or submission work yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Native proof rule:
- For native app UI proof, prefer Metro + iOS Simulator.
- Reuse an existing Metro server if one is already running.
- Use `xcrun simctl openurl booted ...` to open the Expo URL in Simulator.
- Use `xcrun simctl io booted screenshot ...` for proof screenshots.
- Do not switch to Playwright/browser proof for native app screens unless the Simulator path is actually blocked, and if blocked, say exactly what blocked it.

Iteration rule:
- this is the last app-baseline polish pass before the next iOS RC build
- the final report must reflect the actual final branch state after user iteration, not the first pass

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
