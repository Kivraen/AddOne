import assert from "node:assert/strict";
import test from "node:test";

import { parseFriendCelebrationReadyEvent } from "../services/realtime-gateway/src/friend-celebration.mjs";

test("parseFriendCelebrationReadyEvent normalizes a valid celebration payload", () => {
  const payload = JSON.stringify({
    board_days: Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false)),
    current_week_start: "2026-03-23",
    device_auth_token: "device-token",
    emitted_at: "2026-03-24T18:30:00Z",
    palette_custom: {
      dayOn: "#ffffff",
    },
    palette_preset: "amber",
    source_local_date: "2026-03-24",
    today_row: 1,
    weekly_target: 4,
  });

  assert.deepEqual(parseFriendCelebrationReadyEvent(payload), {
    boardDays: Array.from({ length: 21 }, () => Array.from({ length: 7 }, () => false)),
    currentWeekStart: "2026-03-23",
    deviceAuthToken: "device-token",
    emittedAt: "2026-03-24T18:30:00Z",
    paletteCustom: {
      dayOn: "#ffffff",
    },
    palettePreset: "amber",
    sourceLocalDate: "2026-03-24",
    todayRow: 1,
    weeklyTarget: 4,
  });
});

test("parseFriendCelebrationReadyEvent rejects malformed or incomplete celebration payloads", () => {
  assert.equal(
    parseFriendCelebrationReadyEvent(
      JSON.stringify({
        board_days: [],
        current_week_start: "2026-03-23",
        device_auth_token: "device-token",
        source_local_date: "2026-03-24",
        today_row: 8,
        weekly_target: 4,
      }),
    ),
    null,
  );

  assert.equal(
    parseFriendCelebrationReadyEvent(
      JSON.stringify({
        current_week_start: "2026-03-23",
        device_auth_token: "device-token",
        source_local_date: "2026-03-24",
        today_row: 1,
        weekly_target: 4,
      }),
    ),
    null,
  );
});
