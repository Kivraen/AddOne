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
- The current candidate branch now carries fresh real-device OTA evidence beyond the March 27 baseline:
  - immutable releases `fw-beta-20260404-04` through `fw-beta-20260404-08`
  - simultaneous Gym/Yoga app-triggered OTA success on `2.0.0-beta.11`
  - owner-facing firmware update-card cleanup plus retry-download telemetry groundwork

## Open Risks / Blockers

- The final hardening scope will depend on the failures or surprises discovered in `S2` and `S3`.
- Wider device distribution without an explicit security review and update policy would create avoidable operational risk.
- The March 27 Supabase auth dashboard URL / OTP settings are still an explicit external release check and must be re-confirmed before this branch is declared the final TestFlight candidate.
- The new retry-download UI path is implemented but not yet hardware-proven because the April 4 OTA runs did not hit an automatic retry after the new firmware was installed.
- The shorter OTA confirm-window migration now exists locally, but hosted beta still used `confirm_window_seconds = 120` during the April 4 proofs.
- The April 5 board-era backfill repair now exists in-repo and its live correction has been applied through RPC, but the hosted Supabase migration history still does not formally record that migration because current CLI project-link admin access is blocked.

## Recommendation

`T-034` is now accepted as the planning checkpoint, `T-035` is now accepted as the first code-complete hardening baseline on `codex/s4-transport-trust-and-device-identity`, both `T-036` plus `T-037` are now accepted on `codex/s4-release-operations-baseline`, `T-038` is now accepted on `codex/s4-firmware-ota-safety`, `T-039` is now accepted on `codex/s4-firmware-ota-control-plane`, `T-040` is now accepted on `codex/s4-firmware-ota-client`, `T-041` is now accepted on `codex/s4-firmware-ota-validation`, `T-042` is now accepted on `codex/s4-app-update-status-surfaces`, `T-043` is now accepted on `codex/s4-operator-rollout-tooling`, and `T-044` is now accepted on `codex/s4-release-candidate-validation`. `T-045` is now closed as the external blocker-remediation checkpoint because the March 27 iOS EAS artifacts for `dce8541` finished successfully, the RC cohort is corrected, and Android remains deferred. `T-046` is accepted as a narrow UI-only cleanup slice that removed the temporary celebration-preview controls from device settings without reopening deeper behavior or reliability work. `T-047` is now accepted as a bounded user-guided RC UI iteration slice on `codex/s4-friends-controls-ui-iteration`, including the Friends controls redesign, adjacent Home and settings cleanup, and one small confirmation-path stabilization in `hooks/use-devices.ts`. `T-048` is now accepted on `codex/s4-home-confirmation-latency`: the Home confirmation path is materially improved, stale reload truth is fixed, and the unplug-refresh proof is complete. `T-049` now has a stronger April 4 checkpoint on `codex/s4-final-rc-review`, and April 5 now adds both a recovery checkpoint on `codex/s4-final-bug-bash` through `68e679b` and a re-home major-save point that restores `/Users/viktor/Desktop/DevProjects/Codex/AddOne` as the canonical repo path. Coordinator should keep `S4` active until the external Supabase auth settings are re-confirmed and the final TestFlight build branch is explicitly accepted. `T-054` remains a separate support-slice acceptance decision even though its code is already part of the same candidate branch. `T-050` stays queued only if the coordinator still wants another dedicated onboarding-polish pass after the April 4 checkpoint rather than building directly from the accepted final RC branch.
