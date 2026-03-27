# Stage Register

Last updated: March 26, 2026

## Current Stage Map

- `S0: Coordination Bootstrap` — `accepted`
- `S1: Validation Baseline Ready` — `pending`
- `S2: Trusted Real-Device Validation` — `pending`
- `S3: Beta UI Completion And Social Shape` — `pending`
- `S4: Beta Hardening And Durable Release Memory` — `active`

## Active Stage

- `S4: Beta Hardening And Durable Release Memory`
- Goal: make AddOne publish-ready by auditing the real deployment path, security posture, and app or firmware update model before more feature or polish work resumes.
- Next brief: `T-037` MQTT TLS acceptance and device reprovisioning

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
- `T-027` is now accepted and merged into `main` after hardware validation on two real boards, including the expanded transition library and timing controls.
- `T-032` is now accepted as a read-only audit and recommends cleaning up Profile before the Friends experiment.
- `T-033` is now accepted and merged into `main`.
- `T-024` reward-display configuration is explicitly later than `T-027`.
- `T-028` and `T-029` are now explicit first-priority `S4` implementation tracks for security hardening and update strategy.
- `T-034` now packages the first release-planning pass across deployment, security, and updates.
- `T-034` is now accepted as the launch-readiness planning checkpoint.
- `T-035` is now accepted on `codex/s4-transport-trust-and-device-identity` as the first launch-blocking hardening slice.
- `T-036` now has a checkpointed hosted-baseline branch but remains `revise and retry` because the hardened device still fails MQTT TLS reconnect and the second beta device still uses the legacy fleet credential.
- `T-037` is now the next active implementation slice.
- `T-008` and `T-011` are intentionally deferred while `S4` is active.
- The March 22 report is now the current accepted checkpoint for recovery stabilization and `Start new habit`.
- `T-018` is now accepted as the destructive reset plus fresh add checkpoint.
- `T-019` is preserved as a historical planning artifact, not an active blocker.
- `T-021` is now accepted as a parallel S2 checkpoint: the beta factory station exists and has one successful live ship-ready board run.
- `T-002` remains important, but it is no longer the active stage entrypoint.
- Stage acceptance outcomes are only:
  - `accepted`
  - `revise and retry`
  - `blocked`
