---
id: T-062
title: Analytics, crash reporting, feedback, and basic email
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-058
  - T-061
owned_paths:
  - app
  - components
  - hooks
  - lib
  - package.json
  - app.config.js
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
  - Docs/tasks/T-061-launch-web-surfaces-in-same-repo.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-analytics-crash-reporting-feedback-and-basic-email.md
---

## Objective
Install the minimum launch-ready measurement and support systems before broader exposure: product analytics, crash tracking, lightweight feedback intake, and basic waitlist email.

## Why Now
Closed testing should already generate useful product and stability signal. If analytics and crash reporting are missing, the first external testers create noise without learnings.

## In Scope
- `PostHog` product analytics
- `Sentry` crash and error tracking
- Minimum event taxonomy for launch:
  - app opened
  - sign-in started or completed
  - no-device state viewed
  - waitlist CTA tapped
  - learn-more CTA tapped
  - onboarding started or completed
  - device connected
  - day toggle
  - firmware update started or completed
  - account deletion started or completed
- One simple feedback intake path
- Basic waitlist email confirmation or launch notice path

## Out Of Scope
- Full CRM or lifecycle automation
- Heavy experimentation or feature-flag systems
- Analytics over-collection or broad PII capture
- Marketing automation beyond essential launch workflows

## Required Changes
- Analytics and crash tracking must be configured intentionally, not hand-waved for later
- The event taxonomy must be documented and actually wired
- Feedback and basic waitlist email destinations must be real
- Privacy and Data Safety implications must be called out explicitly

## Verification Required
- Exact analytics events implemented
- Exact Sentry setup proof
- One test proof that analytics and crash reporting both fire
- Exact feedback destination
- Exact basic email workflow or provider path
- Exact files changed

## Success Definition
- Closed testing can produce useful product and stability data from day one
- The store privacy declarations can be prepared against the actual SDKs in the app
- Feedback and waitlist flows exist instead of remaining vague follow-up ideas
