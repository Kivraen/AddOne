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
- The first-user beta social floor is explicitly bounded so `Friends` is more than passive viewing but not an accidental full messaging product.
- The future challenge-group direction is preserved in durable docs so beta implementation does not block it.
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

- `Friends` now has an accepted beta implementation with profile-gated sharing, owner controls, revoke and leave paths, and live read-only shared-board browsing verified with two real accounts.
- `Profile` now includes the beta social-identity model, native photo entry points, and an account area that keeps email private but visible as auth-only context.
- The March 25 Profile audit concluded that the next UI polish experiment should target Profile before Friends: the current gate target is too dense, too copy-heavy, and too administrative for a clean `from=friends` completion flow.
- The March 25 Profile experiment is now accepted on `codex/s3-profile-ui-experiment`: the gate path is cleaner, social identity is visually first, account treatment is quieter, and the shared large-CTA typography is more legible across the same button family.
- Onboarding and Wi-Fi recovery are real flows, but they are still long, state-dense guided experiences that need a polish and verification pass.
- Timezone is currently stored as an IANA string in the app and backend, but routine settings still expose a raw text field while firmware only maps a small subset of IANA zones to POSIX rules.
- The accepted timezone audit in [2026-03-18-timezone-model-and-universal-flow-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md) confirms that device timezone is the canonical scheduling setting, any future viewer/display timezone must stay separate, and unsupported zones currently fall back to Los Angeles rules on-device.
- A durable UI issue log now exists in [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md).
- The recovered latest UI baseline is now restored, promoted to `main`, and verified through a working TestFlight install from `d589cdc`.
- The March 24 Friends audit and follow-up proof pass closed `T-001` on `codex/s3-friends-proof-and-fixes`, including owner approve, reject, revoke, viewer leave, truthful empty state, and live read-only board visibility.
- The March 25 transition slice is implemented and hardware-validated on `codex/s3-friends-celebration-transition`: a reusable random-overlap board transition now powers friend-triggered temporary board reveal, per-friend celebration opt-in, and clean automatic return to the owner board.
- The March 22 setup follow-up is implemented and hardware-validated: shared onboarding or recovery flow stabilization, wrong-password retry handling, and `Reset history` as `Start new habit` are checkpointed rather than chat-only work.
- The March 22 destructive lifecycle slice is also implemented and live-validated: full `Factory reset and remove`, fresh post-removal add flow, prereg-required claim behavior, post-reset runtime-state repair, stale-command cancellation on reclaim, and editable earlier habit-start correction.
- The remaining Friends follow-up is now narrow realtime polish: development logs still show noisy Supabase channel churn and occasional binding mismatch errors, but the verified owner/viewer flows still complete successfully.

## Open Risks / Blockers

- The hosted profile-identity migration is applied, but hosted type generation was not freshly rerun after rollout because this shell lacked `SUPABASE_ACCESS_TOKEN`.
- Real-device onboarding and recovery polish should still be validated on hardware after the UI pass.
- Firmware currently supports only a limited set of timezone mappings, so the timezone UI must either constrain beta selection to supported zones or wait for explicit firmware expansion.
- The current device offline or reconnect behavior is still unresolved and should be treated as a real validation problem after the remaining S3 product-shape work is done.
- Receiver ack semantics for `play_friend_celebration` could still be tighter so telemetry distinguishes `played` from `ignored` during future simultaneous-debug sessions.
- Friends realtime still has development-only subscription churn and a `3s` self-heal fallback, so app-side board visibility can still lag slightly under poor realtime conditions.

## Recommendation

Treat [T-005-beta-ui-audit-and-scope-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-005-beta-ui-audit-and-scope-lock.md) as accepted historical stage-entry work, treat the March 19 UI polish report as the recovered baseline context, treat [T-015-friends-beta-plan-and-model-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-015-friends-beta-plan-and-model-lock.md) as accepted, and treat [T-009-profile-identity-model-and-account-surface.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-009-profile-identity-model-and-account-surface.md) as accepted.

In parallel, keep the timezone implementation loop bounded under [T-011-beta-timezone-capability-and-picker-baseline.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md) until its revision pass is accepted.

Next, keep the destructive lifecycle path, `T-001`, `T-027`, and the accepted `T-033` experiment preserved, then decide whether to merge or discard the Profile experiment before choosing the next visible UI slice. After that decision, re-evaluate whether the next slice should return to Friends or move to the final onboarding or Wi-Fi recovery polish pass. Keep later reward-display expansion as a separate follow-up, not part of this accepted transition slice. Do not continue lifecycle debugging on top of the accepted reset or re-add branch unless a concrete regression appears.

Keep [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md) as the final visible UI polish slice after the accepted friends and celebration checkpoints.
