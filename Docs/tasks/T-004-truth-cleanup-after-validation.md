---
id: T-004
title: Truth cleanup after validation
subsystem: docs
priority: medium
owner: Unassigned
depends_on:
  - T-001
  - T-002
  - T-003
owned_paths:
  - Docs/
  - lib/supabase/
  - supabase/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-truth-cleanup-after-validation.md
---

# T-004 Truth Cleanup After Validation

## Objective

Update canonical docs and contracts so implemented and validated behavior match.

## Why Now

This should happen after the implementation and validation results are known.

## In Scope

- doc and contract cleanup
- stale planning text removal

## Out Of Scope

- major new feature work

## Required Changes

- canonical spec
- plan docs
- contract docs

## Verification Required

- docs match accepted runtime and product behavior

## Success Definition

- future agents can trust the docs again without reconciling stale history

## Open Risks

- should not run before validation findings are stable
