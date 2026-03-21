---
id: T-017
title: Add-device entry flow first-screen polish
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-008
owned_paths:
  - components/app/home-screen.tsx
  - app/(app)/onboarding
  - Docs/ui-beta-issue-log.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-21-s3-add-device-entry-flow-first-screen.md
---

## Objective
Refine the first screen a user sees when the signed-in account has no owned device so the add-device flow starts from a clear, visible, intentional entry point instead of reading like a dense onboarding pitch.

## Why Now
The active `T-008` onboarding batch is broader than what we need for the next pass. The immediate user-tested issue is the Home empty state for accounts with no owned device: the entry action is visually weak and the screen needs to behave like the start of the add-device flow.

## In Scope
- The Home empty state when there is no owned device
- The primary connect action visual treatment
- Short supporting copy directly under the entry action
- Small motion or glow treatment if it improves visibility and still fits the shipped visual language
- Keeping the existing onboarding route behind the action

## Out Of Scope
- Later onboarding steps
- Recovery flow changes
- Friends, profile, settings, or general Home screen redesign
- Backend or firmware changes
- Dependency cleanup unrelated to this screen

## Required Changes
- Replace the current weak empty-state treatment with a centered, obvious primary add-device entry.
- Make the button visually legible on the dark background and closer in feel to the main-screen primary action.
- Use a plus icon treatment that is visible and can carry a subtle glow or motion if it materially helps.
- Keep the copy minimal. The user wants the line under the control to read: `Connect your AddOne`.
- Preserve the existing onboarding navigation path rather than inventing a new flow entry.

## Verification Required
- Manual simulator proof of the empty-state screen
- A screenshot or equivalent visual evidence in the report
- `npm run typecheck`, or an explicit note if the known local `node_modules/* 2` type artifact still blocks typecheck
- Scoped issue-log update only if a durable product rule is locked

## Success Definition
- A user with no owned device lands on a clean add-device entry screen rather than a dense setup explanation.
- The primary action is clearly visible on the dark background.
- The visual direction aligns with the existing AddOne primary-action language instead of feeling like a generic placeholder.

## Open Risks
- This screen is only the first slice of the broader `T-008` add-device/onboarding work.
- If the current branch still carries local environment noise that affects `typecheck`, the agent should document it precisely and avoid broad cleanup drift.
