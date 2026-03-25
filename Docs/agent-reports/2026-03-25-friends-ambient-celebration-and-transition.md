---
task_id: T-027
title: Friends ambient celebration playback and transition foundation
date: 2026-03-25
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/ui-beta-issue-log.md
  - components/app/friends-arrange-screen.tsx
  - components/app/friends-tab-content.tsx
  - firmware/include/config.h
  - firmware/src/board_renderer.cpp
  - firmware/src/board_renderer.h
  - firmware/src/board_transition.cpp
  - firmware/src/board_transition.h
  - firmware/src/cloud_client.cpp
  - firmware/src/cloud_client.h
  - firmware/src/firmware_app.cpp
  - firmware/src/firmware_app.h
  - firmware/src/realtime_client.cpp
  - firmware/src/realtime_client.h
  - hooks/use-friends.ts
  - lib/supabase/addone-repository.ts
  - lib/supabase/database.types.ts
  - package.json
  - services/realtime-gateway/src/friend-celebration.mjs
  - services/realtime-gateway/src/index.mjs
  - services/realtime-gateway/src/topics.mjs
  - supabase/migrations/20260324193000_allow_repeat_friend_celebrations_per_day.sql
  - supabase/migrations/20260325003000_add_friend_celebration_playback.sql
  - supabase/migrations/20260325013000_restore_friend_celebration_daily_dedupe.sql
  - supabase/migrations/20260325083000_fix_friend_celebration_device_fallback.sql
  - supabase/migrations/20260325090000_fix_friend_celebration_device_fallback.sql
  - supabase/migrations/20260325093000_fix_friend_celebration_request_key_ambiguity.sql
  - supabase/migrations/20260325102000_allow_repeat_friend_celebrations_for_testing.sql
  - supabase/migrations/20260325103000_restore_friend_celebration_daily_dedupe_after_testing.sql
  - tests/friend-celebration-gateway.test.mjs
  - types/addone.ts
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented and hardware-validated on `codex/s3-friends-celebration-transition`. Final branch state is clean at commit `d41a400`. Final once-per-day backend dedupe was restored after temporary same-day replay testing.

## Changes made

- Added a reusable full-frame board transition primitive and finalized the slower random-overlap friend celebration reveal on device.
- Sender firmware now arms only on today `off -> on`, waits for a stable `15s` hold, then emits the celebration snapshot.
- Recipient firmware reveals the friend board, holds it, then returns cleanly to the owner board.
- Added backend fanout for friend celebrations, per-friend `celebration_enabled`, and compact `Manage boards` controls for enabling or disabling board reveals by friend.
- Added a device-side HTTP fallback for celebration queueing when MQTT is unavailable.
- Fixed the backend `request_key` ambiguity bug in `queue_friend_celebration_from_device`.
- Reduced Friends shared-board app self-heal from `15_000ms` to `3_000ms` to reduce viewer lag when realtime misses.

## Commands run

- `npm run typecheck`
- `npm run test:friend-celebration-gateway`
- `pio run -d firmware -e addone-esp32dev-beta`
- `pio run -d firmware -e addone-esp32dev-beta -t nobuild -t upload --upload-port /dev/cu.usbserial-10`
- `pio run -d firmware -e addone-esp32dev-beta -t nobuild -t upload --upload-port /dev/cu.usbserial-110`
- `pio device monitor --port /dev/cu.usbserial-10 --baud 115200`
- `pio device monitor --port /dev/cu.usbserial-110 --baud 115200`
- `npx supabase db push --linked`
- `git commit -m "Finalize friend celebration transport and testing loop"`

## Evidence

- `npm run typecheck` passed.
- `npm run test:friend-celebration-gateway` passed.
- Manual physical-device proof completed on March 25, 2026:
  - transition effect itself observed on hardware with the slower random-overlap reveal
  - successful friend-triggered playback flow observed after a stable `15s` hold on the sender board
  - clean automatic return to owner board observed after the friend-board dwell
- Simultaneous two-board testing also worked after temporarily allowing repeat same-day backend queueing; final once-per-day dedupe was then restored.
- Backend and firmware contract additions now exist:
  - MQTT event `addone/device/<hardware_uid>/event/friend-celebration-ready`
  - device command kind `play_friend_celebration`
  - payload fields:
    - `source_local_date`
    - `current_week_start`
    - `today_row`
    - `weekly_target`
    - `board_days`
    - `palette_preset`
    - `palette_custom`
    - `emitted_at`
    - `expires_at`
  - DB column `device_memberships.celebration_enabled`
  - RPCs:
    - `set_shared_board_celebration_enabled`
    - `queue_friend_celebration_from_device`

## Open risks / blockers

- No blocking issue remains for this slice.
- Residual risk: `play_friend_celebration` command handling still treats some ignored cases as applied when tracking is unavailable, which makes future simultaneous-debug sessions harder to interpret.
- Residual risk: Friends viewer updates are improved but still depend on realtime plus a `3s` self-heal fallback, so the friend app surface may still lag slightly under poor realtime conditions.

## Recommendation

Accept `T-027` on this branch. If the slice reopens later, the first cleanup worth doing is tightening receiver ack semantics so telemetry can distinguish `played` from `ignored`.
