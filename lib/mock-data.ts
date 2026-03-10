import { AddOneDevice } from "@/types/addone";

function fillWeeks(rows: number[][]): boolean[][] {
  return [...rows].reverse().map((week) => week.map(Boolean));
}

export const initialDevices: AddOneDevice[] = [
  {
    id: "studio-01",
    isLive: true,
    lastSnapshotAt: new Date(Date.now() - 60_000).toISOString(),
    name: "Studio Walk",
    ownerName: "Viktor",
    runtimeRevision: 42,
    syncState: "online",
    weeklyTarget: 5,
    weekStart: "monday",
    timezone: "America/Los_Angeles",
    resetTime: "00:00",
    nextResetLabel: "Resets at midnight",
    paletteId: "classic",
    rewardEnabled: false,
    rewardType: "paint",
    rewardTrigger: "daily",
    brightness: 78,
    autoBrightness: true,
    reminderEnabled: true,
    reminderTime: "19:30",
    firmwareVersion: "v2.preview.1",
    today: {
      weekIndex: 0,
      dayIndex: 4,
    },
    days: fillWeeks([
      [1, 1, 0, 1, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 0],
      [1, 1, 1, 0, 1, 0, 1],
      [1, 1, 0, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 0, 1, 1],
      [1, 0, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 0, 1, 0],
      [1, 1, 1, 0, 1, 1, 0],
      [1, 0, 1, 1, 1, 0, 0],
    ]),
  },
];
