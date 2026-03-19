import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadDashboardData } from "../src/lib/dashboard-loader.mjs";

async function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function makeRepoFixture(setup) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "addone-dashboard-"));
  await setup(root);
  return root;
}

function mainPlanContent() {
  return `# AddOne Main Plan

## Source Of Truth Map
- [Main plan](Docs/AddOne_Main_Plan.md)
- [Active work](Docs/Active_Work.md)

## Current Phase
- post-architecture
- pre-beta validation

## Main Plan
1. Lock beta scope.
2. Validate the hosted baseline.
`;
}

function activeWorkContent({ workstreams = "", tasks = "" } = {}) {
  return `# Active Work

## Workstream Trust

| Workstream | Trust | Summary | Owner | Notes |
| --- | --- | --- | --- | --- |
${workstreams}

## Task Registry

| Task ID | Title | Subsystem | Status | Owner | Depends On | Task Brief | Latest Report | Success Gate | Next Coordinator Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${tasks}
`;
}

function taskBrief({ id = "T-001", title = "Example task", dependsOn = "[]", reportPath = "Docs/agent-reports/example.md" } = {}) {
  return `---
id: ${id}
title: ${title}
subsystem: app
priority: high
owner: Unassigned
depends_on: ${dependsOn}
owned_paths:
  - app
source_docs:
  - Docs/AddOne_Main_Plan.md
success_gate: Strict gate
report_path: ${reportPath}
---

## Objective
Do the work.

## Why Now
We need a real brief.

## In Scope
- Build the thing.

## Out of Scope
- Everything else.

## Required Changes
- Update the app.

## Verification Required
- Run a smoke test.

## Success Definition
- It works.

## Open Risks
- Edge cases remain.
`;
}

function reportFile({ taskId = "T-001", date = "2026-03-16", verification = "Verified" } = {}) {
  return `---
task_id: ${taskId}
title: Finished task
date: ${date}
agent: Codex
result_state: Implemented
verification_state: ${verification}
changed_paths:
  - app/file.tsx
---

## Summary
Shipped the change.

## Source docs used
- Docs/AddOne_Main_Plan.md

## Files changed
- app/file.tsx

## Verification
- Ran a smoke test.

## Decisions / assumptions
- Keep it simple.

## Open questions or blockers
- None.

## Recommended next handoff
- Move to the next task.
`;
}

test("loader returns a valid empty model when no tasks exist", async () => {
  const repoRoot = await makeRepoFixture(async (root) => {
    await writeFile(root, "README.md", "# Repo\n");
    await writeFile(root, "Docs/AddOne_Main_Plan.md", mainPlanContent());
    await writeFile(root, "Docs/Active_Work.md", activeWorkContent());
  });

  const data = await loadDashboardData({ repoRoot });

  assert.equal(data.tasks.length, 0);
  assert.equal(data.reports.length, 0);
  assert.equal(data.activeTask, null);
  assert.equal(data.blockers.length, 0);
  assert.equal(data.mainPlan.currentPhase.length, 2);
  assert.equal(data.mainPlan.sourceOfTruthLinks.length, 2);
});

test("loader reads one task with no reports", async () => {
  const repoRoot = await makeRepoFixture(async (root) => {
    await writeFile(root, "README.md", "# Repo\n");
    await writeFile(root, "Docs/AddOne_Main_Plan.md", mainPlanContent());
    await writeFile(
      root,
      "Docs/Active_Work.md",
      activeWorkContent({
        workstreams: "| Coordination | Verified | In place. | Coordinator | Keep it aligned. |",
        tasks:
          "| T-001 | Example task | app | Brief Ready | Unassigned | — | [T-001](tasks/T-001-example.md) | — | Strict gate | Assign the worker. |",
      }),
    );
    await writeFile(root, "Docs/tasks/T-001-example.md", taskBrief());
  });

  const data = await loadDashboardData({ repoRoot });

  assert.equal(data.tasks.length, 1);
  assert.equal(data.tasks[0].id, "T-001");
  assert.equal(data.tasks[0].reports.length, 0);
  assert.equal(data.countsByStatus["Brief Ready"], 1);
  assert.equal(data.countsByTrust.Verified, 1);
  assert.match(data.tasks[0].brief.fileUrl, /^file:\/\//);
});

test("loader handles dependencies and selects the active task", async () => {
  const repoRoot = await makeRepoFixture(async (root) => {
    await writeFile(root, "README.md", "# Repo\n");
    await writeFile(root, "Docs/AddOne_Main_Plan.md", mainPlanContent());
    await writeFile(
      root,
      "Docs/Active_Work.md",
      activeWorkContent({
        workstreams: [
          "| Coordination | Verified | In place. | Coordinator | Keep it aligned. |",
          "| App | Implemented | Work underway. | App agent | Validate after landing. |",
        ].join("\n"),
        tasks: [
          "| T-001 | Example task | app | In Progress | Codex | — | [T-001](tasks/T-001-example.md) | [Report](agent-reports/2026-03-16-example.md) | Strict gate | Finish the task. |",
          "| T-002 | Follow-up | docs | Backlog | Unassigned | T-001 | [T-002](tasks/T-002-follow-up.md) | — | Strict gate | Wait for the first report. |",
        ].join("\n"),
      }),
    );
    await writeFile(root, "Docs/tasks/T-001-example.md", taskBrief());
    await writeFile(
      root,
      "Docs/tasks/T-002-follow-up.md",
      taskBrief({ id: "T-002", title: "Follow-up", dependsOn: "", reportPath: "Docs/agent-reports/follow-up.md" }),
    );
    await writeFile(root, "Docs/agent-reports/2026-03-16-example.md", reportFile());
  });

  const data = await loadDashboardData({ repoRoot });

  assert.equal(data.tasks.length, 2);
  assert.equal(data.activeTask?.id, "T-001");
  assert.deepEqual(data.tasks[1].dependsOn, ["T-001"]);
  assert.equal(data.latestReports.length, 1);
});

test("loader surfaces malformed docs and missing linked reports as warnings", async () => {
  const repoRoot = await makeRepoFixture(async (root) => {
    await writeFile(root, "README.md", "# Repo\n");
    await writeFile(root, "Docs/AddOne_Main_Plan.md", mainPlanContent());
    await writeFile(
      root,
      "Docs/Active_Work.md",
      activeWorkContent({
        workstreams: "| Coordination | Trusted | Healthy. | Coordinator | Stable. |",
        tasks:
          "| T-003 | Broken task | app | Verified | Codex | — | [T-003](tasks/T-003-broken.md) | [Report](agent-reports/missing.md) | Strict gate | Reconcile the brief. |",
      }),
    );
    await writeFile(
      root,
      "Docs/tasks/T-003-broken.md",
      `---
id: T-003
title: Broken task
subsystem: app
---

## Objective
Broken.
`,
    );
  });

  const data = await loadDashboardData({ repoRoot });

  assert.ok(data.warnings.some((warning) => warning.includes("missing frontmatter field `priority`")));
  assert.ok(data.warnings.some((warning) => warning.includes("missing section `Why Now`")));
  assert.ok(data.warnings.some((warning) => warning.includes("latest report link for `T-003` points to a missing file")));
});
