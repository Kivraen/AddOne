# B-013: Stage S3 Onboarding And Wi-Fi Recovery Polish

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-onboarding-recovery-polish`

Stable baseline:
`main` is the official stable branch and already includes the recovered latest UI baseline plus a working TestFlight install.
Do not work directly on `main`.

Branch context:
`codex/s3-onboarding-recovery-polish` is branched from the current beta candidate branch, so the in-progress Friends implementation is already preserved here. Do not reopen Friends scope in this task unless you hit a concrete onboarding or recovery dependency.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md)
- [2026-03-19-s3-beta-ui-polish-and-recovery-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-s3-beta-ui-polish-and-recovery-alignment.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Turn onboarding into a calm, clear, beta-ready guided flow, and close only the recovery follow-ups that directly affect onboarding continuity.`

Success metrics:
- Onboarding pacing, copy, and hierarchy feel intentional instead of state-dense.
- The user can complete onboarding without unclear transitions, confusing errors, or avoidable hesitation.
- Any touched recovery behavior stays aligned with the Wi‑Fi-only, explicit-cancel model already locked in S3.

Required proof:
- `npm run typecheck`
- manual simulator or device proof for the full onboarding path after the changes
- manual proof for any touched recovery behavior
- exact files changed
- updated [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md) if you lock a durable onboarding rule or uncover a blocker

Non-negotiables:
- Use the `building-native-ui` skill.
- Work one issue at a time inside the onboarding surface; do not broaden this into friends, profile, or general settings cleanup.
- Reuse the accepted timezone model and current habit-identity model; do not invent parallel onboarding rules.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.

Scope:
- In scope: onboarding UX polish, onboarding validation and error states, onboarding copy and hierarchy, and tightly related Wi‑Fi recovery follow-ups.
- Out of scope: friends, profile modeling, broad backend changes, firmware changes, and Expo package audit or alignment.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md).
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
