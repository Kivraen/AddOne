export type SyncState = "online" | "syncing" | "offline" | "queued";
export type RewardType = "clock" | "paint";
export type RewardTrigger = "daily" | "weekly";
export type PixelGridMode = "display" | "edit" | "preview" | "shared";
export type PixelCellState = "future" | "socket" | "done" | "weekSuccess" | "weekFail" | "todayFocus";
export type WeekStart = "locale" | "monday" | "sunday";

export interface BoardPalette {
  id: string;
  name: string;
  dayOn: string;
  weekSuccess: string;
  weekFail: string;
  socket: string;
  socketEdge: string;
  rewardPrimary: string;
  rewardSecondary: string;
}

export interface TodayPointer {
  weekIndex: number;
  dayIndex: number;
}

export interface AddOneDevice {
  id: string;
  name: string;
  ownerName: string;
  syncState: SyncState;
  weeklyTarget: number;
  weekStart: WeekStart;
  timezone: string;
  resetTime: string;
  nextResetLabel: string;
  paletteId: string;
  customPalette?: Partial<BoardPalette>;
  rewardEnabled: boolean;
  rewardType: RewardType;
  rewardTrigger: RewardTrigger;
  brightness: number;
  autoBrightness: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  firmwareVersion: string;
  wifiName: string;
  sharedViewers: number;
  queueCount: number;
  days: boolean[][];
  today: TodayPointer;
  lastSyncedLabel: string;
}

export interface SharedBoard {
  id: string;
  ownerName: string;
  habitName: string;
  syncState: SyncState;
  weeklyTarget: number;
  paletteId: string;
  days: boolean[][];
  today: TodayPointer;
}

export interface HighlightTarget {
  row: number;
  col: number;
}
