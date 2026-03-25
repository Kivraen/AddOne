import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import ts from "typescript";

async function loadFriendsStateModule() {
  const sourcePath = path.resolve("lib/friends-state.ts");
  const source = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "addone-friends-state-"));
  const modulePath = path.join(tempDir, "friends-state.mjs");
  await writeFile(modulePath, transpiled.outputText, "utf8");

  const module = await import(pathToFileURL(modulePath).href);
  return {
    cleanup: async () => rm(tempDir, { force: true, recursive: true }),
    module,
  };
}

function emptyBoardDays(fill = false) {
  return Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => fill));
}

const { cleanup, module } = await loadFriendsStateModule();
const {
  reconcileViewerSharedBoards,
  removePendingRequestFromOwnerSharing,
  removeViewerBoardByMembershipId,
  removeViewerFromOwnerSharing,
  shouldHoldFriendsEmptyState,
} = module;

test("removePendingRequestFromOwnerSharing removes only the targeted request", () => {
  const state = {
    code: "ABC123",
    pendingRequests: [{ id: "request-1" }, { id: "request-2" }],
    viewers: [{ membershipId: "viewer-1" }],
  };

  const nextState = removePendingRequestFromOwnerSharing(state, "request-1");

  assert.deepEqual(nextState.pendingRequests, [{ id: "request-2" }]);
  assert.equal(nextState.code, "ABC123");
  assert.deepEqual(nextState.viewers, [{ membershipId: "viewer-1" }]);
});

test("removeViewerFromOwnerSharing removes only the targeted viewer", () => {
  const state = {
    code: "ABC123",
    pendingRequests: [{ id: "request-1" }],
    viewers: [{ membershipId: "viewer-1" }, { membershipId: "viewer-2" }],
  };

  const nextState = removeViewerFromOwnerSharing(state, "viewer-2");

  assert.deepEqual(nextState.viewers, [{ membershipId: "viewer-1" }]);
  assert.deepEqual(nextState.pendingRequests, [{ id: "request-1" }]);
});

test("removeViewerBoardByMembershipId removes only the targeted shared board", () => {
  const boards = [
    {
      id: "board-1",
      ownerName: "Owner One",
      viewerMembershipId: "membership-1",
    },
    {
      id: "board-2",
      ownerName: "Owner Two",
      viewerMembershipId: "membership-2",
    },
  ];

  const nextBoards = removeViewerBoardByMembershipId(boards, "membership-1");

  assert.deepEqual(nextBoards, [
    {
      id: "board-2",
      ownerName: "Owner Two",
      viewerMembershipId: "membership-2",
    },
  ]);
});

test("reconcileViewerSharedBoards preserves prior owner name and snapshot when the fresh fetch degrades", () => {
  const previousBoards = [
    {
      id: "board-1",
      ownerName: "Viktor Pavlov",
      viewerMembershipId: "membership-1",
      lastSnapshotAt: "2026-03-24T18:00:00.000Z",
      days: emptyBoardDays(true),
      dateGrid: [["2026-03-24"]],
      logicalToday: "2026-03-24",
      today: { dayIndex: 1, weekIndex: 2 },
    },
  ];
  const nextBoards = [
    {
      id: "board-1",
      ownerName: "AddOne User",
      viewerMembershipId: "membership-1",
      lastSnapshotAt: null,
      days: emptyBoardDays(false),
      dateGrid: undefined,
      logicalToday: "2026-03-25",
      today: { dayIndex: 2, weekIndex: 2 },
    },
  ];

  const [board] = reconcileViewerSharedBoards(previousBoards, nextBoards);

  assert.equal(board.ownerName, "Viktor Pavlov");
  assert.equal(board.lastSnapshotAt, "2026-03-24T18:00:00.000Z");
  assert.equal(board.days[0][0], true);
  assert.deepEqual(board.today, { dayIndex: 1, weekIndex: 2 });
});

test("shouldHoldFriendsEmptyState only holds the empty view before the first settled load", () => {
  assert.equal(
    shouldHoldFriendsEmptyState({
      hasLoadedOnce: false,
      isFetching: true,
      itemCount: 0,
    }),
    true,
  );

  assert.equal(
    shouldHoldFriendsEmptyState({
      hasLoadedOnce: true,
      isFetching: true,
      itemCount: 0,
    }),
    false,
  );

  assert.equal(
    shouldHoldFriendsEmptyState({
      hasLoadedOnce: false,
      isFetching: true,
      itemCount: 2,
    }),
    false,
  );
});

process.on("exit", () => {
  void cleanup();
});
