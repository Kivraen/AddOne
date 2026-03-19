# AddOne Git Operations

Last updated: March 18, 2026

This file captures the git and GitHub reliability rules for AddOne's stage-coordinator workflow.

## Memory Rule

- Treat repo docs and git history as one long-term memory system.
- Durable coordination state is not complete until:
  - the docs are updated
  - the state is committed
  - the committed state is pushed when a remote exists, or the reason it is not pushed is recorded here

## Current Remote State

- Remote configured:
  - `origin -> https://github.com/Kivraen/AddOne.git`
- Current branch:
  - `codex/ui-skin-main-screen`
- Tracking branch:
  - `origin/codex/ui-skin-main-screen`
- Remote sync status at last review:
  - local branch is `ahead 7`
- Latest durable coordination checkpoint commit:
  - `b47d08a` `codex: establish stage coordination system`

## Current Backup Gap

- GitHub remote exists, but the current branch has local commits that are not yet pushed.
- Until those commits are pushed, GitHub is not a full backup of the current coordination state.

## Required Git Practice

- After any accepted stage or important coordination update:
  - update the relevant docs
  - commit the state
  - push it if the remote is available and pushing is appropriate
- If the state is not pushed:
  - record the reason explicitly in durable docs
- Avoid force-push and avoid rewriting shared history unless the user explicitly asks.
- Keep coordination commits scoped so they can be trusted as recovery points.

## Checkpoint Guidance

- Before risky redesigns, broad refactors, or overnight stopping points:
  - create a checkpoint commit
  - create a tag if the user wants a named restore point
  - push that checkpoint if the remote is available
- Tags are especially useful before:
  - large UI rewrites
  - major firmware architecture changes
  - schema or infra changes that affect multiple subsystems

## Handoff Hygiene

- Keep the working tree clean before major handoff points whenever practical.
- If decisions are discussed in chat or other external surfaces, summarize them back into repo docs.
- Do not treat chat, PR comments, or issue comments as source of truth until the decision is reflected in `Docs/`.
