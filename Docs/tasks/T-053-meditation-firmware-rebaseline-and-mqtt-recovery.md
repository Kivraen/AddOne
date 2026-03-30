---
id: T-053
title: Meditation firmware rebaseline and MQTT recovery
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-041
  - T-045
  - T-051
owned_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/agent-reports/2026-03-30-meditation-firmware-rebaseline-and-mqtt-recovery.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/agent-reports/2026-03-28-broker-password-sync-automation-and-reonboarding-retest.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-30-meditation-firmware-rebaseline-and-mqtt-recovery.md
---

## Objective
Recover `AO_A4F00F767008` (`Meditation`) from stale pre-OTA-capable firmware and stale persisted MQTT credentials so it can reach the accepted firmware baseline and healthy realtime transport again.

## Why Now
`Meditation` was left on `2.0.0-beta.1`, rejected OTA commands with `Unsupported command kind.`, and was failing MQTT auth with `state=5`. That did not block the release cohort once the device was excluded, but it remained an unhealthy beta board worth recovering.

## In Scope
- Narrow board recovery work for `AO_A4F00F767008`
- Wired reflash or OTA as needed
- Verification of firmware version, MQTT recovery, and live control
- Runbook updates to reflect the recovered board state

## Out Of Scope
- Broad firmware redesign
- General release-cohort policy changes
- App polish or onboarding work
- OTA architecture changes beyond what is needed to recover this one board

## Verification Required
- Exact files changed
- Exact commands run
- Proof of:
  - board identity
  - before firmware version
  - after firmware version
  - MQTT recovery
  - successful control path
  - final cohort disposition

## Success Definition
- `Meditation` is back on the accepted firmware baseline
- MQTT is healthy again
- The board is either restored to the cohort intentionally or explicitly kept outside it with that choice documented
