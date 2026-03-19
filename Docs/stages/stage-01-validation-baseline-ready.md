# Stage S1: Validation Baseline Ready

## Status

`active`

## Goal

Make the hosted beta stack and supporting docs coherent enough that real-device validation can start without infra ambiguity or laptop-only assumptions.

## Success Metrics

- One current hosted beta path is documented consistently across `Docs`, env examples, gateway, app, and firmware beta config.
- The baseline clearly states what is verified, what is assumed, and what remains externally blocked.
- A coordinator-reviewed report provides enough evidence to either accept `S1` or mark it blocked without guesswork.
- Stage `S2` can start with the hosted path as a trusted or explicitly bounded baseline.

## Required Proof

- Updated docs or config files showing the chosen hosted beta path and operator prerequisites.
- Command evidence for a gateway build or startup smoke check and a config audit of app, gateway, and firmware beta settings.
- Explicit list of unresolved external dependencies named as blockers rather than hidden assumptions.
- A worker report that follows the staged report format and references the exact files changed.

## Non-Negotiables

- Treat current beta reality as truth. Do not design a future production system in place of present validation needs.
- Keep one active stage only. Do not expand into sharing UI, release hardening, or broad app redesign inside `S1`.
- Do not mark `S1` accepted without concrete proof of the hosted baseline state.
- Record every missing secret, external account dependency, or environment assumption explicitly.

## Evidence

- Coordinator bootstrapped the stage system and selected [T-002-hosted-beta-bring-up.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-002-hosted-beta-bring-up.md) as the first execution task on March 18, 2026.
- Awaiting the first `S1` execution report.

## Open Risks / Blockers

- External broker, Supabase, or VPS access may still be required to complete proof.
- Current beta docs may still mix present staging reality with aspirational production shape and need reconciliation.

## Recommendation

Queued behind the active UI-completion stage unless the user reprioritizes infra validation back to the front.
