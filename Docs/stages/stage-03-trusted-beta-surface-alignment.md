# Stage S3: Beta UI Completion And Social Shape

## Status

`active`

## Goal

Lock the visible beta app surface so the main screen, settings, onboarding, Wi-Fi recovery, profile, and friends flow all move toward one intentional shipped beta experience instead of a mostly-finished collection of surfaces.

## Success Metrics

- A durable UI issue log exists and is kept current as the stage evolves.
- The current main-screen and settings polish gaps are explicitly tracked and split into implementable batches.
- Onboarding and Wi-Fi recovery have a clear polish and verification plan.
- Timezone behavior across onboarding, settings, recovery, runtime projection, and firmware is reduced to an explicit model or a bounded blocker set.
- The first-user beta profile model is explicitly locked or reduced to a bounded decision set.
- The first-user beta friends and connection model is explicitly locked enough to implement without inventing architecture mid-task.
- Every UI execution task in this stage explicitly requires the `building-native-ui` skill.

## Required Proof

- Updated durable docs covering:
  - current UI gaps
  - profile-model decision space
  - friends beta decision space
  - the next implementation batches
- Copy-paste briefs for the next UI tasks after the audit and scope-lock pass.
- For accepted implementation tasks inside this stage:
  - manual UI evidence
  - typecheck proof
  - scoped doc updates
  - confirmation that the existing backend contract is reused where appropriate or a blocker is named explicitly.

## Non-Negotiables

- Do not treat a 90%-done surface as good enough for beta if the remaining 10% contains real user-facing confusion.
- Do not let the `Friends` tab remain undefined or placeholder by the time this stage is accepted.
- Do not invent a second sharing or profile model if the existing backend contract can support the first-user beta shape.
- Do not skip the `building-native-ui` skill on UI tasks in this stage.
- Keep one active stage only; infra validation remains queued behind this UI lock pass unless the user reprioritizes again.

## Evidence

- `Friends` is currently visible placeholder UI in `components/app/friends-tab-content.tsx`.
- `Profile` currently shows only the email or demo session plus sign-out in `components/app/profile-tab-content.tsx`.
- Onboarding and Wi-Fi recovery are real flows, but they are still long, state-dense guided experiences that need a polish and verification pass.
- Timezone is currently stored as an IANA string in the app and backend, but routine settings still expose a raw text field while firmware only maps a small subset of IANA zones to POSIX rules.
- The accepted timezone audit in [2026-03-18-timezone-model-and-universal-flow-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md) confirms that device timezone is the canonical scheduling setting, any future viewer/display timezone must stay separate, and unsupported zones currently fall back to Los Angeles rules on-device.
- A durable UI issue log now exists in [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md).

## Open Risks / Blockers

- The exact first-user sharing shape still has contradictory ideas around connection model and what the beta should expose first.
- The current backend only has `profiles.display_name`, so expanding profile identity beyond that may require a schema decision.
- Real-device onboarding and recovery polish should still be validated on hardware after the UI pass.
- Firmware currently supports only a limited set of timezone mappings, so the timezone UI must either constrain beta selection to supported zones or wait for explicit firmware expansion.

## Recommendation

Keep [T-005-beta-ui-audit-and-scope-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-005-beta-ui-audit-and-scope-lock.md) as the umbrella coordination task, treat the March 19 UI polish report as the current checkpoint, and promote onboarding into the next dedicated slice with [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md).

In parallel, keep the timezone implementation loop bounded under [T-011-beta-timezone-capability-and-picker-baseline.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md) until its revision pass is accepted.
