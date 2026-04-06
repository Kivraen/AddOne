---
id: T-055
title: Final store submission readiness and launch prep
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: release
priority: high
owner: Unassigned
depends_on:
  - T-049
  - T-054
owned_paths:
  - app.config.js
  - eas.json
  - package.json
  - components/app/profile-tab-content.tsx
  - app
  - components
  - assets
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
  - Docs/agent-reports/2026-04-04-final-rc-review-and-ota-stability-checkpoint.md
  - Docs/agent-reports/2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md
  - Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-final-store-submission-readiness-and-launch-prep.md
---

## Objective
Convert the current stable AddOne line into a real public-release submission candidate for both iOS and Android by closing store-facing blockers, locking the public app identity, preparing review and legal materials, and turning the final test run into a complete publish-readiness pass.

## Execution Sequence
Treat `T-055` as the umbrella coordinator program for the ordered launch-prep slices below, not as one mixed implementation branch:

1. `T-056` final baseline freeze and bug gate
2. `T-057` hardware-companion positioning and no-device UX
3. `T-058` public release identity and build configuration
4. `T-059` reviewer access and demo path
5. `T-060` legal, privacy, support, and account deletion
6. `T-061` launch web surfaces in the same repo
7. `T-062` analytics, crash reporting, feedback, and basic email
8. `T-063` store listing assets and metadata pack
9. `T-064` final closed-testing submission gate

## Why Now
The app baseline is now stable enough to stop doing vague RC cleanup and start doing explicit submission work. The remaining launch risk is no longer only “does the app work?” It is also whether the public release identity, review access, legal URLs, account deletion path, metadata, screenshots, and console declarations are all ready when the final cross-platform pass succeeds.

## In Scope
- Lock the public release identity for both stores:
  - public iOS bundle identifier strategy
  - public Android package strategy
  - public EAS build and submit profile plan
- Explicitly keep iPad out of scope for this launch:
  - do not prepare iPad screenshots
  - if needed, disable tablet support rather than carrying silent iPad requirements into submission
- Re-confirm the March 27 Supabase auth dashboard URL, redirect, and OTP settings
- Decide and prove the reviewer-access strategy for OTP-based sign-in
- Identify and close privacy-policy, support-URL, and account-deletion requirements
- Prepare the final iPhone and Android screenshot plan using realistic production-looking test data
- Prepare the store metadata pack:
  - app name
  - subtitle
  - short description
  - full description
  - keywords
  - support email
  - support URL
  - privacy policy URL
  - account deletion URL
  - review notes or access instructions
- Run the final cross-platform publish-readiness matrix and end with an explicit go or no-go decision for:
  - iOS submission
  - Android submission

## Out Of Scope
- New feature work not required to satisfy a real launch blocker
- Broad redesigns or cleanup unrelated to release readiness
- iPad release work
- Broad web marketing work beyond what is directly needed for required support, privacy, or account-deletion URLs

## Required Changes
- The public release must not ship under beta-only identifiers by accident
- iPad must be explicitly out of scope in the release plan instead of being ignored informally
- Reviewer access must be workable for OTP-authenticated flows
- Privacy-policy, support, and account-deletion requirements must be satisfied concretely rather than assumed
- The final test run must collect the assets and answers needed for actual store submission, not just runtime confidence

## Verification Required
- Exact current stable commit used as the release-prep baseline
- Exact intended public bundle ID and Android package name, or explicit blocker if unresolved
- Exact EAS build and submit commands for:
  - TestFlight candidate
  - Android internal or closed-test candidate
- Explicit statement on whether iPad support is disabled for launch
- Explicit statement on whether account deletion exists in-app and what still remains if it does not
- Explicit URLs or placeholders to be created for:
  - support
  - privacy policy
  - account deletion
- Final screenshot matrix for:
  - iPhone only on Apple
  - Android phone on Google Play
- Explicit review-access plan for Apple and Google reviewer login
- Final publish-readiness matrix covering:
  - auth
  - onboarding
  - Home
  - history
  - Friends
  - settings
  - OTA update surface
  - cross-platform sanity

## Success Definition
- If the user reports the final test run as passing, the next step is actual submission work rather than more research
- The repo, docs, and launch checklist all agree on the current blockers and the exact remaining console actions
- There is one clear answer to “what still stops us from publishing on iOS and Android today?”
