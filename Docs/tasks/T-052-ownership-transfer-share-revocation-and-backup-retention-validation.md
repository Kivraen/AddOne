---
id: T-052
title: Ownership transfer, share revocation, and backup retention validation
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-001
  - T-018
  - T-051
owned_paths:
  - supabase/migrations
  - lib/supabase/addone-repository.ts
  - hooks/use-friends.ts
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-001-beta-friends-surface.md
  - Docs/tasks/T-018-factory-reset-remove-and-fresh-add-flow.md
  - Docs/tasks/T-051-broker-password-sync-automation-and-reonboarding-retest.md
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-28-ownership-transfer-share-revocation-and-backup-retention-validation.md
---

## Objective
Prove that when a claimed device moves from one account to a different account, the previous owner and viewers lose active access immediately, pending share state is cleaned up, and the previous owner's archived board history remains private rather than transferring to the new owner.

## Why Now
The current SQL and app subscriptions strongly suggest this is already handled correctly, but there is still no explicit live proof for the exact three-party case: owner A shared to viewer B, then the device moved to owner C. Before wider distribution, that transfer path should be verified directly instead of assumed.

## In Scope
- One narrow ownership-transfer validation path using the current hosted beta stack
- Before and after inspection of:
  - owner membership
  - viewer membership
  - pending share requests
  - active share code
  - board assignment
  - archived backup visibility
- Narrow fixes only if the validation reveals a real mismatch between intended and actual behavior
- Scoped doc or runbook updates required to record the verified behavior

## Out Of Scope
- Redesigning the Friends model
- Changing the data-retention policy for previous owners
- Broad onboarding polish
- OTA or release-build work
- New social features beyond proving the current transfer semantics

## Required Changes
- The transfer path must be validated against the real current implementation, not only reasoned about from SQL
- If behavior is wrong, fix only the smallest cross-account ownership and sharing cleanup gap required
- If behavior is already correct, preserve that truth in the report and coordinator memory

## Verification Required
- Exact files changed
- Exact commands, queries, and test accounts or devices used
- Proof for this sequence:
  - owner A has the device
  - viewer B has approved shared access or a pending share state as applicable
  - device is reset or reclaimed to owner C
  - owner A loses active ownership
  - viewer B loses active shared-board access
  - pending share requests are cancelled
  - old share code is no longer active and the new owner gets the active code
  - owner A can still see only their own archived backups or board history
  - owner C gets a fresh board rather than owner A's prior history
- Explicit note of any part that could not be live-proven and why

## Success Definition
- Ownership transfer semantics are proven instead of assumed
- No stale viewer or share access survives a device move to a new owner
- Previous-owner history remains private and does not leak to the new owner
- The result is either:
  - accepted as already correct with proof
  - or reduced to one explicit narrow bug or fix path
