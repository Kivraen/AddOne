# B-018: Stage S2 Factory QA And Ship-Ready Bring-Up Plan

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s2-factory-qa-plan`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning and research task. Do not jump into implementation. We want an explicit plan for how a newly built board should be flashed, tested, preregistered, and marked ready to ship.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-02-trusted-real-device-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-02-trusted-real-device-validation.md)
- [T-021-factory-qa-and-ship-ready-bring-up-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-021-factory-qa-and-ship-ready-bring-up-plan.md)
- [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [2026-03-22-device-lifecycle-real-world-test-checklist.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/plans/2026-03-22-device-lifecycle-real-world-test-checklist.md)
- [2026-03-22-factory-reset-remove-and-fresh-add-flow.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-22-factory-reset-remove-and-fresh-add-flow.md)

Stage:
`S2: Trusted Real-Device Validation`

Planning goal:
Figure out the best beta-ready way to run factory QA on a newly built device and leave it in a clean customer-ready state.

What the user wants from this planning pass:
- understand the current first-flash and device-registration path
- decide how the latest stable firmware should be selected for factory flashing
- define a simple operator workflow that another person could run
- decide what should be automated versus visually confirmed
- understand how to verify:
  - button input
  - screen and pixel mapping
  - ambient light sensor response
  - firmware version
  - backend preregistration
- decide how operator notes should be recorded:
  - order number
  - recipient
  - build notes
- define the final ship-ready step so the board leaves factory in an unprovisioned customer state

Success metrics:
- explain the current flash, identity, and preregistration path with exact code references
- classify the QA matrix into automated, operator-assisted, and manual checks
- recommend the local-tool shape clearly:
  - browser dashboard plus local backend
  - desktop app
  - CLI plus web UI
  - or another concrete option
- recommend the source of truth for `latest stable firmware`
- propose a concrete implementation order that keeps the first execution slice narrow

Required proof:
- exact code and doc references for current behavior
- a clear QA matrix
- an explicit recommendation for the local operator workflow
- explicit callouts for unknowns, risks, or required firmware/backend additions

Non-negotiables:
- This is not an implementation task yet.
- Stay grounded in the current repo and current device lifecycle, not generic manufacturing theory.
- Distinguish clearly between:
  - what can be digitally verified
  - what can only be operator-confirmed
  - what is not currently supported at all
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Do not widen this into customer onboarding redesign or unrelated app UI work.

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine the plan with the user.
- Do not treat your first planning answer as final if the user is still shaping the QA workflow.
- If you produce a report, it must reflect the final agreed planning state.

Required report format:
1. `Stage`
2. `Status`
3. `Current flash and registration path`
4. `Proposed factory QA workflow`
5. `Test matrix`
6. `Tool architecture recommendation`
7. `Open risks / blockers`
8. `Recommended implementation order`
