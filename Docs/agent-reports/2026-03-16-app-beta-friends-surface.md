---
task_id: T-001
title: Beta Friends surface and social floor
date: 2026-03-20
agent: Codex
result_state: Implemented
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
  - components/app/friends-tab-content.tsx
  - hooks/use-friends.ts
  - lib/addone-query-keys.ts
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Implemented. The placeholder Friends lane is replaced with the first real beta sharing flow on top of the existing code-based sharing backend.

## Changes made

- Added `use-friends.ts` to query shared boards, active-device sharing state, and share request actions through the existing repository contract.
- Added new query keys for shared boards and active-device sharing state.
- Reworked the Friends tab into a real beta surface with:
  - share-code request entry
  - owner share code display and rotation
  - pending request approval or rejection
  - connected viewer list
  - read-only shared board cards using the real board renderer
- Added app-side realtime invalidation for Friends-specific data inside the new hook so board previews and owner sharing state refresh from the existing backend changes.
- Updated scoped product docs to reflect that the first Friends implementation now uses the existing share-code and approval model without adding a new backend migration.

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

## Evidence

- `npm run typecheck` passed.
- The existing sharing RPCs were sufficient. No new backend migration or new sharing RPC was required for `T-001`.
- Code verification confirms the Friends tab now wires to:
  - `request_device_view_access`
  - `rotate_device_share_code`
  - `approve_device_view_request`
  - `reject_device_view_request`
  - `fetchSharedBoards`
- Native UI proof captured the implemented Friends surface in Expo Go at `/tmp/friends-gate-demo-true.png`.
- The screen now includes:
  - share-code request entry
  - owner sharing controls
  - pending request lane
  - connected viewer lane
  - read-only shared-board section below the fold

## Open risks / blockers

- Manual proof is only partial in this report. I captured the implemented Friends surface in Expo Go and verified the branching logic in code, but I did not complete a full fresh runtime walkthrough for every required state from one clean seeded session.
- Viewer revocation is still out of scope for this slice.
- Friends-specific realtime invalidation now exists in the hook, but the current implementation also keeps a self-heal refetch interval as backup. If live board updates feel slow in practice, that should become a later polish pass rather than a blocker for this task.

## Recommendation

Submit this as the `T-001` implementation report with one caveat: if the coordinator wants stricter proof, the next pass should be a focused verification sweep rather than more feature work. The backend contract itself was sufficient, and the next major product decision should stay on onboarding/recovery or timezone validation rather than reopening the Friends data model.
