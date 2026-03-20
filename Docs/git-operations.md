# Git Operations

Last locked: March 19, 2026

This file is the durable Git and recovery policy for AddOne.
Use it to keep the repo recoverable for future agents with no chat memory.

## Current Safe Baseline

- Canonical working repo: `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Current safe branch: `codex/recovery-safe-baseline-20260319`
- Quarantined repo: `/Users/viktor/Desktop/DevProjects/Codex/AddOne-broken-20260319`
- Filesystem backup: `/Users/viktor/Desktop/DevProjects/Codex/AddOne-backups/AddOne-filesystem-backup-20260319-214500`

Do not use the quarantined repo for new commits, worktrees, or branch surgery.

## What Happened

The repo problem was not one single mistake.
It was a combination of process drift and local Git health trouble:

- Accepted work accumulated as a large local dirty tree instead of being turned into regular implementation checkpoint commits.
- Coordination docs and reports were committed more reliably than the matching product changes, so durable memory and real code drifted apart.
- Local backup trees and temp artifacts lived close enough to normal repo work to create noise and confusion.
- The old repo then developed Git object-store read timeouts, which made `push`, `fsck`, `archive`, and worktree materialization unreliable.
- Because not every accepted slice had already been committed and pushed, recovery had to rely on a filesystem backup and a clean-clone recovery branch.

## Non-Negotiable Rules

- Commit accepted implementation slices, not just coordinator docs.
- Push accepted checkpoints to GitHub when a remote exists.
- Keep the working tree clean before:
  - creating worktrees
  - renaming repo directories
  - merging or rebasing branches
  - handing a stage from one agent to another
- If a stage is accepted but the code is still only in the dirty working tree, the save step is not complete.
- Keep local-only backups, recovery clones, and bulky temp folders outside the repo root whenever possible.
- If a local-only folder must exist temporarily, ignore it explicitly and remove it as soon as it is no longer needed.
- Create a checkpoint commit before risky refactors, broad UI passes, or overnight stopping points.

## Dirty Tree Triage

If `git status` shows broad unrelated changes at a stage boundary:

1. Separate the changes into:
   - accepted checkpoint work
   - active scoped WIP
   - local-only noise
2. Commit the accepted checkpoint work first.
3. Push that checkpoint if a remote exists.
4. Move local-only backups and recovery artifacts out of the repo, or ignore them explicitly.
5. Only then start a new stage, new agent brief, worktree, or repo rename.

Do not stack a new active stage on top of a large unexplained dirty tree.

## Repo Health Escalation Rules

If any of these happen, stop normal coordination work and switch into repo recovery mode:

- tracked files disappear unexpectedly
- `git fsck` fails or hangs
- `git push` or `git archive` hits object read or mmap timeouts
- worktree creation or checkout fails on objects that should exist
- Git commands become unreliable on otherwise normal reads

Recovery mode means:

1. Make a plain filesystem backup of the working tree.
2. Treat the current repo as quarantined.
3. Clone fresh from the healthiest known remote or local commit.
4. Restore the verified working tree into that clean clone.
5. Commit and push a recovery baseline before normal work resumes.

## Coordinator Expectations

The coordinator must treat Git hygiene as part of stage delivery, not as separate housekeeping.

Before opening a new implementation brief, the coordinator should confirm:

- the current branch and remote backup state are known
- the working tree is clean enough to be recoverable
- accepted work is committed
- the latest durable state is pushed, or the backup gap is explicitly recorded

If those are not true, the coordinator should pause and stabilize the repo first.
