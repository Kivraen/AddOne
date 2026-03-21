---
id: T-009
title: Profile identity model and account surface
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-015
owned_paths:
  - app/(modals)/
  - components/
  - hooks/
  - lib/supabase/
  - supabase/migrations/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-profile-identity-and-account-surface.md
---

# T-009 Profile Identity Model And Account Surface

## Objective

Implement the social-facing profile layer that first-beta Friends depends on.

## Why Now

Friends is now explicitly profile-gated, and the current profile surface is still effectively email-only.

## In Scope

- display name
- unique username
- account surface updates that expose and validate the social profile
- backend or repository support needed for uniqueness and retrieval

## Out Of Scope

- username search and discovery
- Friends implementation itself
- comments, messaging, or activity feed

## Required Changes

- app account UI
- schema or repository support for unique usernames
- durable docs when the profile model is locked in code

## Verification Required

- manual proof of creating or editing the social profile
- uniqueness validation proof
- repo-wide typecheck

## Success Definition

- a beta user can complete a social profile with display name plus unique username, and Friends can reliably depend on it

## Open Risks

- uniqueness rules may require migration and repository updates
