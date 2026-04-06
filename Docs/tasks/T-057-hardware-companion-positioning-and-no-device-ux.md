---
id: T-057
title: Hardware-companion positioning and no-device UX
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-056
owned_paths:
  - app
  - components
  - hooks
  - lib
  - assets
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/AddOne_UI_Direction.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-hardware-companion-positioning-and-no-device-ux.md
---

## Objective
Make AddOne honest for people who do not own hardware yet by positioning the app as a companion to the AddOne board and giving the no-device state a clear waitlist and learn-more path.

## Why Now
Closed testing should already behave like a truthful public product. If the app still reads like a generic habit tracker, the store copy, screenshots, and first-run experience will all mislead users.

## In Scope
- No-device empty state and first-run messaging
- Explicit “requires AddOne device” copy
- CTA structure:
  - primary: `Join waitlist`
  - secondary: `Learn how it works`
  - tertiary: `I already have a device`
- Alignment of no-device copy with store-facing positioning
- CTA plumbing points that later launch-web work can connect to real URLs

## Out Of Scope
- Public release identifiers
- Reviewer-access demo mode
- Full landing-page implementation
- Analytics SDK integration
- Broad onboarding redesign unrelated to the no-device truth surface

## Required Changes
- The no-device state must say clearly that AddOne requires the AddOne board
- The app must offer a credible no-device path instead of feeling broken or empty
- CTA destinations must be explicit and ready for later launch-web hookup
- Copy should be production-grade rather than beta-only or placeholder text

## Verification Required
- `npm run typecheck`
- iPhone and Android proof of the new no-device state
- Exact CTA destinations or configuration points used for:
  - waitlist
  - learn more
  - already have a device
- Exact files changed

## Success Definition
- A user without hardware can understand what AddOne is, what they need, and what to do next
- The app no longer risks being read as a generic software-only habit app
- The later web and store-copy tasks can build on the same hardware-companion message
