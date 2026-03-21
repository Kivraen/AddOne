# Project Dashboard

Internal coordination dashboard for AddOne.

This tool is:
- read-only
- docs-driven
- separate from the product app

It renders the repo coordination state from:
- `Docs/AddOne_Main_Plan.md`
- `Docs/Active_Work.md`
- `Docs/tasks/*.md`
- `Docs/agent-reports/*.md`

Before dev/build, the workspace generates `src/generated/dashboard-data.js` from those docs. That file is a build artifact, not a second source of truth.

## Views
- Overview
- Active Work
- Task Detail
- Reports

## Local Commands
- `npm run dev`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Notes
- The dashboard does not create or edit tasks.
- The coordinator updates the source-of-truth docs.
- Workers implement scoped tasks and write reports only.
