Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted re-onboarding reliability baseline:
`codex/s4-ownership-transfer-validation`

Stable baseline:
Base this work on `codex/s4-mqtt-broker-sync-automation`, because that branch contains the latest accepted cross-account re-onboarding reliability fix and the current coordinator state. Do not work directly on `main`.

Mode:
This is a narrow validation task. Keep it focused on ownership-transfer cleanup, share revocation, and backup retention proof.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-052-ownership-transfer-share-revocation-and-backup-retention-validation.md`
- `Docs/tasks/T-001-beta-friends-surface.md`
- `Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md`
- `Docs/tasks/T-051-broker-password-sync-automation-and-reonboarding-retest.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Backend_Model.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Prove that when a device moves from owner A to owner C, the previous owner's active access and any viewer access are revoked correctly, pending share state is cleaned up, share codes rotate correctly, and previous-owner archived history remains private rather than transferring to the new owner.

Current known state:
- The implementation appears to do the right thing:
  - approved `device_memberships` are revoked during claim transfer
  - pending share requests are cancelled
  - old share codes are deactivated and a fresh active code is issued
  - the device gets a new board assignment
  - orphaned previous-owner boards are archived
  - restore candidates are scoped to the owning user
- What is missing is explicit live proof for the exact three-party case:
  - owner A
  - viewer B
  - new owner C after reset or re-claim

Success metrics:
- owner A loses active device ownership after transfer
- viewer B loses active shared-board access after transfer
- pending share requests are cancelled
- the old share code is no longer the active code
- the new owner gets the active share code
- the previous owner retains only their own archived backups or board history
- the new owner gets a fresh board rather than inheriting the previous owner's history

Required proof:
- exact files changed
- exact commands and backend queries run
- explicit before and after evidence for memberships, share requests, share codes, board assignment, and backups
- explicit note of whether the validation was fully live-proven on the current hosted beta stack
- explicit note of any bug uncovered and any narrow fix applied

Non-negotiables:
- keep scope narrow to validating and, only if necessary, narrowly fixing ownership-transfer cleanup
- do not redesign Friends
- do not change history-retention policy unless a real leak or mismatch forces a documented fix
- do not widen into broad onboarding, OTA, or release-build work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is a proof task, not a speculative redesign task
- if the current behavior is already correct, say so with evidence and stop
- if behavior is wrong, isolate the smallest defensible fix and retest

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
