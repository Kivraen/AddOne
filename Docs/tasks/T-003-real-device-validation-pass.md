---
id: T-003
title: Real-device validation pass
stage_id: S2
stage_name: Trusted Real-Device Validation
subsystem: firmware
priority: high
owner: Unassigned
depends_on:
  - T-002
owned_paths:
  - firmware
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-firmware-real-device-validation-pass.md
---

## Objective
Run the locked real-device validation matrix and record what is truly trusted versus only implemented.

## Why Now
The firmware, runtime snapshot flow, and beta stack all exist, but they are not trustworthy until they are exercised on the actual device under realistic network conditions.

## In Scope
- Validate onboarding on real hardware and real routers.
- Validate today toggle from device and app.
- Validate history `Draft + Save`.
- Validate settings `Draft + Apply`.
- Validate Wi-Fi recovery.
- Validate reconnect healing, snapshot sync, and fallback behavior.

## Out of Scope
- New product feature work
- Broad refactors before validation evidence exists
- Production-only release hardening

## Required Changes
- Execute the validation matrix against the hosted beta baseline.
- Record pass/fail results with evidence, not memory.
- If blockers appear, isolate them into follow-up tasks instead of broadening this validation task into unbounded implementation work.

## Verification Required
- Real hardware validation evidence for each scenario:
  - onboarding
  - app toggle latency
  - local button reliability
  - history save
  - settings apply
  - Wi-Fi recovery
  - offline to reconnect healing
  - realtime versus fallback behavior

## Success Definition
- The team can clearly distinguish trusted behavior from merely implemented behavior.
- Any failure leaves behind a crisp follow-up task and evidence.
- The validation report can drive `T-004` without guesswork.

## Open Risks
- Router-specific failures may require multiple validation rounds.
- Infra drift during testing can make app or firmware behavior look worse than it really is.
