# AddOne Git Simple Guide

Last updated: March 20, 2026

This file explains AddOne git behavior in plain language.

## The Five Core Ideas

1. `Repo`
- A repo is the whole project with its files and git history.
- Right now the repo we should use is:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne`

2. `Branch`
- A branch is one named line of work.
- Right now the branch we should use is:
  - `main`

3. `Dirty`
- `Dirty` does not mean broken.
- It means local file changes exist that are not committed yet.
- Those changes are easier to lose or confuse during risky git operations.

4. `Commit`
- A commit is a saved checkpoint in git history.
- If work is only in the dirty tree, it is not fully saved yet.

5. `Push`
- Push sends commits to GitHub.
- If something is committed but not pushed, it is still only backed up locally.

## Why This Got Confusing

- We had more than one local line of truth:
  - the remote branch tip on GitHub
  - a newer local-only checkpoint in the old repo
  - at times, dirty local work on top of that
- During recovery, the clean repo was rebuilt from the remote branch tip.
- That made the clean repo stable, but older than the newest local-only checkpoint.
- So two things were true at once:
  - the new clean repo was healthy
  - the newest local UI state was not fully inside it yet

## The Most Important Lesson

If the app looks right and feels like a checkpoint, we need to do all three:

1. commit it
2. push it
3. only then do risky git actions like:
- making a new worktree
- renaming repos
- recovery
- switching main working branches

## How You Should Behave

- During active work:
  - it is okay if the tree is dirty for a little while
- Before risky changes:
  - ask me to show:
    - repo path
    - branch name
    - `git status`
    - whether the branch is pushed
- When something feels like a good stopping point:
  - ask for a checkpoint commit and push
- If the app is running in a simulator and looks correct:
  - do not assume that means GitHub has it
  - ask whether that exact state is committed and pushed
- If you hear `local-only`:
  - think "this exists only on this machine right now"

## How Codex Should Behave

- Always tell you which repo and branch are active before risky git work.
- Do not say recovery is complete until checking for newer local-only commits.
- Commit accepted code, not just docs about the code.
- Push durable checkpoints when possible.
- Treat repo surgery as dangerous unless the tree is clean and backed up.

## Safe Routine For Us

Use this as the default workflow:

1. work on one branch in one main repo
2. let the tree be dirty only for the current small slice
3. once the slice works, commit it
4. push it
5. only then start another major slice or do git surgery

## Current Truth

- Safe repo:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Stable official branch:
  - `main`
- New work should usually happen on:
  - a fresh branch created from `main`
- Quarantined old repo:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne-broken-20260319`
- Recovery status:
  - the newer local-only UI state has already been recovered and promoted to `main`
- Worktree rule:
  - do not use worktrees by default
  - use them only when we explicitly want two active checkouts at the same time
