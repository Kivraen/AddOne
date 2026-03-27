Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the accepted OTA control-plane baseline:
`codex/s4-firmware-ota-client`

Stable baseline:
Base this work on `codex/s4-firmware-ota-control-plane`, because `T-040` depends on the accepted `T-039` backend OTA control plane that is not yet merged to `main`. Do not work directly on `main`.

Mode:
This is an implementation task. Keep it narrow to the firmware OTA client and the on-device OTA flow.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-040-firmware-ota-client-and-device-flow.md`
- `Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md`
- `Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md`
- `Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md`
- `Docs/AddOne_Device_Cloud_Contract.md`
- `Docs/AddOne_Firmware_V2_Architecture.md`
- `Docs/AddOne_Beta_Environment.md`
- `firmware/OTA_SAFETY_CONTRACT.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Implement the device-side OTA client so firmware can discover, authorize, stage, boot, confirm, and roll back an application-image update using the accepted `T-038` and `T-039` contracts.

Success metrics:
- the firmware can query release eligibility through the accepted HTTPS contract
- the firmware can stage an application-image OTA into the inactive slot
- OTA progress and terminal failures are reported through the accepted backend sink
- boot confirmation and rollback behavior follow the frozen `T-038` safety rules
- the next app update or operator slice can build on a real firmware OTA path instead of a planning contract

Required proof:
- exact files changed
- firmware build proof
- exact firmware and contract references for the OTA client path
- explicit note of which OTA flow steps were exercised on real hardware and which were not
- explicit note of what the next slice can now assume

Non-negotiables:
- keep the slice narrow to the firmware OTA client and on-device flow
- do not widen into broad app update UI yet
- do not widen into operator release tooling yet
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Iteration rule:
- this is release-critical work; if the real device path changes the expected client contract, the final report must reflect the actual final branch state

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
