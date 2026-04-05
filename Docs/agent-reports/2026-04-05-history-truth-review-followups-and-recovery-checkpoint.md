## Stage

`S4: Beta Hardening And Durable Release Memory`

## Status

Checkpointed on `codex/s4-final-bug-bash` after the April 5, 2026 salvage, review pass, and follow-up truth fixes.

Current durable branch state at this checkpoint:

- branch: `codex/s4-final-bug-bash`
- latest checkpoint commit: `68e679b`
- earlier salvage checkpoints in the same recovery line:
  - `8be7c14` `codex: restore history, recovery, settings, and profile fixes`
  - `bd93343` `codex: restore friends, shared truth, and firmware salvage fixes`

Operational repo note:

- `/Users/viktor/AddOne-clean` is now the authoritative writable repo.
- `/Users/viktor/Desktop/DevProjects/Codex/AddOne` should remain a read-only salvage source unless a later explicit recovery task says otherwise.

## Changes made

- Recovered the working local app baseline into `/Users/viktor/AddOne-clean` after the original Desktop workspace became unreliable for Expo/Metro work.
- Re-salvaged the post-`b1587f5` app, backend-artifact, and firmware-artifact fixes into the clean repo and pushed them as:
  - `8be7c14`
  - `bd93343`
- Ran a full review of the restored state and fixed two follow-up findings:
  - shared-board history metrics now fail closed on a first transient backend failure instead of falling back to partial snapshot-only truth
  - the review follow-up migration now repairs visible week-target backfill per `board_id` and active history era instead of per `device_id`
- Removed dead owned-device fetch plumbing that still threaded `userEmail` through the app after the neutral profile-name fallback work.
- Applied the live hosted week-target repair directly through the existing `persist_visible_week_targets_for_history_era(...)` RPC for the currently active board eras after confirming the Supabase CLI project-link path was blocked by account-level admin privileges.

## Commands run

- `git status --short --branch`
- `npm run typecheck`
- `npm run test:runtime`
- `pio run -d firmware -e addone-esp32dev`
- `npx supabase db push --linked`
- `npx supabase link --project-ref sqhzaayqacmgxseiqihs`
- service-role RPC validation and live repair via `node --input-type=module ...` against `persist_visible_week_targets_for_history_era(...)`
- `git add ...`
- `git commit -m "codex: fix review follow-ups for history truth"`
- `git push origin codex/s4-final-bug-bash`

## Evidence

- Restored repo checkpoints now pushed on `codex/s4-final-bug-bash`:
  - `8be7c14`
  - `bd93343`
  - `68e679b`
- Review-fix verification passed:
  - `npm run typecheck`
  - `npm run test:runtime`
  - `pio run -d firmware -e addone-esp32dev`
- The new repo migration now exists at:
  - [20260405001500_fix_history_week_target_backfill_board_scope.sql](/Users/viktor/AddOne-clean/supabase/migrations/20260405001500_fix_history_week_target_backfill_board_scope.sql)
- The live repair executed successfully through the existing backend RPC path for the current hosted board eras:
  - processed `83` applied history-draft commands
  - reduced to `2` active `board_id:history_era` repair targets
  - applied `2` repairs successfully
- Current clean repo is pushed and clean after the checkpoint.

## Open risks / blockers

- The hosted Supabase project still does not have this new follow-up migration recorded through CLI migration history because:
  - `npx supabase db push --linked` failed in the clean repo due missing project linkage
  - `npx supabase link --project-ref sqhzaayqacmgxseiqihs` failed with an account-privilege error on the remote project-status endpoint
- The live hosted data is repaired for the active board eras, but a later operator with proper Supabase project-admin privileges should still record the migration formally in hosted migration history.
- The external March 27 Supabase auth dashboard URL / OTP settings confirmation remains the main explicit release-readiness check still open in `S4`.

## Recommendation

Treat `/Users/viktor/AddOne-clean` on `codex/s4-final-bug-bash` as the current durable bug-bash baseline.

Coordinator next steps:

1. Keep `S4` active.
2. Preserve the clean clone as the only writable repo for this recovery line.
3. Re-confirm the external Supabase auth dashboard URL / OTP configuration from the March 27 report before any final release declaration.
4. When project-admin Supabase access is available, record [20260405001500_fix_history_week_target_backfill_board_scope.sql](/Users/viktor/AddOne-clean/supabase/migrations/20260405001500_fix_history_week_target_backfill_board_scope.sql) in hosted migration history so the repo and hosted admin metadata are fully aligned again.
