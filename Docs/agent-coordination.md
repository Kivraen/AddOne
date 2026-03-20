# AddOne Agent Coordination

Last locked: March 19, 2026

## Coordinator-Owned Docs

The coordinator owns:

- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/Active_Work.md`
- `Docs/stages/stage-register.md`
- active stage notes under `Docs/stages/`
- `Docs/git-operations.md`

Execution agents should not rewrite those files unless the coordinator explicitly asks.

## Default Delivery Model

- Keep one active stage at a time unless the user explicitly opens a parallel track.
- Inside a stage, prefer one narrow implementation brief at a time.
- If a scoped parallel track exists, record it in `Docs/Active_Work.md`.
- No stage advancement without explicit coordinator review and acceptance.

## UI Rule

- All UI work must use `.agents/skills/building-native-ui/SKILL.md`.
- The resident UI workflow is allowed for `S3`, but each issue should still be handled as a narrow scoped slice with a short report.

## Agent Brief Contract

Every execution brief should include:

- repo path
- stage name
- stage goal
- exact success metrics
- required proof
- non-negotiables
- docs to read first
- required report path or report pattern

## Agent Report Contract

Every agent report should include:

1. `Stage`
2. `Status`
3. `Changes made`
4. `Commands run`
5. `Evidence`
6. `Open risks / blockers`
7. `Recommendation`

## Review Outcomes

Allowed coordinator outcomes:

- `accepted`
- `revise and retry`
- `blocked`

## Git Hygiene Rules

- Accepted implementation work must become a real git checkpoint, not only a report.
- Before a new brief, worktree, merge, or repo rename, check repo health and working-tree cleanliness.
- If Git integrity is suspect, stop normal coordination and follow `Docs/git-operations.md`.
