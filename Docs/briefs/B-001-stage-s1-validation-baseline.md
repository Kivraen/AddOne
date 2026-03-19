# B-001: Stage S1 Validation Baseline

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-01-validation-baseline-ready.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-01-validation-baseline-ready.md)
- [T-002-hosted-beta-bring-up.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-002-hosted-beta-bring-up.md)
- [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [AddOne_Beta_Hosting_Recommendation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Hosting_Recommendation.md)
- [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)

Stage:
`S1: Validation Baseline Ready`

Goal:
Make the hosted beta path coherent enough that `S2` real-device validation can start without infra ambiguity.

Success metrics:
- One current hosted beta path is documented consistently across the app, gateway, firmware beta config, env examples, and beta docs.
- The repo clearly distinguishes what is verified, what is assumed, and what is externally blocked.
- Another engineer can follow the hosted beta baseline without guessing.

Required proof:
- Command evidence for a gateway build or startup smoke check.
- A config and doc audit covering app, gateway, firmware beta settings, and realtime publication assumptions.
- An explicit list of unresolved secrets, access requirements, or external blockers.
- Updated repo docs or examples where the current wording is stale or contradictory.

Non-negotiables:
- Treat current beta reality as truth rather than designing a future production shape.
- Keep scope to hosted beta baseline, config audit, and operator readiness for validation.
- Do not work on sharing UI, release hardening, or broad app redesign in this brief.
- If proof depends on external access you do not have, mark the result `blocked` and name the exact missing dependency.

Scope:
- In scope:
  - `Docs/AddOne_Beta_Environment.md`
  - `Docs/AddOne_Beta_Hosting_Recommendation.md`
  - `services/realtime-gateway/`
  - `deploy/beta-vps/`
  - `app.config.js`
  - `eas.json`
  - beta env examples
- Out of scope:
  - `Friends` tab implementation
  - real-device validation execution
  - release hardening

Documentation requirement:
- Treat [stage-01-validation-baseline-ready.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-01-validation-baseline-ready.md) as the acceptance gate for this work.
- Update only the scoped infra and beta docs or config files needed for this brief.
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.
- Return a short report. The coordinator will review it and update the stage state.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
