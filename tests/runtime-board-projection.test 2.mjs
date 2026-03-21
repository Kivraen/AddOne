import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import ts from "typescript";

async function loadProjectionModule() {
  const sourcePath = path.resolve("lib/runtime-board-projection.ts");
  const source = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-runtime-projection-"));
  const modulePath = path.join(tempDir, "runtime-board-projection.mjs");
  await writeFile(modulePath, transpiled.outputText, "utf8");

  const module = await import(pathToFileURL(modulePath).href);
  return {
    cleanup: async () => rm(tempDir, { force: true, recursive: true }),
    module,
  };
}

function emptyBoardDays() {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false));
}

function findProjectedState(projection, localDate) {
  for (let weekIndex = 0; weekIndex < projection.dateGrid.length; weekIndex += 1) {
    const dayIndex = projection.dateGrid[weekIndex].indexOf(localDate);
    if (dayIndex >= 0) {
      return projection.days[weekIndex][dayIndex];
    }
  }

  return undefined;
}

const { cleanup, module } = await loadProjectionModule();
const { buildRuntimeBoardProjection, formatWeekdayFromLocalDate } = module;

test("projects stale snapshot into the new logical day after reset", () => {
  const boardDays = emptyBoardDays();
  boardDays[0][1] = true;

  const projection = buildRuntimeBoardProjection({
    now: new Date("2026-03-18T07:15:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays,
      currentWeekStart: "2026-03-16",
      todayRow: 1,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(projection.logicalToday, "2026-03-18");
  assert.equal(projection.today.dayIndex, 2);
  assert.equal(projection.isProjectedBeyondSnapshot, true);
  assert.equal(findProjectedState(projection, "2026-03-17"), true);
  assert.equal(findProjectedState(projection, "2026-03-18"), false);
});

test("respects custom reset time before the daily boundary", () => {
  const projection = buildRuntimeBoardProjection({
    now: new Date("2026-03-18T08:30:00.000Z"),
    resetTime: "02:30:00",
    snapshot: null,
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(projection.logicalToday, "2026-03-17");
  assert.equal(projection.today.dayIndex, 1);
  assert.equal(projection.isProjectedBeyondSnapshot, false);
});

test("preserves recorded history across a three-week offline gap", () => {
  const boardDays = emptyBoardDays();
  boardDays[0][2] = true;

  const projection = buildRuntimeBoardProjection({
    now: new Date("2026-03-16T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays,
      currentWeekStart: "2026-02-23",
      todayRow: 2,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(projection.currentWeekStart, "2026-03-16");
  assert.equal(findProjectedState(projection, "2026-02-25"), true);
  assert.equal(findProjectedState(projection, "2026-03-16"), false);
});

test("drops history that falls outside the visible 21-week window", () => {
  const boardDays = emptyBoardDays();
  boardDays[20][0] = true;

  const projection = buildRuntimeBoardProjection({
    now: new Date("2026-09-30T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays,
      currentWeekStart: "2026-03-16",
      todayRow: 0,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(findProjectedState(projection, "2025-10-27"), undefined);
  assert.equal(projection.days.flat().some(Boolean), false);
});

test("formats weekdays from logical local dates without depending on phone timezone", () => {
  assert.equal(formatWeekdayFromLocalDate("2026-03-18"), "Wednesday");
});

process.on("exit", () => {
  void cleanup();
});
