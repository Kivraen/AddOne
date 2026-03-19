# Task Briefs

Each task brief in this folder is coordinator-owned and decision-complete.

File naming:
- `T-###-<slug>.md`

Required frontmatter:
- `id`
- `title`
- `subsystem`
- `priority`
- `owner`
- `depends_on`
- `owned_paths`
- `source_docs`
- `success_gate`
- `report_path`

Recommended frontmatter for staged work:
- `stage_id`
- `stage_name`
- `required_skills`

Required sections:
- `Objective`
- `Why Now`
- `In Scope`
- `Out of Scope`
- `Required Changes`
- `Verification Required`
- `Success Definition`
- `Open Risks`

Rules:
- The task brief is the worker-facing source of truth for that task.
- Workers do not rewrite the brief as they implement.
- If the brief is wrong or incomplete, the coordinator updates it before reassignment.
