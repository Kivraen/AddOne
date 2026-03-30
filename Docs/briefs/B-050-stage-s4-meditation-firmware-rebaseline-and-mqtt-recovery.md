Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the hosted-beta reliability baseline:
`codex/s4-meditation-firmware-rebaseline`

Stable baseline:
Base this work on `codex/s4-mqtt-broker-sync-automation`, because that branch contains the accepted broker credential-sync automation and current hosted-beta state. Do not work directly on `main`.

Mode:
This is a narrow recovery task. Keep it focused on recovering `AO_A4F00F767008` to the accepted firmware and MQTT baseline.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-053-meditation-firmware-rebaseline-and-mqtt-recovery.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/agent-reports/2026-03-28-broker-password-sync-automation-and-reonboarding-retest.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Recover `AO_A4F00F767008` (`Meditation`) from stale pre-OTA-capable firmware plus stale persisted MQTT creds so it reaches the accepted firmware baseline and healthy control path again.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
