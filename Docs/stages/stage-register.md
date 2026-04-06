# Stage Register

Last updated: April 5, 2026

## Current Stage Map

- `S0: Coordination Bootstrap` — `accepted`
- `S1: Validation Baseline Ready` — `pending`
- `S2: Trusted Real-Device Validation` — `pending`
- `S3: Beta UI Completion And Social Shape` — `pending`
- `S4: Beta Hardening And Durable Release Memory` — `active`

## Active Stage

- `S4: Beta Hardening And Durable Release Memory`
- Goal: make AddOne publish-ready by auditing the real deployment path, security posture, and app or firmware update model before more feature or polish work resumes.
- Next brief: run `T-056` on `/Users/viktor/Desktop/DevProjects/Codex/AddOne` from `codex/s4-post-stable-followups`: freeze the current product baseline with an explicit iPhone/Android validation matrix before any further launch-prep feature work proceeds.
- Parallel note: `T-046`, `T-047`, and `T-048` are accepted side slices and are now part of the stabilized April 5 baseline. `T-049` is now a checkpointed RC app-baseline slice, the current stable Desktop-path save point is tagged `s4-stable-main-20260405-simulator-recovery`, `T-054` remains an in-progress support slice on forward-only weekly target semantics and security hardening, and `T-050` stays queued only if the final launch run finds a real onboarding blocker. `T-055` is now the umbrella launch-prep program, broken into `T-056` through `T-064`.

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
- `T-036` is now accepted on `codex/s4-release-operations-baseline`.
- `T-037` is now accepted on `codex/s4-release-operations-baseline`.
- `T-038` is now accepted on `codex/s4-firmware-ota-safety`.
- `T-039` is now accepted on `codex/s4-firmware-ota-control-plane`.
- `T-040` is now accepted on `codex/s4-firmware-ota-client`.
- `T-041` is now accepted on `codex/s4-firmware-ota-validation`: the real immutable OTA path is hardware-proven end to end, with the successful no-serial proof carried by replacement release `fw-beta-20260327-05`.
- `T-042` is now accepted on `codex/s4-app-update-status-surfaces`: the minimum owner-facing firmware status/update surface is real, and the remaining Meditation rejection is recorded as a board-baseline issue rather than a UI-slice blocker.
- `T-043` is now accepted on `codex/s4-operator-rollout-tooling`: the minimum operator rollout and rollback path is real.
- `T-044` is now accepted on `codex/s4-release-candidate-validation`: the release-candidate pass is complete and the blocker list is explicit.
- `T-045` is now closed on `codex/s4-release-candidate-remediation`: the active RC cohort is corrected, Android is deferred, and the previously missing iOS EAS artifacts for baseline `dce8541` are now finished.
- `T-046` is now accepted on `codex/s4-rc-easy-ui-cleanup`: the temporary celebration-preview controls are removed from device settings and the branch stayed within the intended easy UI cleanup scope.
- `T-047` is now accepted on `codex/s4-friends-controls-ui-iteration`: the Friends actions redesign, adjacent RC UI cleanup, and one small confirmation-path stabilization in `hooks/use-devices.ts` are preserved together as a bounded user-guided slice.
- `T-048` is now accepted on `codex/s4-home-confirmation-latency`: the Home command-confirmation path is materially tighter, the stale-refresh truth gap is fixed, and the unplug-and-pull-to-refresh proof is complete.
- `T-049` now has a broader April 4 checkpoint on `codex/s4-final-rc-review`: the branch carries the RC polish baseline plus OTA/status-surface cleanup, Android startup fixes, and multiple fresh immutable OTA proofs through `2.0.0-beta.11`; the remaining store-facing work now moves under `T-055`.
- April 5 recovery and review-fix checkpoint remains preserved on `codex/s4-final-bug-bash`, but the repo has now been re-homed back into `/Users/viktor/Desktop/DevProjects/Codex/AddOne` as the canonical working path. The previous Desktop copy is preserved under `/Users/viktor/Desktop/DevProjects/Codex/AddOne/_repo-backups/current/AddOne-salvage-20260405`, and the current stable save point is tagged `s4-stable-main-20260405-simulator-recovery`.
- `T-054` remains in progress as a separate support-slice acceptance decision even though its code is already part of the stable branch. The final launch matrix must either sign it off or reopen it as a blocker explicitly.
- `T-050` remains ready behind the current checkpoint: use it only if the final launch run exposes a real onboarding blocker.
- `T-055` is now the active release-prep umbrella for both stores: use `T-056` through `T-064` as the execution sequence instead of one mixed branch. iPad remains explicitly out of scope for this launch.
- External designer contribution is now planned but not active. The collaboration model is checkpointed in `Docs/plans/2026-04-05-external-designer-collaboration-plan.md`, and mergeable designer work should not start until `T-056` is accepted.
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
