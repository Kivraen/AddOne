# Agent Report Format

Use one dated markdown file per finished task under `Docs/agent-reports/`.

Recommended YAML frontmatter:

- `task_id`
- `title`
- `date`
- `agent`
- `result_state`
- `verification_state`
- `changed_paths`

Allowed `result_state` values:

- `Implemented`
- `Blocked`
- `Partial`
- `No Change`

Allowed `verification_state` values:

- `Not Verified`
- `Partially Verified`
- `Verified`

Required body sections:

1. `Summary`
2. `Source docs used`
3. `Files changed`
4. `Verification`
5. `Decisions / assumptions`
6. `Open questions or blockers`
7. `Recommended next handoff`
