---
id: T-051
title: Broker password-sync automation and re-onboarding retest
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-045
owned_paths:
  - deploy/beta-vps
  - Docs/AddOne_Beta_Environment.md
  - firmware/src/habit_tracker.cpp
  - firmware/src/habit_tracker.h
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-28-broker-password-sync-automation-and-reonboarding-retest.md
---

## Objective
Remove the manual VPS Mosquitto password-refresh step from normal operation by automating broker password sync from the Supabase credential source of truth, then prove that a cross-account re-onboarding flow still reconnects to MQTT and returns to fast control.

## Why Now
The March 28 re-onboarding investigation showed a real release blocker: fresh device MQTT credentials were issued correctly in Supabase, but the hosted broker password file did not refresh automatically, forcing a manual `sync-passwords.sh` recovery step and causing boards to fall back to slow HTTP polling after claim/reset.

## In Scope
- Automatic broker password sync on credential-source changes
- Hosted beta compose and deployment wiring for that automation
- Narrow firmware safeguard work only where needed to avoid false command conflicts during transport interruption
- Full different-account re-onboarding retest on the same board after the automation lands
- Scoped runbook updates

## Out Of Scope
- Broad app polish
- OTA changes
- Store submission work
- General broker hardening beyond what is directly required for this regression

## Required Changes
- The hosted broker password file must refresh automatically from `list_active_device_mqtt_credentials()`
- Mosquitto must restart automatically when that credential set changes
- A reclaimed device must reconnect to MQTT without a manual VPS recovery step

## Verification Required
- Exact files changed
- Exact automation path implemented
- Exact commands run
- Live proof of:
  - credential change detection
  - automatic broker refresh/install
  - successful MQTT reconnect after re-onboarding
  - successful post-re-onboarding control from the app

## Success Definition
- Manual VPS password refresh is no longer part of normal beta operations
- Cross-account re-onboarding returns to MQTT automatically
- The regression is reduced to at most one explicit residual ops cleanup item
