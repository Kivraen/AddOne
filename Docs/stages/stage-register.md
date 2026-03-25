# Stage Register

Last updated: March 24, 2026

## Current Stage Map

- `S0: Coordination Bootstrap` — `accepted`
- `S1: Validation Baseline Ready` — `pending`
- `S2: Trusted Real-Device Validation` — `pending`
- `S3: Beta UI Completion And Social Shape` — `active`
- `S4: Beta Hardening And Durable Release Memory` — `pending`

## Active Stage

- `S3: Beta UI Completion And Social Shape`
- Goal: finish the remaining first-beta product surface decisions and implementation slices for profile identity, Friends, timezone fit, and final onboarding or recovery polish on top of the recovered latest UI baseline that is now promoted to `main`.
- Next brief: `B-021 stage s3 reward display transition foundation`

## Stage Notes

- [stage-00-coordination-bootstrap.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-00-coordination-bootstrap.md)
- [stage-01-validation-baseline-ready.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-01-validation-baseline-ready.md)
- [stage-02-trusted-real-device-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-02-trusted-real-device-validation.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [stage-04-beta-hardening-and-durable-release-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md)

## Notes

- Only one stage is active at a time unless the user explicitly asks for a parallel track.
- Stage order is adaptive. The active stage changed on March 18, 2026 because the user reprioritized finishing the beta UI surface before more infra-only proof work.
- `T-005` is now accepted as the stage-entry audit and scope-lock checkpoint.
- `T-009` is now accepted.
- `T-001` is now accepted on `codex/s3-friends-proof-and-fixes` after live two-account proof.
- `T-024` is now the recommended next S3 slice: reward display modes and the reusable board transition foundation.
- `T-027` and `T-026` are explicitly later slices behind that foundation.
- `T-008` remains open as the final visible onboarding or recovery polish slice.
- `T-011` still needs its revision pass accepted if timezone remains in the active S3 queue.
- The March 22 report is now the current accepted checkpoint for recovery stabilization and `Start new habit`.
- `T-018` is now accepted as the destructive reset plus fresh add checkpoint.
- `T-019` is preserved as a historical planning artifact, not an active blocker.
- `T-021` is now accepted as a parallel S2 checkpoint: the beta factory station exists and has one successful live ship-ready board run.
- `T-002` remains important, but it is no longer the active stage entrypoint.
- Stage acceptance outcomes are only:
  - `accepted`
  - `revise and retry`
  - `blocked`
