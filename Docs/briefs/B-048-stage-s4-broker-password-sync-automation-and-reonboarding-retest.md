Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Create a fresh branch from the release-candidate remediation baseline:
`codex/s4-mqtt-broker-sync-automation`

Stable baseline:
Base this work on the accepted blocker-remediation state around `T-045`, because this is a release-blocker fix for the hosted beta stack rather than a new product feature. Do not work directly on `main`.

Mode:
This is a narrow release-blocker fix. Keep it focused on permanent broker credential-sync automation and the full re-onboarding retest.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `Docs/tasks/T-051-broker-password-sync-automation-and-reonboarding-retest.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Implement the permanent broker credential-sync automation so cross-account re-onboarding no longer requires a manual VPS password refresh, then rerun the full different-account onboarding/control test and prove MQTT reconnect works automatically.

Success metrics:
- broker credential changes automatically refresh the hosted broker password/install state without manual VPS intervention
- a full different-account re-onboarding retest on the same board passes
- after claim/re-onboarding, the board reconnects to MQTT automatically
- Home toggles complete without the earlier polling-only regression

Required proof:
- exact files changed
- exact automation path implemented
- exact commands run
- live proof of:
  - credential issuance/revocation event
  - automatic broker refresh/install
  - successful MQTT reconnect after re-onboarding
  - successful post-re-onboarding control from the app
- explicit note of any remaining manual step, if one still exists

Non-negotiables:
- keep scope narrow to broker-sync automation and the re-onboarding retest
- do not widen into general app polish
- do not widen into OTA work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
