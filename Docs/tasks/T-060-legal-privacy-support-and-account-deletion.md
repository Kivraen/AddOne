---
id: T-060
title: Legal, privacy, support, and account deletion
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: release
priority: high
owner: Unassigned
depends_on:
  - T-058
owned_paths:
  - app
  - components
  - hooks
  - lib
  - supabase
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
report_path: Docs/agent-reports/2026-04-05-legal-privacy-support-and-account-deletion.md
---

## Objective
Close the largest non-code store blockers by adding real privacy, terms, support, and account-deletion surfaces and by making the deletion path available from inside the app.

## Why Now
Both Apple and Google treat privacy and account deletion as real release gates. These requirements must be satisfied concretely before store assets and submission copy are finalized.

## In Scope
- Launch-ready surfaces and links for:
  - privacy policy
  - terms of use
  - support
  - account deletion
- In-app access to those surfaces
- In-app account deletion initiation if currently missing
- Conservative, business-protective first-pass terms language
- Support for later store metadata fields

## Out Of Scope
- Full legal review by counsel
- Broad web marketing content
- Analytics SDK implementation
- Unrelated auth or onboarding redesign

## Required Changes
- Public URLs must exist for privacy, terms, support, and account deletion
- The app must expose those surfaces directly to users
- Account deletion must be initiable from the app if accounts can be created
- Terms should cover hardware dependency, service limitations, and liability boundaries as clearly as possible

## Verification Required
- Exact public URLs created
- Exact in-app entry points for:
  - privacy
  - terms
  - support
  - account deletion
- Proof of the account-deletion initiation path
- Exact files changed
- Explicit note of anything still requiring external legal review

## Success Definition
- The main store-policy blockers on privacy and account deletion are closed or isolated precisely
- The app and metadata pack can both reference real launch URLs
- Legal and support surfaces stop being “later” placeholders
