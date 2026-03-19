# Stage S3 Timezone Capability And Picker Brief

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Required skill(s):
- `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`
- `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Ship a beta-safe timezone flow so the device defaults from the phone, can be changed later, supports the US baseline plus Warsaw and Kyiv, and does not pretend unsupported device timezones already work.`

Success metrics:
- Device timezone remains the canonical scheduling/reset timezone.
- Onboarding, routine settings, and recovery all use one coherent picker-based timezone flow.
- The beta clearly supports the US baseline plus `Europe/Warsaw` and `Europe/Kyiv`.
- Unsupported but valid IANA zones are handled honestly and explicitly.

Required proof:
- Typecheck proof.
- Manual proof for onboarding, settings, and recovery timezone flows.
- Proof that at least one supported US timezone, `Europe/Warsaw`, and `Europe/Kyiv` work end to end.
- A durable report written to `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`.

Non-negotiables:
- Do not merge viewer/display timezone into the device timezone setting.
- Do not keep raw timezone text as the primary beta UX.
- Do not imply universal on-device support if firmware still has a narrower supported set.
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, `Docs/AddOne_Main_Plan.md`, or `Docs/Active_Work.md` directly.

Scope:
- In scope: timezone capability model, picker/search UX, supported-zone baseline, onboarding/settings/recovery integration, and the minimum firmware support needed to honor the beta zone list.
- Out of scope: viewer/display timezone feature, unrelated UI polish, and a broad worldwide timezone guarantee if that requires a larger follow-up slice.

Documentation requirement:
- Treat `Docs/stages/stage-03-trusted-beta-surface-alignment.md` as the coordinator acceptance gate for this work.
- Update only the scoped implementation and product docs named in `Docs/tasks/T-011-beta-timezone-capability-and-picker-baseline.md`.
- Write the report to `Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md`.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
