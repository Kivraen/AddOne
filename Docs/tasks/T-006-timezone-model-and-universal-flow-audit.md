---
id: T-006
title: Timezone model and universal flow audit
subsystem: cross-platform
priority: medium
owner: Hubble
depends_on: []
owned_paths:
  - app/
  - firmware/
  - Docs/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md
---

# T-006 Timezone Model And Universal Flow Audit

## Objective

Audit how timezone works across onboarding, settings, recovery, backend sync, and firmware behavior.

## Why Now

Timezone decisions affect onboarding, settings UX, and on-device correctness.

## In Scope

- model audit
- cross-layer flow audit

## Out Of Scope

- final implementation

## Required Changes

- durable report and issue-log updates

## Verification Required

- code-backed audit evidence

## Success Definition

- the accepted timezone product model is explicit enough to guide implementation

## Open Risks

- universal timezone support was confirmed to be firmware-blocked in the current implementation
