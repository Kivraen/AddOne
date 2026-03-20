# Stage S3: Beta UI Completion And Social Shape

## Status

`active`

## Goal

Lock the visible beta app surface, the first-user profile model, the beta Friends shape, and the beta timezone model before validation and hardening work take over.

## Success Metrics

- The social-profile/account surface exists and cleanly gates Friends entry.
- First-beta Friends is implemented as profile-gated code sharing plus live read-only board browsing.
- The beta timezone path is explicit and accepted, with no fake universal promise.
- Onboarding and Wi-Fi recovery receive the final visible polish pass.
- Repo-wide UI verification can be trusted again.

## Required Proof

- `T-009` accepted
- `T-001` accepted
- `T-008` accepted
- `T-011` accepted or explicitly blocked with a durable beta policy
- manual proof across the visible beta surfaces
- repo-wide `typecheck` remains meaningful

## Non-Negotiables

- UI tasks use `.agents/skills/building-native-ui/SKILL.md`.
- Device timezone remains the canonical scheduling setting.
- Viewer/display timezone remains a separate future concept.
- First-beta Friends stays narrow: no feed, comments, messaging, or challenge groups in the initial surface.
- Onboarding and Wi-Fi recovery stay as the final visible UI polish slice.

## Evidence

- `T-014` accepted: repo-wide typecheck noise removed.
- `T-015` accepted: first-beta Friends plan and model lock are explicit.
- cumulative resident UI checkpoint exists in `2026-03-19-s3-cumulative-ui-surface-report.md`.
- timezone audit is accepted, and timezone implementation remains under revision via `T-011`.

## Open Risks / Blockers

- `T-009` is still not implemented.
- `T-011` still needs reset-time closure and manual proof.
- The historical dashboard source is not currently restored in the recovery repo.

## Recommendation

- Keep `S3` active.
- Execute `T-009` next.
- Move to `T-001` after `T-009` is accepted.
- Hold `T-008` as the last visible UI slice.
