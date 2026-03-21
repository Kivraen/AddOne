---
id: T-002
title: Hosted beta bring-up
stage_id: S1
stage_name: Validation Baseline Ready
subsystem: infra
priority: high
owner: Unassigned
depends_on: []
owned_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - services/realtime-gateway
  - deploy/beta-vps
  - app.config.js
  - eas.json
  - .env.beta.example
  - services/realtime-gateway/.env.beta.example
  - firmware/include/cloud_config.beta.example.h
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-infra-hosted-beta-bring-up.md
---

## Objective
Make the hosted beta stack coherent, documented, and ready for the real-device validation pass.

## Why Now
Real-device validation is blocked until the hosted app, gateway, broker, and firmware beta profile are aligned well enough to remove laptop dependency.

## In Scope
- Audit and align beta app, gateway, broker, and firmware configuration.
- Confirm the intended hosted beta path and the fallback VPS path are documented consistently.
- Validate the required runtime prerequisites for hosted beta:
  - gateway health
  - broker connectivity assumptions
  - `device_runtime_snapshots` realtime publication
  - beta app identity and env values

## Out of Scope
- Production launch cutover
- New production-only hardening beyond what beta validation needs
- Expanding the product feature surface

## Required Changes
- Reconcile mismatches across beta environment docs and env examples.
- Confirm the current hosted `AddOne` Supabase project assumptions wherever beta docs reference a dedicated project.
- Tighten the bring-up checklist so another agent can run it step by step.
- Record any missing secrets, external setup, or operator-owned prerequisites clearly.

## Verification Required
- Gateway build or startup smoke test
- Config audit for app, gateway, and firmware beta settings
- Manual confirmation that the docs describe one coherent hosted beta path

## Success Definition
- Another engineer can follow the documented hosted beta path without guessing.
- The repo clearly distinguishes current beta reality from future production shape.
- `T-003` can proceed without infra ambiguity being the blocker.

## Open Risks
- Some beta verification still depends on external broker and Supabase access outside the repo.
- Current hosted beta may still share infrastructure with development in ways that should be unwound later.
