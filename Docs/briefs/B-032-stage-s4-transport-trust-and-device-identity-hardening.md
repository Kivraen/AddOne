Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from `main`:
`codex/s4-transport-trust-and-device-identity`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the first launch-blocking security foundation slice.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-035-transport-trust-and-device-identity-hardening.md`
- `Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md`
- `Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Backend_Model.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Implement the first launch-blocking hardening slice:
- validated HTTPS in firmware
- validated MQTT in firmware
- per-device broker credentials
- broker ACLs
- removal of runtime self-reregistration assumptions

Success metrics:
- firmware no longer relies on insecure TLS in the shipped path
- MQTT device credentials are per-device, not fleet-shared
- broker topic access is constrained by ACLs
- runtime self-reregistration assumptions are removed or explicitly replaced by a secure mechanism
- scoped transport and environment docs match the new trust model

Required proof:
- exact files changed
- firmware build proof
- service/runtime proof for the new transport path
- explicit proof that insecure TLS is no longer the normal shipped path
- explicit note of any rollout/migration requirement that must be handled before wider deployment

Non-negotiables:
- keep the slice narrow to transport trust and device identity
- do not widen into OTA implementation yet
- do not widen into unrelated UI work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is infrastructure-sensitive work; if the user or testing reveals a trust-model flaw, update the final report to reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
