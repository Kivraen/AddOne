# Stage Coordinator Skill For Andrey

Prepared: March 21, 2026

This file is a self-contained shareable version of the coordinator system used on AddOne.
It explains the coordinator role, the delivery loop, the repo-health rules, and the newer rule that user-facing work is iterative by default.

## Purpose

Use this skill when one agent acts as the coordinator for a repo and other agents execute scoped tasks.

The coordinator is responsible for:

- creating durable project memory
- defining the stage map
- keeping one active stage at a time unless parallel work is explicitly approved
- generating copy-paste worker briefs
- reviewing worker reports against acceptance gates
- updating the source-of-truth docs
- making sure accepted state is committed and pushed

The coordinator is not just a planner.
The coordinator is the person responsible for making the repo recoverable and the project state legible.

## Core Idea

Treat:

- repo docs
- git history
- coordinator reviews

as one durable memory system.

Do not rely on chat alone.
Do not rely on an agent remembering what happened.
If a decision matters, write it down in the repo and checkpoint it in git.

## Coordinator-Owned Docs

The coordinator should own and keep current:

- `Docs/AddOne_Main_Plan.md` or equivalent master plan
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- current active stage note
- `Docs/Active_Work.md`

Workers should not edit those files directly unless the coordinator explicitly asks for it.

## Stage Model

Use stages as outcome gates, not vague themes.

Every stage should have:

- goal
- success metrics
- required proof
- non-negotiables
- current status

Keep one active stage at a time unless parallel work is explicitly approved.

## Task Model

Tasks are execution units inside a stage.

Every worker task should be narrow enough that:

- scope is obvious
- proof is obvious
- the report can be reviewed cleanly

## Required Worker Brief Contents

Every worker brief should include:

- repo path
- implementation branch
- stage name
- stage goal
- exact success metrics
- required proof
- non-negotiables
- scoped files and docs
- report format

For visible UI or usability-sensitive work, also include:

- the repo-specific UI direction doc, if one exists
- an explicit iteration rule

## Required Worker Report Format

Every worker report should include:

1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`

If the work is user-facing and iterative, the report must reflect the final branch state after user feedback, not just the first implementation pass.

## Default Coordinator Loop

### 0. Guard repo health

Before deep work or a handoff:

- run `git status --short --branch`
- check whether the tree is clean
- if it is broadly dirty, classify changes into:
  - accepted checkpoint work
  - active scoped WIP
  - local-only noise

Do not stack a new stage or new agent on top of a large unexplained dirty tree.

### 1. Establish memory

Create or refresh the coordination docs.
Record:

- stable facts
- current stage map
- accepted decisions
- blockers
- next brief

### 2. Plan the work

Split the project into outcome-based stages.
Split the active stage into narrow execution tasks.

### 3. Brief an agent

Give the worker:

- exact scope
- exact proof requirements
- exact guardrails

If the work is visible or design-sensitive:

- tell the worker iteration is expected
- tell the worker not to assume first pass equals final
- tell the worker to refresh the report after user feedback

### 4. Gate the report

Review the report against the active stage note.

Return only one of:

- `accepted`
- `revise and retry`
- `blocked`

Rules:

- `accepted` means the proof satisfies the gate
- `revise and retry` means the work moved forward, but proof or scope is incomplete
- `blocked` means an external dependency or new decision is required

Do not accept based on implementation claims alone.

### 5. Save the state

After material coordinator changes or accepted work:

- update the relevant docs
- commit the state
- push if a remote exists

If a beta-scope product slice is implemented but not yet accepted:

- do not discard it
- checkpoint it on the task branch
- keep it in the plan
- define the exact follow-up proof or support task

## Iterative User-Facing Work Rule

This is the most important recent update.

User-facing work is iterative by default.

That means:

- the first implementation pass is usually not the final result
- if the user keeps refining the UI, the task is still active
- the worker should keep track of what changed, what feedback was given, and what decisions were made
- the final report must describe the actual final branch state after those iterations

A user-facing task is ready for coordinator review only when:

- the user explicitly says the result is acceptable, or
- the user explicitly asks for a checkpoint review even though more iteration may follow

If the user materially changed direction after the original report:

- require a refreshed report
- do not treat the old report as authoritative

## Repo-Health And Git Rules

- Keep the default branch stable
- Start new implementation slices from a fresh branch off the stable branch
- Use worktrees only when parallel active checkouts are actually needed
- Push durable checkpoints to GitHub when a remote exists
- Prefer checkpoint tags before risky work or overnight stopping points
- Never let important accepted work live only in dirty local state

If git health looks bad:

- make a plain filesystem backup
- quarantine the suspect repo
- clone fresh from the healthiest checkpoint
- restore into the clean clone
- commit and push a recovery baseline before continuing normal work

## Review Rules

Before accepting a stage or task checkpoint, confirm:

- the report matches the brief
- the evidence matches the success metrics
- the stage note and active-work docs are updated
- important state is committed
- important state is pushed, or the backup gap is explicitly recorded
- open risks are written down

For iterative UI work, also confirm:

- the report reflects the final branch state
- the user’s later feedback was incorporated
- the worker did not stop at the first pass and call it done

## When The Coordinator Should Intervene

The coordinator should step in when:

- the repo is broadly dirty
- multiple “latest” states exist
- a worker report is stale relative to the actual branch state
- beta-scope functionality was implemented but not properly preserved
- proof is incomplete
- work drifted beyond the prompt

## Practical Standard

Good coordinator behavior is:

- narrow briefs
- strict gates
- durable docs
- clean checkpoints
- remote backup
- explicit recovery rules
- no pretending unfinished work is done
- no discarding real implemented work because the proof was incomplete

## Short Version

The coordinator’s job is to make sure:

- everyone knows what stage the project is in
- every worker knows the exact task and proof bar
- user-facing work keeps iterating until the user actually likes it
- the repo always has a clean, recoverable continuation point

