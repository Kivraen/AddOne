import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import ts from "typescript";

async function loadProjectionModule() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-runtime-projection-"));

  async function transpileIntoTemp(sourcePath, outputFile, replacements = []) {
    let source = await readFile(sourcePath, "utf8");
    for (const [from, to] of replacements) {
      source = source.replaceAll(from, to);
    }

    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath,
    });

    const outputPath = path.join(tempDir, outputFile);
    await writeFile(outputPath, transpiled.outputText, "utf8");
    return outputPath;
  }

  await transpileIntoTemp(path.resolve("types/addone.ts"), "types-addone.mjs");
  await transpileIntoTemp(path.resolve("constants/palettes.ts"), "palettes.mjs", [["@/types/addone", "./types-addone.mjs"]]);
  const runtimeProjectionPath = await transpileIntoTemp(
    path.resolve("lib/runtime-board-projection.ts"),
    "runtime-board-projection.mjs",
    [["@/types/addone", "./types-addone.mjs"]],
  );
  const boardPath = await transpileIntoTemp(path.resolve("lib/board.ts"), "board.mjs", [
    ["@/constants/palettes", "./palettes.mjs"],
    ["@/lib/runtime-board-projection", "./runtime-board-projection.mjs"],
    ["@/types/addone", "./types-addone.mjs"],
  ]);

  const module = await import(pathToFileURL(runtimeProjectionPath).href);
  const boardModule = await import(pathToFileURL(boardPath).href);
  return {
    cleanup: async () => rm(tempDir, { force: true, recursive: true }),
    module: { ...module, ...boardModule },
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

test("projects week targets forward with fallback for a new current week", () => {
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: 5,
    now: new Date("2026-03-16T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-03-09",
      todayRow: 6,
      weekTargets: [3, 2, ...Array.from({ length: 19 }, () => 4)],
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.deepEqual(projection.weekTargets?.slice(0, 4), [5, 3, 2, 4]);
});

test("falls back cleanly when snapshot week targets are missing", () => {
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: 4,
    now: new Date("2026-03-16T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-03-16",
      todayRow: 0,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(projection.weekTargets, null);
});

test("uses authoritative visible week targets when the snapshot is missing them", () => {
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: 1,
    now: new Date("2026-03-19T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-03-16",
      todayRow: 3,
    },
    timezone: "America/Los_Angeles",
    visibleWeekTargets: [1, 3, 4, ...Array.from({ length: 18 }, () => 5)],
    weekStart: "monday",
  });

  assert.deepEqual(projection.weekTargets?.slice(0, 4), [1, 3, 4, 5]);
});

test("prefers authoritative visible week targets over stale snapshot week targets for past weeks", () => {
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: 1,
    now: new Date("2026-03-19T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-03-16",
      todayRow: 3,
      weekTargets: Array.from({ length: 21 }, () => 1),
    },
    timezone: "America/Los_Angeles",
    visibleWeekTargets: [1, 3, 4, ...Array.from({ length: 18 }, () => 5)],
    weekStart: "monday",
  });

  assert.deepEqual(projection.weekTargets?.slice(0, 4), [1, 3, 4, 5]);
});

test("uses the live target for the current week even before a fresh snapshot lands", () => {
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: 5,
    now: new Date("2026-03-19T19:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-03-16",
      todayRow: 3,
      weekTargets: [3, ...Array.from({ length: 20 }, () => 2)],
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
  });

  assert.equal(projection.weekTargets?.[0], 5);
  assert.equal(projection.weekTargets?.[1], 2);
});

test("scores past weeks against per-week targets instead of the live target", () => {
  const days = emptyBoardDays();
  days[1][0] = true;
  days[1][1] = true;

  const cells = module.buildBoardCells({
    autoBrightness: true,
    boardId: "board-1",
    brightness: 80,
    dailyMinimum: "15 minutes",
    days,
    id: "device-1",
    isLive: true,
    isProjectedBeyondSnapshot: false,
    lastSnapshotAt: null,
    logicalToday: "2026-03-19",
    name: "Exercise",
    nextResetLabel: "Tonight",
    ownerName: "Viktor",
    paletteId: "classic",
    recordedDaysTotal: 2,
    recoveryState: "ready",
    resetTime: "00:00",
    rewardEnabled: false,
    rewardTrigger: "daily",
    rewardType: "clock",
    runtimeRevision: 1,
    successfulWeeksTotal: 0,
    syncState: "online",
    today: {
      dayIndex: 3,
      weekIndex: 0,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
    weekTargets: [5, 2, ...Array.from({ length: 19 }, () => 5)],
    weeklyTarget: 5,
    habitStartedOnLocal: null,
    historyEraStartedAt: null,
    customPalette: undefined,
    reminderEnabled: false,
    reminderTime: "09:00",
    firmwareVersion: "beta",
    accountRemovalDeadlineAt: null,
    accountRemovalMode: null,
    accountRemovalRequestedAt: null,
    accountRemovalState: "active",
    dateGrid: Array.from({ length: 21 }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => `2026-03-${String(19 - weekIndex * 7 - (3 - dayIndex)).padStart(2, "0")}`),
    ),
    lastSeenAt: null,
    lastSyncAt: null,
    needsSnapshotRefresh: false,
    weekTargets: [5, 2, ...Array.from({ length: 19 }, () => 5)],
  });

  assert.equal(cells[7][1], "weekSuccess");
});

test("uses the current visible week target in the home status label", () => {
  const days = emptyBoardDays();
  days[0][0] = true;
  days[0][1] = true;

  const label = module.targetStatusLabel({
    autoBrightness: true,
    boardId: "board-1",
    brightness: 80,
    dailyMinimum: "15 minutes",
    days,
    id: "device-1",
    isLive: true,
    isProjectedBeyondSnapshot: false,
    lastSnapshotAt: null,
    logicalToday: "2026-03-19",
    name: "Exercise",
    nextResetLabel: "Tonight",
    ownerName: "Viktor",
    paletteId: "classic",
    recordedDaysTotal: 2,
    recoveryState: "ready",
    resetTime: "00:00",
    rewardEnabled: false,
    rewardTrigger: "daily",
    rewardType: "clock",
    runtimeRevision: 1,
    successfulWeeksTotal: 0,
    syncState: "online",
    today: {
      dayIndex: 3,
      weekIndex: 0,
    },
    timezone: "America/Los_Angeles",
    weekStart: "monday",
    weekTargets: [5, ...Array.from({ length: 20 }, () => 3)],
    weeklyTarget: 3,
    habitStartedOnLocal: null,
    historyEraStartedAt: null,
    customPalette: undefined,
    reminderEnabled: false,
    reminderTime: "09:00",
    firmwareVersion: "beta",
    accountRemovalDeadlineAt: null,
    accountRemovalMode: null,
    accountRemovalRequestedAt: null,
    accountRemovalState: "active",
    dateGrid: undefined,
    lastSeenAt: null,
    lastSyncAt: null,
    needsSnapshotRefresh: false,
  });

  assert.equal(label, "2/5 this week");
});

process.on("exit", () => {
  void cleanup();
});
