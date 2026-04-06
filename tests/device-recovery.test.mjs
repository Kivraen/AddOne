import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import ts from "typescript";

async function loadDeviceRecoveryModule() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-device-recovery-"));

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
  const deviceRecoveryPath = await transpileIntoTemp(path.resolve("lib/device-recovery.ts"), "device-recovery.mjs", [
    ["@/types/addone", "./types-addone.mjs"],
  ]);

  const deviceRecoveryModule = await import(pathToFileURL(deviceRecoveryPath).href);

  return {
    cleanup: async () => rm(tempDir, { force: true, recursive: true }),
    module: deviceRecoveryModule,
  };
}

function makeDevice(overrides = {}) {
  return {
    accountRemovalDeadlineAt: null,
    accountRemovalMode: null,
    accountRemovalRequestedAt: null,
    accountRemovalState: "active",
    autoBrightness: false,
    boardId: "board-1",
    brightness: 100,
    customPalette: undefined,
    dailyMinimum: "",
    dateGrid: [["2026-04-07"]],
    days: [[false]],
    firmwareVersion: "test",
    habitStartedOnLocal: "2026-04-07",
    historyEraStartedAt: "2026-04-07T00:00:00.000Z",
    id: "device-1",
    isLive: true,
    isProjectedBeyondSnapshot: false,
    lastSeenAt: "2026-04-07T12:00:00.000Z",
    lastSnapshotAt: "2026-04-07T12:00:00.000Z",
    lastSyncAt: "2026-04-07T12:00:00.000Z",
    logicalToday: "2026-04-07",
    name: "Current Habit",
    needsSnapshotRefresh: false,
    nextResetLabel: "Resets at midnight",
    ownerName: "Owner",
    paletteId: "classic",
    recordedDaysTotal: 4,
    recoveryState: "ready",
    reminderEnabled: false,
    reminderTime: "19:30",
    resetTime: "00:00",
    rewardEnabled: false,
    rewardTrigger: "daily",
    rewardType: "clock",
    runtimeRevision: 42,
    successfulWeeksTotal: 1,
    syncState: "online",
    timezone: "UTC",
    today: { dayIndex: 0, weekIndex: 0 },
    weekStart: "monday",
    weekTargets: [3],
    weeklyTarget: 3,
    ...overrides,
  };
}

const { cleanup, module } = await loadDeviceRecoveryModule();
const { preserveRecoveringDeviceDisplayState } = module;

test("preserves the last stable board view while a board is recovering", () => {
  const stableDevice = makeDevice({
    customPalette: { dayOn: "#ff0" },
    dailyMinimum: "Ten minutes",
    dateGrid: [["2026-03-31"]],
    days: [[true]],
    habitStartedOnLocal: "2026-03-31",
    logicalToday: "2026-03-31",
    name: "Previous Habit",
    paletteId: "sunrise",
    recordedDaysTotal: 12,
    successfulWeeksTotal: 2,
    today: { dayIndex: 1, weekIndex: 0 },
    weekTargets: [4],
    weeklyTarget: 4,
  });
  const recoveringDevice = makeDevice({
    customPalette: undefined,
    dailyMinimum: "",
    dateGrid: [["2026-04-07"]],
    days: [[false]],
    habitStartedOnLocal: "2026-04-07",
    logicalToday: "2026-04-07",
    name: "New Habit",
    recordedDaysTotal: 0,
    recoveryState: "recovering",
    successfulWeeksTotal: 0,
    syncState: "syncing",
    weekTargets: [1],
    weeklyTarget: 1,
  });

  const reconciled = preserveRecoveringDeviceDisplayState(recoveringDevice, stableDevice);

  assert.equal(reconciled.recoveryState, "recovering");
  assert.equal(reconciled.syncState, "syncing");
  assert.equal(reconciled.name, "Previous Habit");
  assert.equal(reconciled.recordedDaysTotal, 12);
  assert.deepEqual(reconciled.days, [[true]]);
  assert.deepEqual(reconciled.weekTargets, [4]);
  assert.equal(reconciled.weeklyTarget, 4);
  assert.equal(reconciled.dailyMinimum, "Ten minutes");
});

test("leaves ready devices unchanged", () => {
  const stableDevice = makeDevice({
    name: "Previous Habit",
  });
  const readyDevice = makeDevice({
    name: "Current Habit",
    recoveryState: "ready",
  });

  const reconciled = preserveRecoveringDeviceDisplayState(readyDevice, stableDevice);

  assert.equal(reconciled.name, "Current Habit");
  assert.equal(reconciled.recoveryState, "ready");
});

test.after(async () => {
  await cleanup();
});
