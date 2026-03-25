# Stage S4: Beta Hardening And Durable Release Memory

## Status

`pending`

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

## Open Risks / Blockers

- The final hardening scope will depend on the failures or surprises discovered in `S2` and `S3`.
- Wider device distribution without an explicit security review and update policy would create avoidable operational risk.

## Recommendation

Keep `S4` pending until the active `S3` product-shape work is explicit enough to hand off, then treat security hardening and the app/firmware update strategy as the first two release-readiness tasks.
