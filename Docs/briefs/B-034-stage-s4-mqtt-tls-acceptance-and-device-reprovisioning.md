Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Continue from the `T-036` checkpoint branch:
`codex/s4-release-operations-baseline`

Stable baseline:
Base this work on `codex/s4-release-operations-baseline` at the current checkpoint, because `T-037` is a narrow follow-up to the hosted rollout work already completed there. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the remaining hosted MQTT blocker and second-device reprovisioning.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-037-mqtt-tls-acceptance-and-device-reprovisioning.md`
- `Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `firmware/README.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Resolve the remaining hosted MQTT blocker:
- fix the ESP32 broker TLS acceptance failure on the hardened device
- confirm the broker no longer logs `ssl/tls alert bad certificate`
- reflash or reprovision `AO_A4F00F767008` onto the per-device MQTT credential model

Success metrics:
- a hardened device reconnects to the hosted broker over TLS on its issued username
- the broker no longer emits the current bad-certificate alert for that device
- both current beta boards are off the legacy fleet credential path
- the resulting hosted baseline is clean enough to return to `T-036` acceptance

Required proof:
- exact files changed
- serial proof of successful MQTT reconnect on the hardened device
- broker log proof for the fixed handshake
- proof that `AO_A4F00F767008` is no longer using the legacy fleet credential
- explicit note of any operator prerequisite that still remains after the fix

Non-negotiables:
- keep the slice narrow to MQTT TLS acceptance and board reprovisioning
- do not widen into OTA implementation yet
- do not widen into unrelated UI or feature work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is infra-sensitive work on a live beta stack; if the root cause changes during testing, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
