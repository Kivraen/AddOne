---
id: T-014
title: Repo typecheck noise cleanup
subsystem: repo
priority: medium
owner: Codex
depends_on:
  - T-005
owned_paths:
  - tsconfig.json
  - app/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-repo-typecheck-noise-cleanup.md
---

# T-014 Repo Typecheck Noise Cleanup

## Objective

Restore meaningful repo-wide typecheck signal for the active UI stage.

## Why Now

Accepted UI work could not be trusted while duplicate route files and backup trees polluted `typecheck`.

## In Scope

- duplicate `* 2.tsx` cleanup
- backup-tree exclusion
- typecheck signal restoration

## Out Of Scope

- feature work

## Required Changes

- cleanup of stale duplicate files and config excludes

## Verification Required

- repo-wide `npm run typecheck` exits cleanly

## Success Definition

- later UI verification can rely on repo-wide typecheck again

## Open Risks

- local backup trees should remain out of the repo root whenever practical
