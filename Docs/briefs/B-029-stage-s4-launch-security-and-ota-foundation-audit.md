# B-029: Stage S4 Launch Security And OTA Foundation Audit

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
`codex/s4-production-readiness-plan`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning, audit, and research task. Do not jump into implementation. The user wants to prepare AddOne for the real customer launch path and use the current repo to identify what must be fixed before that is safe.

Launch-program context:
- Internally this still belongs to `S4: Beta Hardening And Durable Release Memory`.
- In plain language, treat this as the first launch-readiness agent for:
  - security review
  - OTA/update readiness
  - release-path trust boundaries
- Do not spend time on stage mechanics in the report. Focus on launch reality.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-04-beta-hardening-and-durable-release-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md)
- [T-028-beta-security-and-production-readiness-audit.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-028-beta-security-and-production-readiness-audit.md)
- [T-029-app-and-firmware-update-strategy.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-029-app-and-firmware-update-strategy.md)
- [T-034-production-deployment-readiness-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-034-production-deployment-readiness-plan.md)
- [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [AddOne_Beta_Hosting_Recommendation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Hosting_Recommendation.md)
- [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
- [AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
- [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json)
- [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)
- [services/realtime-gateway/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/README.md)
- [services/realtime-gateway/src/index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/realtime-gateway/src/index.mjs)
- [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp)
- [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp)
- [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json)
- [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md)

Goal:
Produce the first launch-grade security and OTA foundation audit for AddOne so the team can stop assuming the release path is safe and instead work from an explicit trust model, blocker list, and implementation sequence.

What the user wants from this planning pass:
- understand how AddOne is actually released and updated today
- understand how AddOne should eventually work for real customers:
  - app distributed through App Store / Play Store
  - app shows app version and firmware version
  - devices receive remote firmware updates instead of USB/manual flashing
- identify security gaps across app, backend, gateway, broker, firmware, factory tooling, and release flow
- treat OTA and security as one connected program, not separate checklists
- separate true launch blockers from later improvements
- produce the next concrete slices so implementation can start in the right order

Required audit scope:
- mobile app release path
- mobile auth and redirect posture
- Supabase auth, RLS, RPC, and secret boundaries
- realtime gateway trust boundaries
- MQTT broker auth, namespace, and delivery assumptions
- firmware identity, transport, and cloud trust
- factory station and firmware release artifact flow
- app-update model and firmware-update model
- minimum user-facing version/update status surfaces required before launch

Success metrics:
- the current release path is described with exact code and doc references
- the current security posture is described with explicit findings and severity
- the current update posture is described clearly:
  - what exists today
  - what does not exist yet
  - what should be required before launch
- launch blockers are separated from later improvements
- the next implementation slices are concrete, narrow, and ordered correctly

Required proof:
- exact references to current deployment, update, and security behavior
- explicit trust-boundary map across app, backend, gateway, broker, firmware, and factory tooling
- clear list of launch blockers
- recommended implementation order
- explicit statement of what should be required before wider beta vs customer launch

Non-negotiables:
- This is not an implementation task yet.
- Do not widen into unrelated feature work or UI polish.
- Do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`.
- Stay grounded in the real repo, current config, current firmware, and current service code.
- Distinguish carefully between:
  - current repo facts
  - reasonable inference from repo facts
  - best-practice recommendations from external sources
- If you use external references, use primary or official sources only and keep them secondary to the repo audit.
- Do not claim “secure” in a vague sense; define what is trusted, what is enforced, and what is still weak.

Key framing rules:
- Treat the current app update path and firmware update path as separate systems.
- Do not assume that because the product should eventually support automatic updates, the repo already supports them.
- Call out where the current system is still “lab/beta/factory” rather than “customer launch.”
- Bias toward launch realism:
  - staged rollout
  - rollback
  - artifact integrity
  - device identity
  - transport trust
  - operator trust boundaries

Iteration rule:
- This task is collaborative and iterative by default.
- Research first, explain clearly, then refine the plan with the coordinator.
- Do not treat your first answer as final if the coordinator is still tightening the launch model.
- If you produce a report, it must reflect the final agreed planning state.

Report path:
`Docs/agent-reports/2026-03-26-launch-security-and-ota-foundation-audit.md`

Required report format:
1. `Stage`
2. `Status`
3. `Current release and deployment path`
4. `Trust boundaries`
5. `Current security posture`
6. `Current update and OTA posture`
7. `Launch blockers`
8. `Recommended implementation order`
9. `Open risks / assumptions`
