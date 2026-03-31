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

## Open Risks / Blockers

- The final hardening scope will depend on the failures or surprises discovered in `S2` and `S3`.
- Wider device distribution without an explicit security review and update policy would create avoidable operational risk.

## Recommendation

`T-034` is now accepted as the planning checkpoint, `T-035` is now accepted as the first code-complete hardening baseline on `codex/s4-transport-trust-and-device-identity`, both `T-036` plus `T-037` are now accepted on `codex/s4-release-operations-baseline`, `T-038` is now accepted on `codex/s4-firmware-ota-safety`, `T-039` is now accepted on `codex/s4-firmware-ota-control-plane`, `T-040` is now accepted on `codex/s4-firmware-ota-client`, `T-041` is now accepted on `codex/s4-firmware-ota-validation`, `T-042` is now accepted on `codex/s4-app-update-status-surfaces`, `T-043` is now accepted on `codex/s4-operator-rollout-tooling`, and `T-044` is now accepted on `codex/s4-release-candidate-validation`. `T-045` is now closed as the external blocker-remediation checkpoint because the March 27 iOS EAS artifacts for `dce8541` finished successfully, the RC cohort is corrected, and Android remains deferred. `T-046` is accepted as a narrow UI-only cleanup slice that removed the temporary celebration-preview controls from device settings without reopening deeper behavior or reliability work. `T-047` is now accepted as a bounded user-guided RC UI iteration slice on `codex/s4-friends-controls-ui-iteration`, including the Friends controls redesign, adjacent Home and settings cleanup, and one small confirmation-path stabilization in `hooks/use-devices.ts`. `T-048` is now accepted on `codex/s4-home-confirmation-latency`: the Home confirmation path is materially improved, stale reload truth is fixed, and the unplug-refresh proof is complete. `T-049` is now in progress on `codex/s4-final-ios-rc-polish`: substantial auth, onboarding, firmware, and Home polish is checkpointed, but the branch is still not the locked RC baseline because the Home today-toggle and KPI consistency path needs one narrower regression pass. After that, `T-050` is the last planned major product-facing polish slice before the next iOS RC build: polish the first-device onboarding and setup journey from add-device entry through Wi-Fi setup, initial board setup, and next-step guidance.
