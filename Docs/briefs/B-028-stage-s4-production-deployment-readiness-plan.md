Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Planning branch:
Create a fresh branch from `main`:
`codex/s4-production-readiness-plan`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Mode:
This is a planning and audit task. Do not jump into broad implementation. Map the real current release path, security posture, and update posture first.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-028-beta-security-and-production-readiness-audit.md`
- `Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `Docs/tasks/T-034-production-deployment-readiness-plan.md`
- `Docs/AddOne_Beta_Environment.md`
- `Docs/AddOne_Beta_Hosting_Recommendation.md`
- `Docs/AddOne_Device_Realtime_Transport.md`
- `app.config.js`
- `eas.json`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Produce one publish-readiness plan that covers deployment, security, and update strategy before any more UI polish or feature work.

What the user wants from this planning pass:
- understand the real current release path for app, backend, gateway, broker, and firmware
- identify the security gaps that matter before wider release
- identify how app updates and firmware updates should work
- decide whether user-facing update controls or status surfaces are required before release
- produce a concrete implementation order for getting AddOne ready to publish

Success metrics:
- current release path is described with exact code/doc references
- current security posture is described with explicit gaps
- current update posture is described with explicit gaps
- publish blockers are separated from later improvements
- next implementation slices are concrete and scoped

Required proof:
- exact references to current deployment/update/security behavior
- clear publish blockers
- recommended implementation order
- final report that reflects the actual agreed planning state

Non-negotiables:
- planning and audit only
- do not widen into unrelated feature work
- do not rewrite coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`
- stay grounded in the real repo, config, firmware, and service code

Iteration rule:
- this task is collaborative and iterative by default
- research first, explain clearly, then refine the plan with the user
- if you produce a report, it must reflect the final agreed planning state

Required report format:
1. `Stage`
2. `Status`
3. `Current deployment path`
4. `Current security posture`
5. `Current update posture`
6. `Publish blockers`
7. `Recommended implementation order`
