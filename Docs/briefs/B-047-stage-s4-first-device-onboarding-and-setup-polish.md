Required skills:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted post-`T-049` app baseline:
`codex/s4-first-device-onboarding-polish`

Stable baseline:
Base this work on the accepted output of `T-049`, because this is intended to be the last major user-facing polish slice before the next final iOS RC build. Do not work directly on `main`.

Mode:
This is a narrow release-candidate implementation task. Keep it focused on first-device onboarding and initial setup polish.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-050-first-device-onboarding-and-setup-polish.md`
- `Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md`
- `Docs/tasks/T-017-add-device-entry-flow-first-screen.md`
- `Docs/tasks/T-019-device-lifecycle-factory-reset-and-first-add-plan.md`
- `Docs/AddOne_UI_Direction.md`
- `app/(app)/onboarding/index.tsx`
- `app/(app)/devices/[deviceId]/recovery.tsx`
- `components/setup/setup-flow.tsx`
- `hooks/use-onboarding.ts`
- `hooks/use-setup-flow-controller.ts`
- `components/app/home-screen.tsx`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Make the first-device onboarding journey feel submission-quality for a brand-new signed-in owner, from tapping add-device through Wi-Fi setup, initial board setup, and the transition into the normal product.

Current known state:
- the technical setup path works
- earlier setup and recovery stabilization is already accepted
- the flow still feels too raw in pacing, hierarchy, copy, and completion tone for store-facing release quality
- this should be the last major product-facing polish slice before the next final iOS RC build and submission prep

Success metrics:
- add-device entry is clear and intentional
- onboarding steps feel organized and easy to follow
- Wi-Fi setup is integrated into the experience cleanly
- the initial settings / next-steps portion feels complete instead of abrupt
- the branch stays narrowly focused on this first-device journey

Required proof:
- `npm run typecheck`
- exact files changed
- Metro + Simulator proof of the touched onboarding surfaces
- manual proof of the intended full flow as far as possible in the current environment
- explicit note of any remaining part that still requires real-board validation

Non-negotiables:
- keep scope narrow to first-device onboarding and immediate setup polish
- do not widen into broad Wi-Fi recovery redesign outside this journey
- do not widen into weekly minimum/history work
- do not widen into Friends, OTA, or backend redesign
- do not start App Store submission work yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Native proof rule:
- For native app UI proof, prefer Metro + iOS Simulator.
- Reuse an existing Metro server if one is already running.
- Use `xcrun simctl openurl booted ...` to open the Expo URL in Simulator.
- Use `xcrun simctl io booted screenshot ...` for proof screenshots.
- Do not switch to Playwright/browser proof for native app screens unless the Simulator path is actually blocked, and if blocked, say exactly what blocked it.

Iteration rule:
- this is a user-facing polish slice
- the final report must reflect the actual final branch state after user iteration, not the first pass

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
