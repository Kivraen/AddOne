---
id: T-058
title: Public release identity and build configuration
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: release
priority: high
owner: Unassigned
depends_on:
  - T-056
owned_paths:
  - app.config.js
  - eas.json
  - package.json
  - ios
  - android
  - Docs
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md
  - Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-04-05-public-release-identity-and-build-configuration.md
---

## Objective
Stop treating `beta` as the public app identity and lock the real production release configuration for iOS and Android closed testing.

## Why Now
The launch-prep program is blocked until the permanent App Store bundle ID, Play package name, EAS profiles, and tablet stance are encoded directly in the repo.

## In Scope
- Add a real `production` app variant
- Lock the intended public:
  - iOS bundle identifier
  - Android package name
- Define explicit EAS build profiles for:
  - TestFlight closed testing
  - Play closed testing
- Explicitly disable iPad support for this launch if it is still implicitly enabled
- Document exact build and submit commands

## Out Of Scope
- Store screenshots or copy
- Legal pages
- Reviewer demo-mode content
- Analytics SDK integration
- Broader runtime or feature changes

## Required Changes
- The repo must distinguish public production from internal `beta`
- iOS and Android release identifiers must be explicit and intentional
- Closed-testing profiles must be committed and documented
- iPad must be disabled deliberately if it is out of scope

## Verification Required
- Exact resolved `ios.bundleIdentifier`
- Exact resolved `android.package`
- Explicit `supportsTablet` outcome for iOS
- Exact EAS profile names and commands for iOS and Android closed testing
- `APP_VARIANT=production npx expo config --type public`
- Exact files changed

## Success Definition
- The public closed-test builds cannot accidentally ship under beta-only identity
- The repo itself tells us exactly how to build iOS and Android submission candidates
- Apple iPad deliverables are out of scope in config, not only in coordinator memory
