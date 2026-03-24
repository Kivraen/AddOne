# B-019: Stage S2 Factory Station Release Promotion And Bench Validation

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s2-factory-station-promotion`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Required skill:
- none required beyond normal repo discipline; use repo docs as the source of truth

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-02-trusted-real-device-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-02-trusted-real-device-validation.md)
- [T-021-factory-qa-and-ship-ready-bring-up-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-021-factory-qa-and-ship-ready-bring-up-plan.md)
- [T-022-factory-station-release-promotion-and-bench-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-022-factory-station-release-promotion-and-bench-validation.md)
- [2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md)
- [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md)

Stage:
`S2: Trusted Real-Device Validation`

Goal:
Promote the beta factory station from a branch-candidate workflow into a stable repeatable bench process with an approved firmware artifact, broader multi-board proof, and clearer retry or rework handling.

Success metrics:
- The factory manifest no longer points to a branch-candidate artifact as the approved operator default.
- There is evidence from multiple successful real board runs, not just one.
- At least one meaningful retry or rework path is exercised and documented.
- Operator-facing retry and rework behavior is clearer in the station and backend record model.
- Scoped docs and runbooks match the promoted workflow.

Required proof:
- exact files changed
- `npm run typecheck`
- station syntax checks if touched:
  - `node --check tools/factory-station/src/server.mjs`
  - `node --check tools/factory-station/src/flash-runner.mjs`
  - `node --check tools/factory-station/public/app.js`
- evidence from multiple real bench runs
- evidence for at least one retry or rework scenario
- explicit statement of which firmware artifact is now the approved stable operator release

Non-negotiables:
- Keep this slice focused on release promotion, bench validation, and retry/rework clarity.
- Do not widen this into broad security hardening. That belongs to `T-023`.
- Do not redesign customer onboarding or unrelated app surfaces.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- If the user iterates on the station during the bench run, the final report must reflect the final branch state, not only the first pass.

Iteration rule:
- This task is expected to iterate with real hardware.
- Keep a running understanding of what changed during bench feedback.
- The final report must capture the actual final station behavior and the real evidence gathered.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
