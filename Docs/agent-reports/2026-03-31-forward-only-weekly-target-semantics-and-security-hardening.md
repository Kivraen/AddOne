## Stage

`S4: Beta Hardening And Durable Release Memory`

## Status

Support slice implemented and materially validated on `codex/s4-final-ios-rc-polish`, but not yet coordinator-accepted as a stage transition.

This work should be treated as a separate follow-up slice from `T-049`, because it changes weekly minimum or history semantics rather than final RC UI polish.

Current branch state at report time:

- branch: `codex/s4-final-ios-rc-polish`
- current `HEAD`: `3db42f54f95699b8684debc01658e45e3f094c88`
- working tree: dirty with implementation changes plus untracked migration files and `.npm-cache/`

## Changes made

Implemented forward-only weekly target semantics across backend, app projection, history editing, firmware, and linked Supabase schema.

Behavior now intended:

- weekly target changes apply to the current week immediately
- future weeks inherit the new target
- older completed weeks stay frozen
- history edits score older weeks against the target active in those weeks

Core implementation areas:

- added week-target timeline storage with `board_weekly_target_changes`
- added visible `week_targets` support to runtime snapshots and board backups
- changed app-side board projection to use frozen per-week targets for past weeks
- changed firmware tracker and runtime snapshot publishing to carry per-visible-week targets
- changed settings-save confirmation to wait for the board to mirror the new week-target map
- stabilized history-edit save, backdating, and save-button behavior during target-aware history updates
- fixed an auth-provider transport error path so OTP network failures no longer fall through to a redbox
- hardened the new `board_weekly_target_changes` table with RLS and privilege revocation after Supabase showed it as unrestricted

Exact files changed in the current slice:

- `app/(app)/devices/[deviceId]/settings/routine.tsx`
- `components/app/friends-tab-content.tsx`
- `components/settings/palette-color-editor.tsx`
- `firmware/src/board_renderer.cpp`
- `firmware/src/board_renderer.h`
- `firmware/src/cloud_client.cpp`
- `firmware/src/cloud_client.h`
- `firmware/src/device_settings.h`
- `firmware/src/firmware_app.cpp`
- `firmware/src/firmware_app.h`
- `firmware/src/habit_tracker.cpp`
- `firmware/src/habit_tracker.h`
- `firmware/src/realtime_client.cpp`
- `firmware/src/realtime_client.h`
- `hooks/use-devices.ts`
- `hooks/use-friends.ts`
- `lib/board.ts`
- `lib/device-settings.ts`
- `lib/mock-data.ts`
- `lib/onboarding-restore.ts`
- `lib/runtime-board-projection.ts`
- `lib/supabase/addone-repository.ts`
- `lib/supabase/database.types.ts`
- `providers/auth-provider.tsx`
- `tests/runtime-board-projection.test.mjs`
- `types/addone.ts`
- `supabase/migrations/20260330172500_enable_rls_on_board_habit_eras.sql`
- `supabase/migrations/20260331103000_add_forward_only_weekly_target_timeline.sql`
- `supabase/migrations/20260331124500_fix_history_metrics_visible_week_targets.sql`
- `supabase/migrations/20260331190500_secure_board_weekly_target_changes.sql`

## Commands run

Notable commands used during this slice:

- `npm run test:runtime`
- `npm run typecheck`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-210`
- `npx supabase start --debug`
- `npx supabase db reset`
- `npx supabase db push`
- `npx supabase migration list`
- `npx supabase db dump --linked --schema public -f /tmp/addone-remote-public.sql`
- `curl -I https://sqhzaayqacmgxseiqihs.supabase.co/auth/v1/settings`
- `curl -i https://sqhzaayqacmgxseiqihs.supabase.co/rest/v1/board_weekly_target_changes?select=* ...`
- `xcrun simctl io booted screenshot /tmp/addone-weekly-target-check.png`
- `xcrun simctl spawn booted log show --style compact --last 10m --predicate 'eventMessage CONTAINS \"weekly-target-debug\"'`

## Evidence

- `npm run test:runtime` passes with coverage for:
  - current-week live-target precedence
  - frozen past-week target rendering
  - fallback behavior when snapshot `week_targets` are missing
  - preference for authoritative visible week targets over stale snapshot targets
- `npm run typecheck` passes on the current worktree.
- `pio run -e addone-esp32dev-beta` passes.
- board firmware was reflashed successfully to `/dev/cu.usbserial-210`.
- linked Supabase migration history is aligned through:
  - `20260331103000`
  - `20260331124500`
  - `20260331190500`
- simulator debug logs proved the backend and app projection were already returning the correct frozen target timeline during the `3 -> 1 -> 3` repro:
  - after `3 -> 1`, the projected visible targets were `[1, 3, 3, 3, ...]`
  - after `1 -> 3`, the projected visible targets were `[3, 3, 3, 3, ...]`
- the remaining incorrect repaint was traced to the board/runtime side, and a fresh firmware flash resolved the reported repro.
- linked Supabase security validation confirmed the new table was originally exposed:
  - `board_weekly_target_changes` appeared unrestricted in the dashboard
  - remote schema dump showed no RLS and broad grants on the table
- after `20260331190500_secure_board_weekly_target_changes.sql`, a live REST probe using the anon key now returns:
  - `401`
  - `permission denied for table board_weekly_target_changes`

## Open risks / blockers

- This slice is implemented and materially validated, but it still needs a tighter manual regression pass across edge cases before coordinator acceptance:
  - target change followed by history edits on older weeks
  - offline board then reconnect
  - app relaunch before a fresh snapshot
  - new era or reset-history boundary
  - restore path after prior weekly-target changes
- the worktree is still dirty, so this is not yet a durable checkpoint for stage handoff.
- `.npm-cache/` remains untracked local noise.
- `20260331103000_add_forward_only_weekly_target_timeline.sql` was edited locally during validation after earlier application, so coordinator should treat the current migration set as the authoritative local state and checkpoint it intentionally.

## Recommendation

Treat this as a strong candidate support-slice completion report, not as automatic stage completion.

Recommended next coordinator actions:

- checkpoint the current branch state in git before any stage transition
- review this slice as a separate follow-up to `T-049`, because it widened into weekly minimum or history semantics by design
- run one focused manual matrix on:
  - `3 -> 1 -> 3` target changes
  - older-week history edits after target changes
  - offline or reconnect behavior
  - reset-history or new-era behavior
- if that matrix passes, accept this slice and then decide whether the repo is ready to move from S4 toward the next stage boundary
