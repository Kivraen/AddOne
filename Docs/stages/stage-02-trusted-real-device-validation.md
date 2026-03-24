# Stage S2: Trusted Real-Device Validation

## Status

`pending`

## Goal

Prove or falsify the core AddOne experience on real hardware and real networks so the team can distinguish trusted behavior from merely implemented behavior.

## Success Metrics

- The validation matrix is executed for onboarding, today toggle, history save, settings apply, Wi-Fi recovery, reconnect healing, and realtime versus fallback behavior.
- Each scenario is marked pass or fail with evidence.
- Any failure becomes an explicit follow-up task instead of living only in chat.
- Workstream trust labels can move from `Implemented` toward `Verified` or `Trusted` based on evidence.

## Required Proof

- A real-device validation report with scenario-by-scenario evidence.
- Commands, logs, timings, photos, video, or equivalent concrete evidence where useful.
- Follow-up tasks or doc updates for any failure or uncertainty.

## Non-Negotiables

- Do not accept this stage on memory alone.
- Do not treat laptop-only testing as a substitute for real-device proof.
- Do not close the stage while failures remain unclassified.

## Evidence

- `T-021` is now accepted as a bounded parallel checkpoint:
  - beta factory station exists
  - firmware manufacturing-QA serial support exists
  - backend factory run records exist
  - one newly built board completed a full live ship-ready bench run
- The broader S2 real-device matrix is still pending.

## Open Risks / Blockers

- Router-specific failures may require multiple rounds.
- Infra ambiguity from `S1` can make firmware or app behavior appear worse than it is.
- The factory station still needs:
  - stable release promotion away from a branch-candidate artifact
  - broader multi-board validation
  - security hardening before wider operator use

## Recommendation

Pending `S1`.
