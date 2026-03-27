Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from `codex/s4-release-candidate-validation`:
`codex/s4-rc-easy-ui-cleanup`

Stable baseline:
Base this work on `codex/s4-release-candidate-validation`, not on the blocked `T-045` remediation branch, because this is a narrow parallel UI cleanup slice and should not inherit the build-artifact troubleshooting worktree. Do not work directly on `main`.

Mode:
This is a narrow implementation task. Keep it limited to easy release-candidate UI cleanup.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-046-release-candidate-easy-ui-cleanup.md`
- `Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_UI_Direction.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Fix the easy UI leftovers the user wants addressed while `T-045` waits on external iOS artifact production.

User intent and scope control:
- Start with easy UI cleanup only.
- Do not jump into history/minimum-goal behavior changes.
- Do not jump into offline-sync or multi-day device-reliability work.
- If you notice those deeper issues, note them in the report and leave them for later planning.

Known starting issue:
- There is still a leftover temporary celebrations list or similar temporary board-settings UI that should be removed or cleaned up.

Success metrics:
- The targeted board/settings UI no longer shows the known temporary leftover
- Any additional fixes stay small, local, and clearly UI-only
- Metro + Simulator proof exists for the affected surface
- The slice stays narrow enough that later behavior and reliability work can be planned separately

Required proof:
- `npm run typecheck`
- exact files changed
- manual Metro/Simulator proof of the affected UI
- explicit note of any issue left for later planning because it is not a cheap UI fix

Non-negotiables:
- keep the slice narrow to easy UI cleanup
- do not widen into weekly minimum-goal/history semantics
- do not widen into offline sync/resilience work
- do not widen into broad app polish
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a user-facing cleanup slice, so the final report must reflect the actual final branch state after iteration

Native proof rule:
- For native app UI proof, prefer Metro + iOS Simulator.
- Reuse an existing Metro server if one is already running.
- Use `xcrun simctl openurl booted ...` to open the Expo URL in Simulator.
- Use `xcrun simctl io booted screenshot ...` for proof screenshots.
- Do not switch to Playwright/browser proof for native app screens unless the Simulator path is actually blocked, and if blocked, say exactly what blocked it.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
