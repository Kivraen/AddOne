# Stage S3: Trusted Beta Surface Alignment

## Status

`pending`

## Goal

Make the visible beta app surface match the intended shipped scope so user-facing experience and product truth are aligned.

## Success Metrics

- The visible `Friends` tab is no longer placeholder UI.
- The shipped history-editing path is singular and documented clearly enough that app behavior and docs do not drift.
- The app surface is verified with typecheck and manual UI evidence against the existing backend contract.

## Required Proof

- Updated app files and scoped docs for the sharing surface and history path.
- Manual UI evidence for loading, empty, populated, and error states where relevant.
- Verification that the implementation uses the existing sharing backend contract or records a concrete blocker if not.

## Non-Negotiables

- Do not leave placeholder user-facing beta surfaces in place if the stage is accepted.
- Do not invent a second sharing model if the current backend contract is sufficient.
- Keep scope to the beta surface and the docs needed to describe it.

## Evidence

- Backend sharing helpers already exist in `lib/supabase/addone-repository.ts`.
- `Friends` is currently visible placeholder UI in `components/app/friends-tab-content.tsx`.

## Open Risks / Blockers

- Realtime invalidation for sharing views may still need a follow-up after the first implementation pass.
- The exact first-user sharing shape may still need minor scope refinement after `S2`.

## Recommendation

Dispatch after `S2` unless the user explicitly reprioritizes the visible app surface sooner.
