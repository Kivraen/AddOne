---
id: T-059
title: Reviewer access and demo path
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-058
owned_paths:
  - app
  - components
  - hooks
  - lib
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
  - lib/env.ts
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-reviewer-access-and-demo-path.md
---

## Objective
Give Apple and Google a stable review path that does not depend on expiring OTP codes or physical AddOne hardware, while reusing the demo-mode foundations already present in the repo.

## Why Now
Reviewer access is a real submission gate. OTP-only login plus hardware dependency will create avoidable review friction unless we provide a stable demo or preview path deliberately.

## In Scope
- Review the existing demo-mode foundations already in the repo
- Define and implement the reviewer-access path
- Support:
  - no-device preview
  - app review access
- Write exact reviewer instructions for Apple and Google
- Make reviewer access compatible with the hardware-companion positioning work

## Out Of Scope
- Broad auth redesign
- Public marketing pages
- Analytics or crash SDK integration
- Full production no-device product experience beyond what review requires

## Required Changes
- Reviewer access must not depend on expiring OTP flow
- Reviewer access must not require a physical board
- The allowed review surface must be explicit about what is previewed versus device-only
- The review notes must be ready to paste into both submission consoles

## Verification Required
- Exact reviewer entry path
- Exact reviewer notes text for Apple and Google
- Proof that the reviewer path works end to end without live OTP dependency
- Explicit feature boundaries for the demo or preview mode
- Exact files changed

## Success Definition
- Apple and Google reviewers can reach a stable, explainable preview path
- Review instructions are concrete and reusable
- Reviewer access is no longer a hand-waved launch blocker
