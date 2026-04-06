---
id: T-056
title: Final baseline freeze and bug gate
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: release
priority: high
owner: Unassigned
depends_on:
  - T-049
  - T-054
owned_paths:
  - app
  - components
  - hooks
  - lib
  - firmware
  - services
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md
  - Docs/tasks/T-050-first-device-onboarding-and-setup-polish.md
  - Docs/tasks/T-054-forward-only-weekly-target-semantics-and-security-hardening.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
  - Docs/agent-reports/2026-04-04-final-rc-review-and-ota-stability-checkpoint.md
  - Docs/agent-reports/2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-final-baseline-freeze-and-bug-gate.md
---

## Objective
Prove that the current stable AddOne branch is the only launch-prep baseline we should build on, and isolate any remaining real product regression before new launch-prep work layers on top.

## Why Now
The launch-prep program cannot stay coherent if legal, web, analytics, and store work are piled onto a baseline that still has unresolved runtime issues. This task freezes the product baseline first.

## In Scope
- Final iPhone and Android functionality pass on the current stable branch
- Pass or fail matrix for:
  - auth
  - onboarding
  - Home
  - history
  - Friends
  - settings
  - OTA
- Narrow bug fixes only if the test pass finds a concrete regression
- Explicit coordinator verdict on whether launch-prep feature work should begin

## Out Of Scope
- New launch messaging or waitlist work
- Public release identity or build-profile changes
- Legal or privacy surfaces
- Analytics, feedback, or email systems
- Store screenshot or metadata work

## Required Changes
- One branch must be named as the active launch-prep baseline
- The final app functionality pass must be explicit, not implied from older reports
- If a regression is found, fix only that concrete issue or document it as a blocker
- `T-050` and `T-054` must not be reopened unless this pass exposes a real failure in those areas

## Verification Required
- Explicit iPhone and Android pass/fail matrix for:
  - sign-in
  - onboarding
  - Home interaction
  - history editing
  - Friends surface
  - settings flows
  - OTA surface
- Exact commands run for any narrow fix
- `npm run typecheck` if app code changes
- Simulator or device proof for any claimed fix

## Success Definition
- The current stable branch is accepted as the single launch-prep baseline
- Any remaining product issue is either fixed narrowly or called out as a concrete blocker
- The next launch-prep slice can start without re-litigating baseline trust
