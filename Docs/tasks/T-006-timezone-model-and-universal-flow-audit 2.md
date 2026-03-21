---
id: T-006
title: Timezone model and universal flow audit
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: cross-platform
priority: high
owner: Delegated agent
depends_on: []
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
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/git-operations.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md
---

## Objective
Audit the current timezone behavior across app flows, backend persistence, runtime projection, and firmware time application, then recommend a beta-ready model that is explicit, universal where possible, and honest about current limits.

## Why Now
Timezone now affects several visible beta surfaces:
- onboarding defaults
- routine settings
- Wi-Fi recovery bootstrap
- current-board projection
- device clock behavior

The current stack works for a narrow happy path, but it is not yet clear enough to support any user in any timezone without confusion or hidden firmware limits.

## In Scope
- Trace the current timezone data flow end to end:
  - phone default
  - app form state
  - backend persistence
  - realtime sync
  - firmware application
- Distinguish the device's canonical timezone from any future "view in another timezone" concept.
- Recommend beta-ready best practices for:
  - canonical timezone storage
  - default-from-phone behavior
  - manual override behavior
  - timezone selection UX
  - unsupported-zone fallback behavior
- Identify whether the current firmware timezone mapping is a blocker to universal support.
- Propose the next implementation split if the model becomes clear enough.

## Out of Scope
- Full implementation of a timezone picker
- Full firmware expansion for all IANA zones
- Broad date/time redesign unrelated to device reset and scheduling behavior
- Unrelated visual polish work

## Required Changes
- Produce a durable audit report at the task's `report_path`.
- Update `Docs/ui-beta-issue-log.md` only if the audit finds a new contradiction or a clearer decision boundary.
- Update a narrowly related product or engineering doc only if the audit reveals a hard blocker that should become durable repo memory immediately.

## Verification Required
- Code references for:
  - onboarding timezone defaults
  - recovery bootstrap timezone defaults
  - routine settings editing
  - runtime board projection
  - backend persistence and sync
  - firmware timezone application
- Explicit callout of currently supported versus unsupported firmware timezone mappings.
- A recommendation that clearly separates:
  - device timezone behavior
  - viewer/display timezone behavior
  - UX for selection and editing

## Success Definition
- The coordinator can answer what timezone means in AddOne today and what it should mean in beta without rereading the codebase.
- The team knows whether "view in another timezone" belongs in the same setting or must stay a separate concept.
- The next implementation brief can be written without re-auditing the entire stack.

## Open Risks
- Firmware may need broader timezone support than the current fixed mapping.
- Supporting arbitrary viewer timezones may require app-side presentation logic that must stay separate from the device's own reset behavior.
