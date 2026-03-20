# AddOne Project Memory

Last locked: March 19, 2026

This file is the durable coordinator memory for AddOne.
Use it to recover the project state quickly without relying on chat history.

## Current Safe Baseline

- Canonical repo path: `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Safe recovery branch: `codex/recovery-safe-baseline-20260319`
- Quarantined repo path: `/Users/viktor/Desktop/DevProjects/Codex/AddOne-broken-20260319`
- Recovery backup path: `/Users/viktor/Desktop/DevProjects/Codex/AddOne-backups/AddOne-filesystem-backup-20260319-214500`

## Current Product Stage

- Active stage: `S3: Beta UI Completion And Social Shape`
- Immediate next execution task: `T-009 Profile identity model and account surface`
- Final visible UI slice after Friends work: `T-008 Onboarding and Wi-Fi recovery polish batch`

## Accepted Decisions

- First beta Friends is profile-gated, code-based, approval-based, and live read-only.
- First beta does not include comments, reactions, activity feed, push notifications, or challenge groups.
- Device timezone remains the canonical scheduling timezone.
- Any future viewer/display timezone must remain separate from the device timezone.
- Fixed UTC offset is an allowed advanced timezone mode; it is not a DST toggle.
- Onboarding and Wi-Fi recovery are intentionally held as the final visible UI polish slice for `S3`.

## Current Work Queue

1. `T-009` social profile identity and account surface
2. `T-001` beta Friends surface and social floor
3. `T-008` onboarding and Wi-Fi recovery polish
4. `T-011` timezone revision pass to close acceptance gaps

## Recovery Notes

- The clean recovery repo preserves the visible project files from the verified filesystem backup.
- The old repo showed real Git object-store/worktree instability and must remain quarantined.
- The coordination layer had to be rebuilt in the clean repo after recovery.
- The previous dashboard foundation is preserved as historical coordination work, but the dashboard source itself is not currently restored in this repo and should not be treated as available until deliberately rebuilt.

## Open Risks

- `T-009` is still not implemented, so Friends cannot move from plan to execution yet.
- `T-011` is still `revise and retry` until reset-time handling and manual proof are closed.
- Hosted beta validation and real-device validation remain after the UI stage.

## Source Of Truth Order

1. `Docs/AddOne_Main_Plan.md`
2. `Docs/stages/stage-register.md`
3. the active stage note in `Docs/stages/`
4. `Docs/Active_Work.md`
5. `Docs/git-operations.md`
6. accepted decisions recorded in git history
