# Stage S4: Beta Hardening And Durable Release Memory

## Status

`active`

## Goal

Harden AddOne for beta release and reconcile the durable docs so the repo reflects accepted reality rather than a mixture of aspiration and implementation drift.

## Success Metrics

- Release smoke tests, branded auth or redirect details, and deployment recovery notes are explicit enough for beta operation.
- Canonical docs, stage notes, and the live queue reflect accepted work rather than stale assumptions.
- The project can hand off to a fresh agent without requiring chat context to understand what is trusted and what is not.

## Required Proof

- Release or smoke-test evidence for the intended beta build path.
- Updated product, contract, and operational docs for accepted changes.
- Final coordination updates in project memory, stage register, and active work.

## Non-Negotiables

- Do not claim beta readiness without accepted earlier stages.
- Do not leave accepted findings trapped only inside worker reports.
- Keep the docs aligned with the code and the accepted evidence.

## Evidence

- Release-hardening priorities are now explicit even before `S4` activates:
  - [T-028-beta-security-and-production-readiness-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-028-beta-security-and-production-readiness-audit.md)
  - [T-029-app-and-firmware-update-strategy.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-029-app-and-firmware-update-strategy.md)
  - [T-034-production-deployment-readiness-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-034-production-deployment-readiness-plan.md)
- April 4 RC validation is now checkpointed in:
  - [2026-04-04-final-rc-review-and-ota-stability-checkpoint.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-04-04-final-rc-review-and-ota-stability-checkpoint.md)
- April 5 recovery and review-fix checkpoint is now also documented in:
  - [2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md)
- April 5 re-home and major-save normalization is now documented in:
  - [2026-04-05-rehome-major-save-point-and-desktop-canonical-path.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-04-05-rehome-major-save-point-and-desktop-canonical-path.md)
- April 5 closed-testing launch-prep coordinator planning is now documented in:
  - [2026-04-05-closed-testing-launch-prep-coordinator-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-04-05-closed-testing-launch-prep-coordinator-plan.md)
- The current candidate branch now carries fresh real-device OTA evidence beyond the March 27 baseline:
  - immutable releases `fw-beta-20260404-04` through `fw-beta-20260404-08`
  - simultaneous Gym/Yoga app-triggered OTA success on `2.0.0-beta.11`
  - owner-facing firmware update-card cleanup plus retry-download telemetry groundwork

## Open Risks / Blockers

- The final hardening scope will depend on the failures or surprises discovered in `S2` and `S3`.
- Wider device distribution without an explicit security review and update policy would create avoidable operational risk.
- The March 27 Supabase auth dashboard URL / OTP settings are still an explicit external release check and must be re-confirmed before this branch is declared the final TestFlight candidate.
- The public release identity is not yet locked clearly enough for store submission: `app.config.js` still distinguishes only `development` and `beta`, and `eas.json` still needs a deliberate public-release profile strategy, especially on Android.
- iPad is out of scope for this launch, but that decision still needs to be reflected explicitly in the actual release configuration so Apple does not silently require iPad deliverables.
- The current repo does not yet make an in-app account deletion path obvious, and both Apple and Google treat account deletion as a real launch requirement when account creation exists.
- Privacy-policy, support, and account-deletion URLs still need to exist concretely enough for store metadata and review.
- Reviewer access for OTP-based sign-in still needs an explicit workable plan for Apple and Google review, not just normal user login behavior.
- The closed-testing launch-prep program is now broader than a single release checklist and must be executed as ordered slices `T-056` through `T-064`, starting with baseline freeze before new launch surfaces are added.
- The new retry-download UI path is implemented but not yet hardware-proven because the April 4 OTA runs did not hit an automatic retry after the new firmware was installed.
- The shorter OTA confirm-window migration now exists locally, but hosted beta still used `confirm_window_seconds = 120` during the April 4 proofs.
- The April 5 board-era backfill repair now exists in-repo and its live correction has been applied through RPC, but the hosted Supabase migration history still does not formally record that migration because current CLI project-link admin access is blocked.

## Recommendation

`T-034` is now accepted as the planning checkpoint, `T-035` is now accepted as the first code-complete hardening baseline on `codex/s4-transport-trust-and-device-identity`, both `T-036` plus `T-037` are now accepted on `codex/s4-release-operations-baseline`, `T-038` is now accepted on `codex/s4-firmware-ota-safety`, `T-039` is now accepted on `codex/s4-firmware-ota-control-plane`, `T-040` is now accepted on `codex/s4-firmware-ota-client`, `T-041` is now accepted on `codex/s4-firmware-ota-validation`, `T-042` is now accepted on `codex/s4-app-update-status-surfaces`, `T-043` is now accepted on `codex/s4-operator-rollout-tooling`, and `T-044` is now accepted on `codex/s4-release-candidate-validation`. `T-045` is now closed as the external blocker-remediation checkpoint because the March 27 iOS EAS artifacts for `dce8541` finished successfully. `T-046`, `T-047`, and `T-048` are accepted and now part of the stable release baseline. `T-049` is now a checkpointed RC app-baseline slice, and April 5 adds the simulator-recovery save point on `main@5abc1e3` with tag `s4-stable-main-20260405-simulator-recovery`. `T-055` is now the active coordinator umbrella, and the actual execution order is now explicit as `T-056` through `T-064`, beginning with baseline freeze, then no-device truth, public release identity, reviewer access, legal/compliance, launch web surfaces, analytics/crash feedback, store assets, and the final closed-testing gate. `T-054` remains a separate support-slice acceptance decision even though its code is already part of the stable branch, and `T-050` should only reopen if the final launch run exposes a real onboarding blocker.
