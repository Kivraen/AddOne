---
id: T-002
title: Hosted beta bring-up
subsystem: infra
priority: high
owner: Unassigned
depends_on: []
owned_paths:
  - deploy/beta-vps/
  - services/realtime-gateway/
  - Docs/AddOne_Beta_Environment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-hosted-beta-bring-up.md
---

# T-002 Hosted Beta Bring-Up

## Objective

Bring the hosted beta stack online cleanly enough to remove laptop dependency from normal app and device testing.

## Why Now

This is the next non-UI validation stage after the visible beta surface is explicit enough.

## In Scope

- gateway and broker bring-up
- env validation
- app config validation

## Out Of Scope

- broad UI work

## Required Changes

- beta infra configs
- deployment notes

## Verification Required

- end-to-end runtime publication and command flow proof

## Success Definition

- hosted beta path is stable enough to support real-device validation

## Open Risks

- infra churn should wait until `S3` is explicit enough to avoid cross-stage rework
