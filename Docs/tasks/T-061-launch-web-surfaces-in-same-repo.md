---
id: T-061
title: Launch web surfaces in the same repo
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: web
priority: high
owner: Unassigned
depends_on:
  - T-057
  - T-060
owned_paths:
  - app
  - components
  - assets
  - lib
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
  - Docs/tasks/T-057-hardware-companion-positioning-and-no-device-ux.md
  - Docs/tasks/T-060-legal-privacy-support-and-account-deletion.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-launch-web-surfaces-in-same-repo.md
---

## Objective
Create the minimum external web layer inside the same repo so AddOne has real launch URLs for waitlist, learn-more, privacy, terms, support, and account deletion.

## Why Now
The app and the store consoles both need concrete public URLs. The no-device UX and the legal/compliance task cannot stay half-finished without real pages to point to.

## In Scope
- Landing or learn-more page
- Waitlist signup page or flow
- Privacy policy page
- Terms page
- Support page
- Account deletion instructions or request page
- Same-repo implementation, not a second project

## Out Of Scope
- Full marketing site expansion
- E-commerce or device-purchase flow
- Advanced blog or CMS work
- Broad design experiments unrelated to launch clarity

## Required Changes
- Every store-facing required URL must resolve to a real page
- The landing copy must make the hardware relationship explicit
- The waitlist path must be real and usable
- The surfaces must be simple, stable, and aligned with the app message

## Verification Required
- Exact public route list
- Proof that each required page renders
- Exact waitlist capture path and where submissions go
- Exact files changed

## Success Definition
- The app and store metadata can both reference real launch URLs
- The no-device and legal flows have concrete destinations
- Launch web surfaces stop being a blocker for closed testing
