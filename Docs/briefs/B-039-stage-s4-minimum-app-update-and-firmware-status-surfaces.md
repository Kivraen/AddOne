Required skills:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`
- `react-native-design` in `/Users/viktor/.codex/skills/react-native-design/SKILL.md`

Reference material:
- Installed but not session-registered: `/Users/viktor/.agents/skills/vercel-react-native-skills/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted `T-041` checkpoint:
`codex/s4-app-update-status-surfaces`

Stable baseline:
Base this work on `codex/s4-firmware-ota-validation` after `T-041` acceptance, because the real OTA path is accepted there and not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the minimum user-facing update/status surface.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-042-minimum-app-update-and-firmware-status-surfaces.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_UI_Direction.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Add the smallest app surface needed so a beta user can understand device firmware state, see update availability/progress, and intentionally trigger an allowed firmware update.

Success metrics:
- Current firmware version is visible for a device
- Update availability is visible when the backend says a release is eligible
- In-progress and terminal OTA states are visible
- One minimal user-triggered update action exists for eligible devices
- The surface feels like AddOne, not an operator console

Required proof:
- `npm run typecheck`
- exact files changed
- manual proof of:
  - no-update state
  - update-available state
  - in-progress state
  - succeeded or failed state
- explicit note of any backend assumption the UI now depends on

Non-negotiables:
- keep the slice narrow to minimum user-facing update/status surfaces
- do not widen into rollout console work
- do not widen into OTA architecture changes
- do not redesign unrelated settings/app surfaces
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a narrow productization pass on top of an accepted OTA baseline
- the final report must reflect the actual final branch state after iteration

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
