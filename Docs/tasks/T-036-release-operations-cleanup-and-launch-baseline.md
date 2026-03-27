---
id: T-036
title: Release operations cleanup and launch baseline
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-035
owned_paths:
  - deploy/beta-vps
  - services/realtime-gateway
  - firmware/include
  - firmware/README.md
  - firmware/releases
  - supabase
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Backend_Model.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-035-transport-trust-and-device-identity-hardening.md
  - Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md
  - Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-implementation.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md
---

## Objective
Turn the accepted `T-035` transport hardening into a repeatable hosted launch baseline by applying the new trust model to the real beta stack and documenting the exact operator steps needed to keep that environment healthy.

## Why Now
`T-035` made the code path secure by default, but the hosted environment still depends on operator work: the migration has to be applied, CA material has to exist in ignored firmware headers, and the broker password file has to be rendered and installed from the new credential source. OTA and broader rollout are unsafe until that baseline is actually operational.

## In Scope
- Apply and verify the hosted Supabase migration that backs per-device MQTT credentials
- Define and prove the exact CA-material and broker-password rollout steps for the beta stack
- Remove or isolate any stale bootstrap assumptions that would bypass the hardened trust path
- Update operator-facing environment and deployment docs so the release baseline is explicit and repeatable
- Prove the hardened hosted path works for at least one real device validation loop

## Out Of Scope
- Broad OTA implementation
- Broader release tooling or admin-console work beyond what is strictly required to operate the hardened baseline
- General UI work

## Required Changes
- Hosted beta backend must contain the `device_mqtt_credentials` model and issuance path from `T-035`
- Firmware environment instructions must clearly require real CA PEM material for the shipped beta path
- Broker deployment docs must include the password render/install or reload flow from the new credential source
- The beta stack docs must clearly distinguish bootstrap-only behavior from the intended launch baseline

## Verification Required
- Proof that the hosted migration is applied
- Proof that broker password generation and installation is runnable from the documented operator flow
- Proof that the hardened hosted path works for a real device reconnect or command path
- Scoped doc updates for the beta environment and transport runbook

## Success Definition
- Another engineer can bring up or repair the hardened beta stack without chat memory
- The hardened trust model is no longer only code-complete; it is operationally complete enough for launch validation
- The next slice can move to OTA safety from a known-good hosted baseline
