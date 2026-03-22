# B-016: Stage S3 Device Lifecycle, Factory Reset, and First Add Plan

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s3-factory-reset-remove`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning and research task. Do not jump into implementation. The user intends to use plan mode and discuss the lifecycle with you before code changes are made.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md)
- [T-018-factory-reset-remove-and-fresh-add-flow.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md)
- [T-019-device-lifecycle-factory-reset-and-first-add-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-019-device-lifecycle-factory-reset-and-first-add-plan.md)
- [2026-03-22-recovery-and-reset-history-start-new-habit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Planning goal:
Map the real current device lifecycle and work with the user to define the intended beta lifecycle for:
- first factory flash or preregistration
- device record creation in the backend
- customer first-time onboarding and claim
- first habit creation during onboarding
- destructive `Factory reset and remove`
- fresh re-add after destructive reset

What the user specifically wants to understand and plan:
- how firmware first reaches the backend
- whether factory flash should preregister the device in the database
- what data is recorded at each lifecycle step
- how the claim and onboarding flow currently works
- what the first-habit setup flow should look like for a brand-new user
- how to explain the core AddOne idea very concisely:
  - the daily goal should be `too little to fail`
  - guidance should be minimal, clear, and first-time-user friendly
- how destructive reset should remove the device from the current account and make the next add flow behave like first-time hardware

Success metrics:
- You can explain the current lifecycle with concrete code and data references.
- You can separate current behavior from target behavior.
- You can identify missing pieces or ambiguous decisions before implementation starts.
- You can propose an implementation order that keeps the next execution slice narrow.

Required proof:
- exact code or doc references for current lifecycle behavior
- a clear written lifecycle map
- explicit callouts for unknowns, risks, or weak assumptions
- a concrete recommended implementation sequence

Non-negotiables:
- This is not an implementation task yet.
- Do not start changing app, backend, or firmware behavior unless the user later switches from planning into execution.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Keep the conversation grounded in the actual current codebase, not generic onboarding theory.

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine the plan with the user.
- Do not treat your first planning answer as final if the user is still shaping the lifecycle.
- If you produce a report or planning summary, it must reflect the final agreed planning state, not only your first draft.

Required report format:
1. `Stage`
2. `Status`
3. `Current lifecycle`
4. `Target lifecycle`
5. `Data and backend flow`
6. `Open decisions / risks`
7. `Recommended implementation order`
