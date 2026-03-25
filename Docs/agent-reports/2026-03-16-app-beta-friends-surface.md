---
task_id: T-001
title: Beta Friends surface and social floor
date: 2026-03-24
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - components/app/friends-arrange-screen.tsx
  - components/app/friends-requests-screen.tsx
  - components/app/friends-tab-content.tsx
  - components/app/profile-tab-content.tsx
  - hooks/use-friends.ts
  - hooks/use-is-mounted-ref.ts
  - lib/addone-query-keys.ts
  - lib/friends-state.ts
  - lib/supabase/addone-repository.ts
  - package-lock.json
  - package.json
  - providers/app-providers.tsx
  - supabase/migrations/20260324200532_add_revoke_device_viewer_membership.sql
  - supabase/migrations/20260324223500_add_leave_shared_board.sql
  - supabase/migrations/20260324232000_add_list_shared_board_owners.sql
  - tests/friends-state.test.mjs
  - types/addone.ts
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented and freshly live-verified on the branch. `T-001` is no longer only code-complete; the owner/viewer Friends flow was re-tested with two real accounts on iPhone and Android, including owner-side revoke and viewer-side removal from `Manage boards`.

## Changes made

- Hardened the Friends data flow around explicit owner and viewer query scopes so request state and shared-board state do not stomp each other.
- Added deterministic cache reconciliation for:
  - request submit
  - approve
  - reject
  - owner revoke
  - viewer leave
- Fixed the false proof-mode branch in `useFriends` so live owner revoke and viewer leave no longer no-op while reporting success.
- Added native reconnect wiring through React Query `onlineManager` and `@react-native-community/netinfo`.
- Preserved last known good shared-board data during transient refetches instead of degrading to fake empty state or `"AddOne User"`.
- Replaced the old viewer-only `Arrange boards` utility with `Manage boards`, which now supports:
  - local ordering
  - viewer-side removal of a shared board
- Added backend support for viewer-side leave and secure owner-name lookup:
  - `leave_shared_board`
  - `list_shared_board_owners`
- Added focused Friends state tests for reconciliation helpers and empty-state truthfulness.

## Commands run

- `npm run typecheck`
- `npm run test:friends-state`
- `npm run test:runtime`
- `npx supabase db push --linked`
- `npx expo start --host lan -c`

## Evidence

- `npm run typecheck` passed.
- `npm run test:friends-state` passed.
- `npm run test:runtime` passed.
- Live two-account proof was completed with:
  - owner account on iPhone: `kvforjob@gmail.com`
  - viewer account on Android: `bestemailon@gmail.com`
- Required `T-001` proof states were observed live:
  - incomplete-profile user was blocked by the Friends profile gate until the social profile was saved
  - owner empty state showed truthful empty Friends UI with demo fallback removed
  - no-pending-requests state was confirmed on the owner surface
  - pending request appeared after the viewer entered the owner share code
  - approved viewer state was visible on the owner side after approval
  - shared board appeared on the viewer side and remained read-only
- Owner-side revoke was re-tested live and confirmed working without manual refresh after the `useFriends` proof-mode bug was fixed.
- Viewer-side removal from `Manage boards` was re-tested live and confirmed working without manual refresh.
- The flow was validated in both directions:
  - iPhone owner to Android viewer
  - Android owner to iPhone viewer
- Runtime traces during the successful pass showed the write paths resolving to `revoked` for both owner revoke and viewer leave instead of silently reporting success.
- Owner display names now resolve on shared boards through the secure owner-name lookup path instead of falling back to `"AddOne User"`.
- In the final user proof pass, most transitions landed in roughly `1-2s`, with occasional slower refreshes that still completed successfully.

## Open risks / blockers

- No `T-001` acceptance blocker remains from the Friends implementation itself.
- Development logs still show noisy realtime channel churn:
  - repeated `SUBSCRIBED` / `CLOSED`
  - occasional `CHANNEL_ERROR` with `mismatch between server and client bindings for postgres changes`
- That realtime noise appears to be the main reason some refreshes occasionally take longer than the normal `1-2s`, but it did not break the verified owner/viewer flows in this pass.
- Future scale work for very high-fanout sharing should be treated as a separate follow-up, not folded into `T-001`.

## Recommendation

Accept `T-001` on this branch. The Friends beta surface is now both implemented and live-verified for the required proof states, including owner revoke and viewer-side board removal. Any next pass should be a narrow follow-up on realtime channel noise and higher-scale sharing resilience, not more first-beta Friends feature work.
