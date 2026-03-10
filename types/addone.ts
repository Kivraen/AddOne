export type SyncState = "online" | "syncing" | "offline";
export type RewardType = "clock" | "paint";
export type RewardTrigger = "daily" | "weekly";
export type PixelGridMode = "display" | "edit" | "preview" | "shared";
export type PixelCellState = "future" | "socket" | "done" | "weekSuccess" | "weekFail";
export type WeekStart = "locale" | "monday" | "sunday";
export type DeviceOnboardingStatus = "awaiting_ap" | "awaiting_cloud" | "claimed" | "expired" | "cancelled" | "failed";
export type DeviceApProvisioningState = "ready" | "busy" | "provisioned";
export type DeviceApProvisioningNextStep = "connect_to_cloud" | "retry";

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
  isLive: boolean;
  lastSnapshotAt: string | null;
  runtimeRevision: number;
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
  sharedViewers: number;
  days: boolean[][];
  dateGrid?: string[][];
  today: TodayPointer;
}

export interface SharedBoard {
  id: string;
  ownerName: string;
  habitName: string;
  syncState: SyncState;
  lastSnapshotAt?: string | null;
  weeklyTarget: number;
  paletteId: string;
  days: boolean[][];
  dateGrid?: string[][];
  today: TodayPointer;
}

export interface DeviceViewer {
  approvedAt: string | null;
  avatarUrl?: string | null;
  displayName: string;
  membershipId: string;
  userId: string;
}

export interface DeviceShareRequest {
  createdAt: string;
  id: string;
  requesterAvatarUrl?: string | null;
  requesterDisplayName: string;
  requesterUserId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
}

export interface DeviceSharingState {
  code: string | null;
  pendingRequests: DeviceShareRequest[];
  viewers: DeviceViewer[];
}

export interface HighlightTarget {
  row: number;
  col: number;
}

export interface DeviceOnboardingSession {
  id: string;
  claimToken?: string | null;
  claimTokenPrefix: string;
  claimedAt: string | null;
  createdAt: string;
  deviceId: string | null;
  expiresAt: string;
  hardwareProfileHint: string | null;
  isExpired: boolean;
  lastError: string | null;
  status: DeviceOnboardingStatus;
  waitingForDeviceAt: string | null;
}

export interface ApProvisioningDraft {
  wifiPassword: string;
  wifiSsid: string;
}

export interface ApProvisioningPayload {
  schema_version: 1;
  claim_token: string;
  hardware_profile_hint: string | null;
  onboarding_session_id: string;
  wifi_password: string;
  wifi_ssid: string;
}

export interface ApProvisioningRequest {
  endpoint: string;
  method: "POST";
  payload: ApProvisioningPayload;
}

export interface ApProvisioningValidationResult {
  errors: {
    claimToken?: string;
    onboardingSessionId?: string;
    wifiPassword?: string;
    wifiSsid?: string;
  };
  isValid: boolean;
}

export interface DeviceApProvisioningInfo {
  device_ap_ssid: string;
  firmware_version: string | null;
  hardware_profile: string | null;
  provisioning_state: DeviceApProvisioningState;
  schema_version: 1;
}

export interface DeviceApProvisioningResponse {
  accepted: boolean;
  message?: string | null;
  next_step: DeviceApProvisioningNextStep;
  reboot_required: boolean;
  schema_version: 1;
}

export interface HistoryDraftUpdate {
  isDone: boolean;
  localDate: string;
}

export interface DeviceSettingsPatch {
  ambient_auto?: boolean;
  brightness?: number;
  day_reset_time?: string;
  name?: string;
  palette_preset?: string;
  reward_enabled?: boolean;
  reward_trigger?: RewardTrigger;
  reward_type?: RewardType;
  timezone?: string;
  weekly_target?: number;
}
