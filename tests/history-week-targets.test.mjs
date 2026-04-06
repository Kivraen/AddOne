import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import ts from "typescript";

async function loadHistoryWeekTargetModule() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-history-week-targets-"));

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
  await transpileIntoTemp(path.resolve("lib/device-history-view.ts"), "device-history-view.mjs", [
    ["@/lib/board", "./board.mjs"],
    ["@/lib/runtime-board-projection", "./runtime-board-projection.mjs"],
    ["@/types/addone", "./types-addone.mjs"],
  ]);
  const historyWeekTargetsPath = await transpileIntoTemp(
    path.resolve("lib/history-week-targets.ts"),
    "history-week-targets.mjs",
    [
      ["@/lib/board", "./board.mjs"],
      ["@/lib/device-history-view", "./device-history-view.mjs"],
      ["@/types/addone", "./types-addone.mjs"],
    ],
  );

  const runtimeProjectionModule = await import(pathToFileURL(runtimeProjectionPath).href);
  const historyWeekTargetsModule = await import(pathToFileURL(historyWeekTargetsPath).href);

  return {
    cleanup: async () => rm(tempDir, { force: true, recursive: true }),
    module: { ...runtimeProjectionModule, ...historyWeekTargetsModule },
  };
}

function emptyBoardDays() {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false));
}

function makeDevice(buildRuntimeBoardProjection, options = {}) {
  const weeklyTarget = options.weeklyTarget ?? 3;
  const weekTargets = options.weekTargets ?? Array.from({ length: 21 }, () => weeklyTarget);
  const projection = buildRuntimeBoardProjection({
    now: new Date(options.now ?? "2026-04-08T12:00:00.000Z"),
    resetTime: "00:00:00",
    snapshot: {
      boardDays: emptyBoardDays(),
      currentWeekStart: "2026-04-06",
      todayRow: 2,
      weekTargets,
    },
    timezone: "UTC",
    visibleWeekTargets: weekTargets,
    weekStart: "monday",
    fallbackWeeklyTarget: weeklyTarget,
  });

  return {
    accountRemovalState: "active",
    autoBrightness: false,
    boardId: "board-1",
    brightness: 100,
    customPalette: undefined,
    dailyMinimum: "",
    dateGrid: projection.dateGrid,
    days: projection.days,
    firmwareVersion: "test",
    habitStartedOnLocal: options.habitStartedOnLocal ?? "2026-04-08",
    historyEraStartedAt: "2026-04-01T00:00:00.000Z",
    id: "device-1",
    isLive: true,
    isProjectedBeyondSnapshot: projection.isProjectedBeyondSnapshot,
    lastSeenAt: "2026-04-08T12:00:00.000Z",
    lastSnapshotAt: "2026-04-08T12:00:00.000Z",
    lastSyncAt: "2026-04-08T12:00:00.000Z",
    logicalToday: projection.logicalToday,
    name: "Test Device",
    needsSnapshotRefresh: projection.needsSnapshotRefresh,
    nextResetLabel: "Tonight",
    ownerName: "Owner",
    paletteId: "classic",
    recordedDaysTotal: 0,
    recoveryState: "ready",
    reminderEnabled: false,
    reminderTime: "19:30",
    resetTime: "00:00",
    rewardEnabled: false,
    rewardTrigger: "daily",
    rewardType: "clock",
    runtimeRevision: 10,
    successfulWeeksTotal: 0,
    syncState: "online",
    timezone: "UTC",
    today: projection.today,
    weekStart: "monday",
    weekTargets,
    weeklyTarget,
  };
}

const { cleanup, module } = await loadHistoryWeekTargetModule();
const {
  applyBackdatedHabitStartTarget,
  buildRuntimeBoardProjection,
  finalizeHistoryDraftWeekTargetsForSave,
} = module;

test("first backdate preserves the current week target while assigning newly added older weeks", () => {
  const device = makeDevice(buildRuntimeBoardProjection, {
    habitStartedOnLocal: "2026-04-08",
    weekTargets: Array.from({ length: 21 }, () => 3),
    weeklyTarget: 3,
  });

  const updated = applyBackdatedHabitStartTarget(device, "2026-03-24", 1);

  assert.equal(updated.weekTargets[0], 3);
  assert.equal(updated.weekTargets[1], 1);
  assert.equal(updated.weekTargets[2], 1);
  assert.equal(updated.weekTargets[3], 3);
});

test("repeated backdate updates only newly added weeks and keeps already visible weeks unchanged", () => {
  const device = makeDevice(buildRuntimeBoardProjection, {
    habitStartedOnLocal: "2026-03-24",
    weekTargets: [3, 1, 1, ...Array.from({ length: 18 }, () => 3)],
    weeklyTarget: 3,
  });

  const updated = applyBackdatedHabitStartTarget(device, "2026-03-17", 2);

  assert.equal(updated.weekTargets[0], 3);
  assert.equal(updated.weekTargets[1], 1);
  assert.equal(updated.weekTargets[2], 1);
  assert.equal(updated.weekTargets[3], 2);
  assert.equal(updated.weekTargets[4], 3);
});

test("save finalization preserves the original current week target even if the draft week zero drifted", () => {
  const baseDevice = makeDevice(buildRuntimeBoardProjection, {
    habitStartedOnLocal: "2026-04-08",
    weekTargets: Array.from({ length: 21 }, () => 3),
    weeklyTarget: 3,
  });

  const nextWeekTargets = finalizeHistoryDraftWeekTargetsForSave(
    baseDevice,
    [1, 1, 1, ...Array.from({ length: 18 }, () => 3)],
  );

  assert.equal(nextWeekTargets[0], 3);
  assert.equal(nextWeekTargets[1], 1);
  assert.equal(nextWeekTargets[2], 1);
});

test.after(async () => {
  await cleanup();
});
