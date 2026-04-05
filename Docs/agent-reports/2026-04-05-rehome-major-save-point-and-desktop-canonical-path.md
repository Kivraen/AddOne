## Stage

`S4: Beta Hardening And Durable Release Memory`

## Status

Re-home and major-save checkpoint on April 5, 2026.

This note records the repo normalization after the April 5 recovery line:

- the latest stable product follow-up is preserved
- the GitHub `main` save point is promoted again from the recovered line
- the temporary clean recovery repo is retired
- `/Users/viktor/Desktop/DevProjects/Codex/AddOne` becomes the canonical working repo again

## Changes made

- Preserved the salvaged pre-re-home Desktop repo in a dated backup folder and compressed archive.
- Restored the recovered clean repo back into the normal dev-projects path.
- Normalized the living coordination docs so fresh agents no longer treat `/Users/viktor/AddOne-clean` as the canonical workspace.
- Recorded the new major save point and the backup locations for the retired salvage copy.

## Evidence

- Stable save point includes the April 5 stable baseline plus the later follow-up product commit:
  - `c515422` `codex: restore board glow and calm android tabs`
- Canonical repo path after re-home:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Salvage backup paths:
  - `/Users/viktor/Desktop/DevProjects/Codex/_repo-backups/AddOne-salvage-20260405`
  - `/Users/viktor/Desktop/DevProjects/Codex/_repo-backups/AddOne-salvage-20260405.tar.zst`
- Stable restore tag:
  - `s4-stable-main-20260405-post-followups`
- Active follow-up branch after re-home:
  - `codex/s4-post-stable-followups`

## Open risks / blockers

- The March 27 Supabase auth dashboard URL / OTP settings confirmation is still the main explicit external release check.
- The hosted Supabase migration-history admin gap from the April 5 review-fix report is still open until project-admin CLI access is available again.

## Recommendation

Use `/Users/viktor/Desktop/DevProjects/Codex/AddOne` as the only active AddOne repo going forward.

Treat `_repo-backups/AddOne-salvage-20260405` and its archive as recovery-only material.

Continue tomorrow's final validation from `codex/s4-post-stable-followups`, not from any older recovery or salvage branch.
