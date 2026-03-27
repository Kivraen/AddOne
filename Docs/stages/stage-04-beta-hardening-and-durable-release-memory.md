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

`T-034` is now accepted as the planning checkpoint, and `T-035` is now accepted as the first code-complete hardening baseline on `codex/s4-transport-trust-and-device-identity`. The next slice is [T-036-release-operations-cleanup-and-launch-baseline.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-036-release-operations-cleanup-and-launch-baseline.md): apply the hosted migration, install real CA material and broker password state, and prove the hardened stack is operational before OTA safety or rollout tooling proceeds.
