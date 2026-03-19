# B-002: Stage S3 UI Audit And Scope Lock

Required skill:
- `building-native-ui` in `.agents/skills/building-native-ui/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Read first:
- [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md)
- [project-memory.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/project-memory.md)
- [agent-coordination.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-coordination.md)
- [stage-register.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-register.md)
- [stage-03-trusted-beta-surface-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/stages/stage-03-trusted-beta-surface-alignment.md)
- [ui-beta-issue-log.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/ui-beta-issue-log.md)
- [T-005-beta-ui-audit-and-scope-lock.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/tasks/T-005-beta-ui-audit-and-scope-lock.md)
- [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Make the current UI gaps and unresolved product decisions explicit enough that the next implementation work can be split safely.

Success metrics:
- The durable UI issue log is updated with the real visible gaps across main screen/settings, onboarding, Wi-Fi recovery, profile, and friends.
- The friends and profile decision space is narrowed clearly instead of staying vague.
- The next implementation batches are named and ordered.

Required proof:
- Updated durable docs with code-grounded issue notes.
- File references showing the current placeholder or minimal surfaces.
- A clear recommendation for which implementation task should go next.

Non-negotiables:
- Use the `building-native-ui` skill while evaluating UI work.
- Do not invent a broad social architecture during this audit.
- Do not silently skip contradictions; write them down explicitly.
- Treat the stage note as the acceptance gate for this work.

Scope:
- In scope:
  - current visible UI gaps
  - onboarding and Wi-Fi recovery polish notes
  - profile identity decision space
  - friends beta shape and connection-model decision space
- Out of scope:
  - full implementation of all these surfaces in one pass
  - infra validation
  - release hardening

Documentation requirement:
- Update only the stage note, issue log, and tightly related coordination docs needed to make the UI stage explicit.
- Do not update project memory or the stage register unless the coordinator explicitly asks.

Required report format:
1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`
