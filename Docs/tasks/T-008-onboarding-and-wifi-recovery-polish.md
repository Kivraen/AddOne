---
id: T-008
title: Onboarding and Wi-Fi recovery polish batch
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - app/(app)/onboarding
  - app/(app)/devices/[deviceId]/recovery.tsx
  - components/settings
  - hooks/use-onboarding.ts
  - lib/device-settings.ts
  - lib/habit-details.ts
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md
---

## Objective
Take onboarding from "real but still dense" to a clean beta-ready guided flow, and close any remaining Wi-Fi recovery polish that directly affects onboarding continuity or user confidence.

## Why Now
The broad S3 visible-surface polish pass moved the main screen, routine/settings, appearance, and recovery forward substantially. The user wants onboarding and Wi-Fi recovery to remain the final visible UI polish slice after the friends implementation is explicit. The Friends implementation is now checkpointed, but its final proof is blocked on second-device testing, so onboarding and recovery can move forward in the meantime. The March 22 follow-up stabilized the shared setup flow on real hardware and implemented `Reset history` as `Start new habit`; the next bounded step is destructive factory reset plus account removal and fresh re-add validation.

## In Scope
- Onboarding pacing, copy, and step-to-step clarity
- Onboarding validation, loading, and error states
- Onboarding timezone and habit-identity presentation as already decided in S3
- Narrow Wi-Fi recovery follow-ups only when they directly affect onboarding continuity or mental model
- Manual simulator/device proof for the touched onboarding and recovery paths

## Out of Scope
- Friends implementation
- Profile identity model expansion
- Broad backend redesign
- Firmware changes unrelated to the already accepted timezone model
- Expo dependency/package alignment as a separate maintenance pass

## Required Changes
- Make the onboarding flow feel intentional and lower-friction without redesigning the product model mid-task.
- Tighten copy, hierarchy, and progression so the flow reads clearly on first use.
- Improve visible validation and error handling where the current experience feels state-dense or ambiguous.
- Update the UI issue log with any durable onboarding rules or remaining blockers.
- Keep Wi-Fi recovery changes tightly scoped to onboarding continuity if touched at all.

## Verification Required
- Manual UI evidence for the full onboarding path after the changes
- Manual UI evidence for any touched recovery path
- `npm run typecheck`
- Scoped doc sanity check for the issue log and any changed product-spec language

## Success Definition
- A first-time user can move through onboarding without confusing state jumps or ambiguous copy.
- The current onboarding surface is explicit enough to treat as beta-ready pending only final stage verification.
- Any remaining onboarding contradictions are written down as bounded blockers instead of being hidden in implementation.

## Open Risks
- Timezone behavior is still partly coupled to the separate `T-011` revision loop, so onboarding must reuse the accepted timezone model rather than inventing a parallel one.
- If recovery continuity still feels awkward after onboarding polish, a separate small follow-up may still be cleaner than broadening this batch too far.
