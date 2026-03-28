Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted UI baseline:
`codex/s4-home-confirmation-latency`

Stable baseline:
Base this work on `codex/s4-friends-controls-ui-iteration`, because that is the latest accepted app baseline and it already contains the related UI and surfaced-state work. Do not work directly on `main`.

Mode:
This is a narrow implementation and audit task. Keep it focused on Home command confirmation latency and offline refresh truth.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-048-home-command-confirmation-latency-and-offline-refresh.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `hooks/use-devices.ts`
- `components/app/home-screen.tsx`
- `lib/supabase/addone-repository.ts`
- `firmware/src/firmware_app.cpp`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Reduce the delay and ambiguity between tapping the Home primary action and seeing truthful confirmation in the app, while tightening the Home-only offline refresh path.

Success metrics:
- the Home button no longer sits in a long ambiguous confirmation state after the board has already changed
- the owner-device confirmation path is measurably tighter
- reload and refresh truth stay aligned with the latest confirmed board state
- unplug plus pull-to-refresh moves into offline or recovery faster on Home

Required proof:
- `npm run typecheck`
- exact files changed
- explicit before or after timing trace
- manual proof for:
  - toggle confirmation
  - app relaunch truth after toggle
  - unplug plus pull-to-refresh offline transition

Non-negotiables:
- keep scope narrow to Home confirmation latency and offline refresh truth
- do not widen into weekly minimum/history work
- do not widen into broader offline reliability work across the app
- do not widen into OTA or release-artifact work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a narrow release-candidate quality slice
- the final report must reflect the actual branch state after user iteration and the actual remaining proof gap, if any

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
