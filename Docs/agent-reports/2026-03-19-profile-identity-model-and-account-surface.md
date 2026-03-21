---
task_id: T-009
title: Profile identity model and account surface
date: 2026-03-20
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
  - app.config.js
  - components/app/friends-tab-content.tsx
  - components/app/profile-tab-content.tsx
  - hooks/use-social-profile.ts
  - lib/addone-query-keys.ts
  - lib/supabase/addone-repository.ts
  - lib/supabase/database.types.ts
  - package-lock.json
  - package.json
  - supabase/migrations/20260320110000_add_profile_identity_fields.sql
  - types/addone.ts
---

## Stage

S3: Beta UI Completion And Social Shape

## Status

Ready for submission. This report includes the full profile-identity slice, the later UI cleanup pass, and the hosted Supabase rollout. The app now has the friend-facing identity model, the Friends gate and handoff, native photo entry points, a tighter profile UI, and the Profile screen in Expo Go showing both the signed-in email and Sign out.

## Changes made

- Used the `building-native-ui` skill and reshaped the profile flow around a real social identity: required `first_name`, required `last_name`, required unique `username`, derived `display_name`, optional avatar photo.
- Kept email OTP auth unchanged. Email remains private and auth-only and is not used as the friend-facing label.
- Reworked the Profile surface so the social identity is primary, the copy is much shorter, the avatar uses a compact edit affordance, and the account area visibly shows email plus Sign out.
- Reworked the Friends gate so incomplete users are routed to `/profile?from=friends`, while the completed Friends page no longer shows profile-setup content and stays focused on Friends-lane placeholders only.
- Added native avatar support with `expo-image-picker` and `expo-image` instead of an avatar URL field.
- Added migration-aware repository errors so raw schema-cache and backend messages do not leak into the UI.
- Schema and repository addition for unique usernames: `20260320110000_add_profile_identity_fields.sql` adds `username`, `first_name`, `last_name`, the case-insensitive unique username index, the `profile-avatars` storage bucket, and storage policies. `addone-repository.ts` now saves the derived `display_name` and handles avatar upload and remove.
- Hosted backend rollout completed. The AddOne Supabase project was linked and the pending remote migrations were pushed, including the profile-identity migration.
- `lib/supabase/database.types.ts` was updated in-repo for the chosen schema change.

## Commands run

- `npx expo install expo-image-picker expo-image`
- `npm run typecheck`
- `npx expo start --clear`
- `CI=1 EXPO_PUBLIC_SUPABASE_URL='' EXPO_PUBLIC_SUPABASE_ANON_KEY='' npx expo export --platform web --output-dir /tmp/addone-web-export-proof-4`
- `python3 -m http.server 19010`
- `python3 -m http.server 19011`
- `python3 -m http.server 19012`
- `npx supabase projects list`
- `npx supabase link --project-ref sqhzaayqacmgxseiqihs`
- `npx supabase db push`
- `npx supabase migration list`
- `xcrun simctl io booted screenshot /tmp/addone-expo-check.png`

## Evidence

- `npm run typecheck` passed.
- Manual UI evidence captured for:
  - incomplete social profile and Friends gate
  - Friends handoff into the Profile gate
  - username uniqueness conflict
  - compact profile photo actions
  - completed social profile state
  - final cleaned Profile layout
  - final cleaned Friends completed state with no profile-setup residue
  - Expo Go native cloud-session proof showing actual email plus Sign out in Profile
- `npx supabase migration list` shows both local and remote include `20260320110000_add_profile_identity_fields.sql`.

## Open risks / blockers

- `supabase gen types typescript --linked` could not be re-run after the remote push because this shell lacks a `SUPABASE_ACCESS_TOKEN`, so `database.types.ts` is updated in-repo but not freshly regenerated from the hosted project after rollout.
- Native camera and photo capture entry points are wired and visible, but there is no full live camera capture and save proof yet.
- The completed Friends screen is intentionally still placeholder lane content (`Share by code`, `Requests`, `Connected boards`); actual sharing functionality remains out of scope for this task.

## Recommendation

Submit this as the coordinator report for `T-009`. The backend migration is already applied, so the earlier live `first_name` error should be resolved after app reload. The next task should now stay focused on the actual Friends core functionality, not more profile-model work.

## Summary

`T-009` implemented the first real friend-facing social identity model for beta, kept email OTP auth unchanged, and added the Friends entry gate that the next sharing task depends on.

## Source docs used

- `Docs/AddOne_Main_Plan.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/AddOne_Backend_Model.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/ui-beta-issue-log.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`

## Files changed

- `Docs/AddOne_Backend_Model.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/ui-beta-issue-log.md`
- `app.config.js`
- `components/app/friends-tab-content.tsx`
- `components/app/profile-tab-content.tsx`
- `hooks/use-social-profile.ts`
- `lib/addone-query-keys.ts`
- `lib/supabase/addone-repository.ts`
- `lib/supabase/database.types.ts`
- `package-lock.json`
- `package.json`
- `supabase/migrations/20260320110000_add_profile_identity_fields.sql`
- `types/addone.ts`

## Verification

- Verified `npm run typecheck`.
- Verified the migration exists locally and remotely via `npx supabase migration list`.
- Verified in code that:
  - the Profile surface now shows social identity editing plus email and Sign out
  - the Friends tab gates incomplete users to `/profile?from=friends`
  - completed users see Friends-lane placeholders instead of profile-setup copy
- Manual UI proof exists for the required incomplete, completed, conflict, and Friends-handoff states.

## Decisions / assumptions

- Beta social identity is now `first_name + last_name + @username`, with `display_name` kept as the derived storage field.
- Username remains identity-only for beta, not open discovery.
- Profile photos use native camera or library flows backed by Supabase storage instead of a pasted URL field.

## Open questions or blockers

- A fresh hosted-type generation run is still missing because the shell does not have `SUPABASE_ACCESS_TOKEN`.
- The first real Friends sharing flow still needs `T-001`.

## Recommended next handoff

- Accept `T-009`.
- Move the active execution slice to `T-001` on the profile-gated Friends flow.
