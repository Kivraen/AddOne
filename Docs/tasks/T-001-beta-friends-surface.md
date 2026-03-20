---
id: T-001
title: Beta Friends surface and social floor
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-009
owned_paths:
  - app/
  - components/
  - hooks/
  - lib/
  - supabase/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-beta-friends-surface.md
---

# T-001 Beta Friends Surface

## Objective

Implement the first-beta Friends surface as profile-gated code sharing plus live read-only board browsing.

## Why Now

The beta Friends direction is now locked, and this is the central remaining visible beta workstream after profile gating.

## In Scope

- entry gate based on completed social profile
- show and rotate share code
- request another board by code
- approve or reject requests
- browse approved boards and live progress read-only

## Out Of Scope

- discovery by username
- reactions, comments, feed, messaging
- challenge groups

## Required Changes

- app Friends UI
- backend request/approval plumbing if gaps exist
- durable spec/docs alignment for shipped behavior

## Verification Required

- manual proof of linking, approval, revocation, and board browsing
- repo-wide typecheck

## Success Definition

- a beta user can deliberately link to another person's board and browse it live in a read-only way

## Open Risks

- may need a narrow follow-up on refresh or realtime invalidation after first implementation
