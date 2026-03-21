# Stage S3 Timezone Audit Brief

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
- `Docs/tasks/T-006-timezone-model-and-universal-flow-audit.md`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
`Lock the timezone model enough that onboarding, settings, recovery, and device behavior can support a deliberate beta policy instead of an accidental Los Angeles-first default.`

Success metrics:
- The current timezone flow is traced across phone defaulting, app forms, backend persistence, realtime sync, and firmware application.
- The report clearly separates device timezone behavior from any future viewer/display timezone behavior.
- The report recommends a beta-ready selection and editing model that can work for users outside the currently hard-coded firmware zones.
- The report identifies whether universal timezone support is immediately implementable or blocked by firmware capability.

Required proof:
- Exact code references across app, backend, runtime projection, and firmware.
- Explicit supported/unsupported timezone reality in firmware today.
- A durable report written to `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`.
- Clear recommendation for:
  - canonical timezone storage
  - phone-default behavior
  - manual override behavior
  - selector/list UX
  - unsupported-zone fallback

Non-negotiables:
- Do not collapse device timezone and viewer/display timezone into one ambiguous setting.
- Do not promise universal support if the current firmware cannot honor it.
- Do not silently invent product rules; bound contradictions and name blockers explicitly.
- Do not update `Docs/project-memory.md`, `Docs/stages/stage-register.md`, `Docs/AddOne_Main_Plan.md`, or `Docs/Active_Work.md` directly.

Scope:
- In scope: timezone behavior across onboarding, routine settings, recovery, runtime projection, backend sync, and firmware application; beta-ready recommendation and implementation split.
- Out of scope: full implementation of the timezone picker, broad non-timezone UI polish, unrelated backend redesign, and release hardening.

Documentation requirement:
- Treat `Docs/stages/stage-03-trusted-beta-surface-alignment.md` as the coordinator acceptance gate for this work.
- Update only the scoped implementation or product docs named in `Docs/tasks/T-006-timezone-model-and-universal-flow-audit.md`.
- Write the audit report to `Docs/agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md`.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
