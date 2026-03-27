Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from `codex/s4-rc-easy-ui-cleanup`:
`codex/s4-friends-controls-ui-iteration`

Stable baseline:
Base this work on `codex/s4-rc-easy-ui-cleanup`, because the narrow device-settings cleanup is already accepted there. Do not work directly on `main`.

Mode:
This is a user-guided UI iteration slice. Expect multiple rounds of feedback. Do not write the final report until the user says the UI is good.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-047-friends-controls-and-release-candidate-ui-iteration.md`
- `Docs/AddOne_UI_Direction.md`
- `Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Improve the Friends top-right controls menu UX/UI and implement a few other small user-requested UI adjustments while the iOS artifact gate remains externally blocked.

Success metrics:
- The Friends top-right controls feel materially better than the current implementation
- The menu/actions are easier to understand and use
- Any additional requested UI tweaks stay clean and scoped
- The branch remains UI-focused except for one tightly bounded surfaced-state stabilization if needed

Required proof:
- `npm run typecheck`
- exact files changed
- Metro + Simulator proof screenshots of the final UI
- explicit note of any requested item left out because it would require behavior or architecture changes

Non-negotiables:
- keep the slice narrow to user-directed UI iteration
- do not widen into weekly minimum/history semantics
- do not widen into offline-sync/reliability work
- do not widen into OTA/backend changes
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a user-facing iteration slice
- keep implementing feedback until the user says the result is good
- the final report must describe the actual final branch state after all user feedback, not only the first pass

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
