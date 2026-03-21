---
task_id: T-001
title: Beta Friends surface and social floor
date: 2026-03-20
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - app.config.js
  - app/(app)/friends-arrange.tsx
  - app/(app)/friends-requests.tsx
  - components/app/friends-arrange-screen.tsx
  - components/app/friends-requests-screen.tsx
  - components/app/friends-tab-content.tsx
  - components/app/home-screen.tsx
  - components/board/device-board-stage.tsx
  - hooks/use-friends-board-order.ts
  - hooks/use-friends.ts
  - lib/supabase/addone-repository.ts
  - package-lock.json
  - package.json
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented and ready for coordinator review. The Friends tab is no longer a placeholder lane. It now behaves like a real first-beta social surface with code-based connection, owner request management, read-only friend boards, per-card sharing, and a compact ordering screen.

## Changes made

- Reworked the Friends tab around a quiet board-first layout:
  - compact overflow menu instead of a permanent control strip
  - friend boards as the primary surface
  - board cards with avatar, person-first naming, compact status rail, and per-card share action
- Replaced the earlier near-copy board treatment with the shared board stage component so Home and Friends use the same device/grid visual system.
- Added first-owner share-code generation and owner sharing controls that no longer get stuck on an empty dashed state.
- Added glass modal flows for:
  - joining by code
  - sharing your code
- Moved request management out of a cramped popup into a dedicated screen with standard navigation.
- Added request management actions with compact icon-first controls:
  - approve
  - reject
  - revoke existing viewer access
- Extended the repository and Friends hook so connected viewers can actually be revoked through the backend instead of only hidden in UI.
- Added per-card sharing for friend boards:
  - share action on each board row
  - dedicated export snapshot with a light background
  - no live status/share chrome included in the shared image
- Added long-name handling so people names stay fixed-size and truncate cleanly instead of shrinking unpredictably.
- Added a first-pass `Arrange boards` screen with a compact board list and local persisted order preference keyed by signed-in user.
- Kept the implementation on the existing backend contract. No new sharing migration or new social RPC layer was required for the Friends core itself.

## Commands run

- `rg -n "share code|share_code|request access|approve|reject|viewer|shared board|device_share|pending request|rotate share|linked boards|sharing" lib hooks components app supabase types -g '!node_modules'`
- `sed -n '1,360p' lib/supabase/addone-repository.ts`
- `sed -n '360,920p' lib/supabase/addone-repository.ts`
- `sed -n '430,610p' supabase/migrations/20260308113000_init_addone_schema.sql`
- `npm run typecheck`
- `CI=1 EXPO_PUBLIC_SUPABASE_URL='' EXPO_PUBLIC_SUPABASE_ANON_KEY='' npx expo export --platform web --output-dir /tmp/addone-friends-proof`
- `python3 -m http.server 19013 --directory /tmp/addone-friends-proof`
- `EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL='' EXPO_PUBLIC_SUPABASE_ANON_KEY='' npx expo start --clear --port 8112`
- `xcrun simctl openurl booted 'exp://127.0.0.1:8112/--/friends'`
- `xcrun simctl io booted screenshot /tmp/friends-gate-demo-true.png`
- `npx expo install react-native-view-shot expo-sharing`
- `npm install react-native-draggable-flatlist`
- `npm install react-native-draglist`

## Evidence

- `npm run typecheck` passed.
- The existing share-code contract was sufficient. No new `T-001` backend migration was required.
- The Friends implementation now uses the repository contract directly for:
  - `fetchSharedBoards`
  - `fetchDeviceSharing`
  - `requestDeviceViewAccess`
  - `rotateDeviceShareCode`
  - `approveDeviceViewRequest`
  - `rejectDeviceViewRequest`
  - `revokeDeviceViewerMembership`
- The Requests screen now has standard in-app navigation and compact icon actions instead of a modal-bottom-sheet treatment.
- The friend board share action produces a dedicated export snapshot rather than a raw screen capture of the live glass card.
- The shared board visual on Friends now comes from the same `DeviceBoardStage` component used on Home, so future board-surface changes can happen in one place.
- Manual UI proof in this pass included:
  - first-owner no-code state and code generation
  - header/menu refinement on the Friends page
  - request-management screen layout
  - per-card share snapshot output
  - long-name preview handling
  - arrange-screen rendering and drag interaction
- Runtime screenshots or proof artifacts captured during the pass include:
  - `t001-owner-generate-code.png`
  - `t001-cloud-friends.png`
  - `t001-friends-route.png`
  - `t001-friends-panel-finalish.png`
  - `t001-proof-current.png`
  - `t001-proof-current-2.png`

## Open risks / blockers

- The new board-ordering preference is currently verified with preview rows and local persistence, but not yet with a live multi-board cloud dataset.
- The current arrange screen is intentionally local-preference only. It affects how this signed-in user sees the board list; it is not a shared or backend-synced ordering model.
- The fallback preview ordering on the main Friends screen is not the critical path and was not the target of this pass. The important path is real shared-board ordering once actual boards exist.
- Friends-specific realtime invalidation still keeps a self-heal refetch interval as backup. If live board updates feel slow in practice, that should be handled as later polish, not a blocker for this report.

## Recommendation

Submit this as the `T-001` report for coordinator review. The Friends UI and core flow now feel product-shaped rather than placeholder-shaped. The next coordinator decision should be whether this is acceptable as `Friends ready pending live-data proof` or whether one final narrow proof pass is still required using real connected boards and real request traffic.
