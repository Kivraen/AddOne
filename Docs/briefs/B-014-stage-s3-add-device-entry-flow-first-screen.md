# B-014: Stage S3 Add-Device Entry Flow First Screen

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
`codex/s3-add-device-flow`

Stable baseline:
`main` is the official stable branch. Do not work directly on `main`.

Branch context:
`codex/s3-add-device-flow` is the clean continuation branch for the current add-device/onboarding work. It already preserves the legitimate onboarding, recovery, and factory-reset-related changes from the recovery snapshot, but it deliberately excludes the duplicate `* 2` noise files from that snapshot.

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [git-operations.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/git-operations.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [T-008-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md)
- [T-017-add-device-entry-flow-first-screen.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-017-add-device-entry-flow-first-screen.md)
- [2026-03-19-s3-onboarding-and-wifi-recovery-polish.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-19-s3-onboarding-and-wifi-recovery-polish.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Refine the no-owned-device Home empty state into a clean add-device entry screen with a visible primary action and minimal copy.`

Specific user direction for this pass:
- The current button is black and not visible enough.
- It should feel closer to the main-screen on or off control.
- Add a glow behind the plus action so it reads clearly on the dark background.
- A subtle moving or breathing glow is allowed if it looks intentional and restrained.
- The line under the control should read: `Connect your AddOne`.

Success metrics:
- The empty Home state is visually obvious and feels like the start of the add-device flow.
- The primary action is centered, visible, and coherent with the rest of the app.
- Copy is minimal and no longer reads like a dense first-time setup explanation.
- Tapping the control still routes into the existing onboarding flow.

Required proof:
- Manual simulator proof of the screen
- at least one screenshot in the report
- `npm run typecheck`, or a precise note if the local duplicate `react 2` / `@types/react 2` install artifact still blocks it
- exact files changed

Non-negotiables:
- Use the `building-native-ui` skill.
- Keep this pass narrow. Do not broaden into later onboarding steps, recovery, Friends, Profile, or settings.
- Do not rewrite coordinator docs like project memory, the master plan, the stage register, or `Active_Work.md`.
- Do not delete or redesign the onboarding route. This pass only changes the entry screen into that flow.

Iteration rule:
- This task is user-facing and iterative by default.
- Do not assume the first implementation pass is the final accepted result.
- If the user gives follow-up feedback, keep iterating on the same branch until the user explicitly says the result is acceptable or explicitly asks for a checkpoint review.
- When you write the report, describe the final branch state after those iterations, including the user feedback that materially shaped the result.

Scope:
- In scope: `components/app/home-screen.tsx` and any narrowly related issue-log or copy update needed for this exact empty-state behavior.
- Out of scope: broader onboarding flow restructuring, backend work, firmware work, and cleanup of unrelated repo noise.

Documentation requirement:
- Treat [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md) as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in [T-017-add-device-entry-flow-first-screen.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-017-add-device-entry-flow-first-screen.md).
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, or the master plan directly.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
