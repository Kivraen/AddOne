---
id: T-011
title: Beta timezone capability and picker baseline
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-006
owned_paths:
  - app/(app)/onboarding
  - app/(app)/devices/[deviceId]/recovery.tsx
  - app/(app)/devices/[deviceId]/settings
  - components/settings
  - hooks/use-device-settings-draft.ts
  - lib/device-settings.ts
  - lib/runtime-board-projection.ts
  - lib/supabase/addone-repository.ts
  - firmware/include/config.h
  - firmware/src/device_settings.cpp
  - firmware/src/time_service.cpp
  - firmware/src/time_service.h
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
  - Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/git-operations.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/tasks/T-006-timezone-model-and-universal-flow-audit.md
  - Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md
---

## Objective
Implement a beta-safe timezone model for AddOne so users can keep the device on the phone's timezone by default, change it later when the device moves, and choose either a regional timezone or an advanced fixed UTC offset without the app promising unsupported on-device behavior.

## Why Now
`T-006` established the rules, but the shipped beta still has a raw-text timezone path and limited firmware support. The next step is to replace that with an explicit capability model and a coherent picker-based UX.

## In Scope
- Keep device timezone as the canonical scheduling/reset timezone.
- Keep any future viewer/display timezone separate from this task.
- Build a shared timezone capability model that can distinguish:
  - valid IANA timezones
  - supported beta device timezones
  - unsupported but valid future timezones
- Support an advanced fixed UTC offset mode as a separate concept from regional timezones.
- Replace raw timezone text as the primary beta UX with a searchable chooser.
- Preserve phone-default behavior in onboarding and recovery.
- Support, at minimum, a solid beta baseline for:
  - United States timezones
  - `Europe/Warsaw`
  - `Europe/Kyiv`
- If advanced mode is shipped in this slice, support fixed UTC offsets in quarter-hour increments and label them clearly as fixed offsets with no DST auto-adjust.
- Make the system extensible so more zones can be added without redesigning the UX.

## Out of Scope
- A viewer/display timezone feature
- Broad non-timezone UI polish
- Full global timezone guarantee if the underlying firmware work is too large for this slice
- Unrelated profile, friends, or history work

## Required Changes
- Define one shared timezone source of truth for the app-side picker and validation rules.
- Decide and implement the first beta support policy:
  - supported-zone picker only
  - or searchable full-IANA list with explicit unsupported-state messaging
- Decide and implement whether advanced mode ships in this slice:
  - regional timezone picker only
  - or regional timezone picker plus advanced fixed UTC offset mode
- Update onboarding, routine settings, and recovery to use the new timezone flow.
- Expand firmware timezone support enough to satisfy the locked beta zone baseline, or clearly document the blocker if the implementation must be split again.
- Update scoped docs when the supported beta timezone policy becomes explicit.

## Verification Required
- Typecheck passes.
- Manual proof for:
  - onboarding default from phone
  - changing timezone in device settings
  - recovery bootstrap timezone behavior
  - correct handling of a supported US timezone
  - correct handling of `Europe/Warsaw`
  - correct handling of `Europe/Kyiv`
- If advanced mode ships:
  - correct handling of at least one positive fixed UTC offset
  - correct handling of at least one negative fixed UTC offset
  - explicit UX warning that fixed offsets do not auto-adjust for DST
- Explicit proof for how unsupported but valid IANA zones are handled.

## Success Definition
- A user can keep the device on the phone timezone during onboarding or change it later in settings without raw-text guessing.
- The beta clearly supports the zones we care about now, including the US baseline plus Warsaw and Kyiv.
- The app does not falsely imply that every valid IANA zone is already honored on-device.
- The timezone UX is reusable across onboarding, settings, and recovery.
- If advanced mode is included, users can deliberately choose a fixed UTC offset without confusing it for a regional timezone.

## Open Risks
- A truly global timezone list may still require more firmware mapping work than this slice can safely absorb.
- DST correctness must be checked carefully for any zone added beyond the current US-only mapping.
- Fixed UTC offsets are not a substitute for regional DST-aware timezones, so the UX has to keep that distinction obvious.
