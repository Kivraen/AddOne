# AddOne Git Operations

Last updated: April 4, 2026

This file records the real git and recovery state for AddOne so future agents do not have to reconstruct it from chat.

## Current Safe Repo

- Canonical working repo:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Current branch:
  - `codex/s4-final-rc-review`
- Current clean branch tip:
  - `c3372db` `codex: checkpoint final rc review and ota stability`
- Tracking branch:
  - `origin/codex/s4-final-rc-review`
- Current working tree status:
  - clean

## Recovery Reality

- The clean repo is healthy and should be used for ongoing work.
- The quarantined repo still exists at:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne-broken-20260319`
- The newer local-only recovery line was successfully reconstructed and promoted.
- The recovered latest UI baseline now lives on:
  - `main`
  - `origin/main`
  - `codex/ui-skin-recovered-local-latest`
- Recovery checkpoint tags now exist on the remote:
  - `ui-recovered-candidate-20260320`
  - `main-before-ui-recovered-20260320`

## What Went Wrong

- Real product work lived too long as local-only state.
- Some accepted slices were recorded in docs and reports, but the matching code was not always pushed remotely.
- At least one important repo/worktree operation was done before fully mapping which checkout held the latest state.
- After the old repo showed git/object-store instability, recovery rebuilt a clean repo from the remote branch tip instead of the newest local-only branch tip.
- Result:
  - the clean repo is stable
  - the old repo is quarantined
  - the recovered latest UI state is now back inside the canonical repo and on `main`

## Plain Language Rules

- `commit` means: save the current repo state into git history on the current branch.
- `push` means: copy those commits to GitHub so they are backed up remotely.
- `dirty` means: local file changes exist that are not committed yet.
- `branch` means: a named line of history.
- `worktree` means: another local checkout of the same git repo. It can hold newer work than the main folder if we are not careful.

## Required Practice

- After any accepted stage or important implementation slice:
  - update the relevant docs
  - commit the code and docs together when they belong to the same accepted slice
  - push the commit if the remote is available
- Do not treat a report-only checkpoint as a full save if the product code is still only in a dirty working tree.
- Before merges, worktrees, repo renames, or recovery actions:
  - run `git status --short --branch`
  - confirm the exact repo path
  - confirm the exact branch name
  - confirm whether the current state is already pushed
- Default workflow from here:
  - `main` stays stable
  - `codex/s4-final-rc-review` is the current saved RC candidate branch
  - new implementation work starts from a fresh branch off `main` unless the user explicitly wants to continue the RC line
  - use worktrees only when we intentionally want two active checkouts at once
- Avoid force-push and history rewrites unless the user explicitly asks.
- Keep local backup folders and temporary recovery clones outside the active repo root.

## User Behavior Rules

- Ask which repo path and branch we are on before any risky git action.
- If the app looks right and feels like a checkpoint, ask for:
  - a commit
  - a push
  - optionally a tag if you want a named restore point
- It is okay to have a dirty tree while actively working on one slice.
- It is not okay to leave large unexplained dirty state across:
  - repo surgery
  - worktree changes
  - recovery
  - overnight stopping points
  - stage boundaries
- If you hear `dirty`, think:
  - "these changes exist only on this machine until we commit them"
- If you hear `not pushed`, think:
  - "GitHub does not have this yet"

## Coordinator Rules

- Always say the active repo path and branch before deep implementation or git surgery.
- Do not open new worktrees or rename repos until the active state is checkpointed.
- If a repo shows git integrity symptoms, stop normal work, make a filesystem backup, and continue from a healthy clone.
- If the clean repo was rebuilt from a remote tip, explicitly check whether a newer local-only branch or checkpoint existed in the old repo before declaring recovery complete.

## Current Recovery Gap

- There is no active recovery gap in the canonical repo right now.
- The broken repo remains useful only as historical quarantine, not as the active source of truth.
- The current open release question is not a git backup problem. The saved RC branch is now pushed; the remaining explicit gate is the external Supabase auth dashboard settings confirmation recorded in the April 4 RC checkpoint report.
