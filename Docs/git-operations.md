# AddOne Git Operations

Last updated: April 5, 2026

This file records the real git and recovery state for AddOne so future agents do not have to reconstruct it from chat.

## Current Safe Repo

- Canonical working repo:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne`
- Stable branch:
  - `main`
- Stable major-save point:
  - `s4-stable-main-20260405-post-followups`
- Latest stable product follow-up included in that save point:
  - `c515422` `codex: restore board glow and calm android tabs`
- Active follow-up branch for tomorrow's work:
  - `codex/s4-post-stable-followups`
- Expected working tree status after the re-home:
  - clean

## Recovery Reality

- The temporary clean-clone recovery repo at `/Users/viktor/AddOne-clean` was used to reconstruct and stabilize the April 5 baseline.
- That recovered line is now being re-homed back into the normal dev-projects folder so there is one canonical workspace again.
- The previous Desktop repo is preserved as salvage in:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/_repo-backups/current/AddOne-salvage-20260405`
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/_repo-backups/current/AddOne-salvage-20260405.tar.zst`
- The old broken March 19 quarantine remains historical context only:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/_repo-backups/legacy/AddOne-broken-20260319`

## What Went Wrong

- Real product work lived too long as local-only state.
- Some accepted slices were recorded in docs and reports, but the matching code was not always pushed remotely.
- At least one important repo/worktree operation was done before fully mapping which checkout held the latest state.
- After the old Desktop repo became unreliable for Expo/Metro work, recovery temporarily moved active development into `/Users/viktor/AddOne-clean`.
- Result:
  - the recovered line is stable
  - the old Desktop repo is preserved as salvage only
  - the canonical repo path is now being restored back to `/Users/viktor/Desktop/DevProjects/Codex/AddOne`

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
  - `codex/s4-post-stable-followups` is the active tomorrow-work branch
  - new implementation work starts from a fresh branch off `main` unless the user explicitly wants to continue the follow-up line
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

- There is no active recovery gap in the canonical repo after the April 5 re-home.
- The salvage backup remains useful only as historical recovery material, not as the active source of truth.
- The current open release question is not a git backup problem. The saved stable line is tagged and pushed; the remaining explicit gate is the external Supabase auth dashboard settings confirmation recorded in the April 4 RC checkpoint report.

## Local Expo Recovery Rule

The April 5 simulator failure was not caused by the repo re-home itself. The actual local failure pattern was:

- Expo or Metro launched under the shell-default Node 24 instead of Node 22
- stale Watchman or `.expo` state after cleanup and repo moves
- cold Hermes bundle latency misread as a broken connection
- temporary local config edits made before restoring the known-good runtime path

Do not repeat that sequence.

Wrong response:

- editing `app.config.js` or `metro.config.js` first
- assuming `React Native DevTools quit unexpectedly` means the AddOne app crashed
- assuming Android is misconfigured because Expo Go shows `127.0.0.1:8081`

Correct response:

```bash
cd /Users/viktor/Desktop/DevProjects/Codex/AddOne
watchman watch-del-all
watchman watch-project /Users/viktor/Desktop/DevProjects/Codex/AddOne
rm -rf .expo
env EXPO_NO_DEPENDENCY_VALIDATION=1 EXPO_NO_GIT_STATUS=1 \
  /opt/homebrew/opt/node@22/bin/node node_modules/.bin/expo start --host lan --clear
```

Then attach simulators:

```bash
xcrun simctl launch booted host.exp.Exponent
xcrun simctl openurl booted 'exp://<LAN-IP>:8081'

adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d 'exp://<LAN-IP>:8081' host.exp.exponent
```

Notes:

- If macOS shows `React Native DevTools quit unexpectedly`, treat it as external debugger noise unless the app itself is separately failing.
- A slow first cold bundle after cleanup can still be healthy. Wait for Metro to finish compiling before changing repo config.
