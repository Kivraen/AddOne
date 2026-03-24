---
task_id: T-001
title: Friends finalization plan and proof strategy
date: 2026-03-24
agent: Codex
result_state: Planned
verification_state: Audit only
changed_paths:
  - Docs/agent-reports/2026-03-24-friends-finalization-plan-and-proof-strategy.md
  - Docs/briefs/B-020-stage-s3-friends-proof-and-fixes.md
  - Docs/Active_Work.md
  - Docs/project-memory.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
---

Stage
S3: Beta UI Completion And Social Shape

Status
Planning audit complete. `T-001` is functionally implemented, but acceptance is still blocked by missing live multi-account proof, not by missing architecture.

Current Friends implementation
- The Friends tab and route are real product surfaces, not placeholders.
- Social-profile completion is already enforced before Friends unlocks.
- The main Friends flow already supports:
  - share-code generation and display
  - copy and share actions
  - request-by-code
  - approve and reject
- Shared boards already render as read-only cards.
- The dedicated Requests screen already supports approve, reject, and revoke.
- Arrange-boards exists, but it is local-only ordering persisted in app storage, not synced social state.
- Data is already wired through the existing backend contract for:
  - shared boards
  - device sharing state
  - share requests
  - share-code rotation
  - viewer access management
  - realtime invalidation

Proof gap
- The gap is proof quality, not missing backend or UI architecture.
- Required `T-001` proof states still needing fresh live evidence:
  - incomplete profile -> gate to Profile
  - owner empty state / no linked boards
  - no pending requests
  - pending requests present
  - approved viewers present
  - shared boards present and read-only
- The current main Friends screen still falls back to preview boards when real shared boards are empty, so the empty state is not fully truthful.
- If Android matters for the beta proof, the non-iOS overflow path likely needs a narrow fix because it jumps straight to the share sheet and hides some main entry actions.

Required test setup
- `1 account + 1 owned AddOne device` is enough for:
  - profile gate
  - profile completion return
  - owner baseline state
  - share-code generation
  - share-code rotation
- `2 accounts + 1 owned AddOne device` is the minimum setup that closes `T-001`:
  - requester enters code
  - owner sees pending request
  - owner rejects or approves
  - viewer gets board access
  - owner sees connected viewer
  - owner revokes access
- `2 app clients` is the recommended proof rig:
  - one owner client
  - one viewer client
  - same backend
  - one real owned device is sufficient
- `2 owned devices` are not required for `T-001`.

Open risks / blockers
- `T-001` remains blocked on the external proof rig, not on implementation work.
- The real empty-state fallback is the one likely pre-proof code adjustment.
- The issue log still understates viewer revocation even though the implementation already exists.

Recommended execution order
1. Keep scope fixed to `T-001`.
2. Make the likely pre-proof fix:
   - remove preview-board fallback from the real empty state, or restrict it to explicit demo mode only.
3. Decide whether Android matters for this proof pass.
4. Run the live two-account proof sweep:
   - gate
   - owner baseline
   - viewer request
   - owner reject
   - viewer re-request
   - owner approve
   - viewer board appears
   - owner viewer list
   - owner revoke
   - viewer board disappears
5. Refresh the existing `T-001` report with the final live-proof state.
