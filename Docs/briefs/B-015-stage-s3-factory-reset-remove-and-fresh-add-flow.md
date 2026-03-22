# B-015: Stage S3 Factory Reset Remove And Fresh Add Flow

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-factory-reset-remove`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Branch context:
`codex/s3-factory-reset-remove` should start from the March 22 checkpoint that already includes the accepted recovery stabilization and `Reset history` / `Start new habit` work. Do not re-open or re-argue that accepted slice unless you find a concrete regression.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md)
- [T-018-factory-reset-remove-and-fresh-add-flow.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md)
- [2026-03-22-recovery-and-reset-history-start-new-habit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Make destructive factory reset trustworthy: remove the device from the current account, clear its local credentials and claim state, and prove that the board can be added again as fresh hardware.

Success metrics:
- The app exposes a destructive reset path that is clear and bounded.
- The device is removed from the account after destructive reset succeeds.
- Wi-Fi and claim state are cleared as intended on the board.
- A fresh add flow works after destructive reset and removal.
- The final report leaves behind concrete live-hardware evidence, not inference.

Required proof:
- Live hardware proof of destructive reset trigger and acknowledgement
- Proof that the device disappears from the current account or owned-device list
- Proof that the device can be added again afterward
- `npm run typecheck` if app code changed
- Firmware build/upload proof if firmware changed
- Exact files changed
- Explicit note of any backend cleanup timing assumptions or residual blocker

Non-negotiables:
- Do not re-open the already-accepted March 22 recovery or `Start new habit` slice unless you find a concrete regression.
- Do not widen this into general onboarding redesign.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Keep the task bounded to destructive reset, account removal, and fresh add validation.

Iteration rule:
- This task is iterative by default.
- Do not assume the first pass is final if the user is still testing or refining the behavior.
- If the user gives follow-up feedback, keep iterating on the same branch until the user explicitly says the result is acceptable or explicitly asks for a checkpoint review.
- The final report must describe the actual current branch state after those iterations.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
