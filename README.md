# AddOne

AddOne is a device-first habit tracker built as:
- an Expo app
- ESP32 firmware
- a Supabase backend
- an MQTT-based realtime delivery path

## Current Phase
- validation and beta hardening
- current active stage: `S3: Beta UI Completion And Social Shape`
- the core app, firmware, schema, onboarding, recovery, and realtime path exist in this repo
- the main remaining work is UI completion, onboarding/recovery polish, profile and friends shape lock, beta bring-up, and real-device validation

## Repo Map
- `app/`, `components/`, `hooks/`, `lib/`, `providers/`, `store/`: Expo app
- `firmware/`: AddOne firmware v2
- `services/realtime-gateway/`: Supabase <-> MQTT bridge
- `services/realtime-broker/`: local MQTT broker for development
- `supabase/`: schema and migrations
- `deploy/beta-vps/`: optional self-hosted beta stack
- `Docs/`: product, contract, runtime, and operations docs
- `AddOne-Experiments/`: separate experiments / prototypes, not the main shipping app

## Start Here
- [Master plan](Docs/AddOne_Main_Plan.md)
- [Project memory](Docs/project-memory.md)
- [Git operations](Docs/git-operations.md)
- [Stage register](Docs/stages/stage-register.md)
- [Agent coordination](Docs/agent-coordination.md)
- [Active work](Docs/Active_Work.md)
- [Canonical product spec](Docs/AddOne_V1_Canonical_Spec.md)
- [Beta environment](Docs/AddOne_Beta_Environment.md)
- [Runtime rebuild](Docs/AddOne_Runtime_Consistency_Rebuild.md)
- [Cloud contract](Docs/AddOne_Device_Cloud_Contract.md)
- [Project dashboard](tools/project-dashboard)

## Working Rules
- Treat `Docs/AddOne_V1_Canonical_Spec.md` as product truth.
- Treat `Docs/AddOne_Main_Plan.md` as execution truth.
- Treat `Docs/stages/stage-register.md` as the live stage gate.
- Treat `Docs/git-operations.md` as the durable git and GitHub reliability guide.
- Keep one active stage at a time unless the user explicitly opens a parallel track.
- Treat `.claude/worktrees/**` as duplicate worktree snapshots, not current source-of-truth docs.
