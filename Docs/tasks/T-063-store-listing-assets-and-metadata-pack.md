---
id: T-063
title: Store listing assets and metadata pack
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: release
priority: high
owner: Unassigned
depends_on:
  - T-057
  - T-058
  - T-059
  - T-060
  - T-061
  - T-062
owned_paths:
  - app
  - assets
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-store-listing-assets-and-metadata-pack.md
---

## Objective
Turn the launch-prep work into the concrete screenshots, metadata, reviewer notes, and policy-answer inputs needed for App Store Connect and Google Play Console.

## Why Now
Store readiness is blocked as much by missing assets and copy as by missing code. This task converts the product and legal decisions into submission-ready materials.

## In Scope
- iPhone screenshot matrix for Apple
- Android phone screenshot matrix for Google Play
- No iPad screenshots
- Metadata pack:
  - app name
  - subtitle
  - short description
  - full description
  - keywords
  - support email
  - support URL
  - privacy policy URL
  - account deletion URL
  - reviewer notes
  - age or content rating inputs
  - privacy or data safety inputs
  - export compliance inputs

## Out Of Scope
- iPad materials
- Broad PR, launch-campaign, or community rollout content
- Extra marketing copy not required for store listing

## Required Changes
- Screenshots must use realistic production-style data and names
- Metadata must describe a hardware companion app, not a standalone habit app
- Reviewer notes must align with the demo or review path from `T-059`
- Console-answer inputs must be assembled in one durable place

## Verification Required
- Exact screenshot matrix by platform
- Exact file paths or capture checklist for required screenshots
- Exact metadata pack document location
- Explicit note of any remaining missing console-only inputs

## Success Definition
- App Store Connect and Google Play listing setup can be filled without more discovery work
- The listing material matches the actual product positioning and legal URLs
- Submission-prep work stops being blocked on copy or asset ambiguity
