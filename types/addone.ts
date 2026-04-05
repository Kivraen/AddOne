export type SyncState = "online" | "syncing" | "offline";
export type DeviceHistoryFreshnessState = "fully_settled" | "mirror_pending" | "projected_stale";
export type RewardType = "clock" | "paint";
export type RewardTrigger = "daily" | "weekly";
export type PixelGridMode = "display" | "edit" | "preview" | "shared";
export type PixelCellState = "future" | "socket" | "done" | "weekSuccess" | "weekFail";
export type WeekStart = "locale" | "monday" | "sunday";
export type DeviceRecoveryState = "ready" | "needs_recovery" | "recovering";
export type DeviceAccountRemovalState = "active" | "pending_device_reset" | "removed";
export type DeviceAccountRemovalMode = "remote_reset_remove" | "account_only_remove";
export type DeviceOnboardingStatus = "awaiting_ap" | "awaiting_cloud" | "claimed" | "expired" | "cancelled" | "failed";
export type DeviceApProvisioningState = "ready" | "busy" | "provisioned";
export type DeviceApProvisioningNextStep = "connect_to_cloud" | "retry";
export type SetupFlowKind = "onboarding" | "recovery";
export type SetupFlowStage =
  | "intro"
  | "join_device_ap"
  | "scan_home_wifi"
  | "choose_home_wifi"
  | "reconnecting_board"
  | "restoring_board"
  | "success"
  | "failure";
export type SetupFlowFailureCode =
  | "ap_not_joined"
  | "wifi_join_failed"
  | "scan_empty"
  | "cloud_claim_timeout"
  | "restore_failed"
  | "session_stale";
export type SetupFlowProgressState = "active" | "complete" | "pending";
export type DeviceFirmwareOtaState =
  | "requested"
  | "downloading"
  | "downloaded"
  | "verifying"
  | "staged"
  | "rebooting"
  | "pending_confirm"
  | "succeeded"
  | "failed_download"
  | "failed_verify"
  | "failed_stage"
  | "failed_boot"
  | "rolled_back"
  | "recovery_needed"
  | "blocked";
export type DeviceFirmwareInstallPolicy = "user_triggered" | "auto_apply";
export type DeviceFirmwareProofScenario = "no-update" | "available" | "in-progress" | "failed" | "succeeded";

export interface DeviceApScannedNetwork {
  authMode?: string | null;
  rssi: number | null;
  secure: boolean;
  ssid: string;
}

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
  accountRemovalDeadlineAt: string | null;
  accountRemovalMode: DeviceAccountRemovalMode | null;
  accountRemovalRequestedAt: string | null;
  accountRemovalState: DeviceAccountRemovalState;
  boardId: string | null;
  dailyMinimum: string;
  id: string;
  name: string;
  ownerName: string;
  recoveryState: DeviceRecoveryState;
  syncState: SyncState;
  isLive: boolean;
  lastSnapshotAt: string | null;
  lastSeenAt?: string | null;
  lastSyncAt?: string | null;
  runtimeRevision: number;
  weeklyTarget: number;
  weekTargets: number[] | null;
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
  habitStartedOnLocal: string | null;
  historyEraStartedAt: string | null;
  recordedDaysTotal: number;
  successfulWeeksTotal: number;
  days: boolean[][];
  dateGrid?: string[][];
  logicalToday: string;
  isProjectedBeyondSnapshot: boolean;
  needsSnapshotRefresh: boolean;
  today: TodayPointer;
}

export interface PendingDeviceMirrorState {
  currentWeekStart?: string | null;
  dailyMinimum?: string;
  days?: boolean[][];
  habitStartedOnLocal?: string | null;
  name?: string;
  recordedDaysTotal?: number;
  successfulWeeksTotal?: number;
  weeklyTarget?: number;
  weekTargets?: number[] | null;
}

export interface Board {
  id: string;
  ownerUserId: string;
  activeHistoryEra: number;
  archivedAt: string | null;
  historyEraStartedAt: string | null;
}

export interface BoardBackup {
  id: string;
  boardId: string;
  backupDay?: string;
  boardDays: boolean[][];
  currentWeekStart: string;
  historyEra?: number;
  weekTargets?: number[] | null;
  todayRow: number;
  backedUpAt: string;
  sourceDeviceId: string | null;
  sourceSnapshotRevision: number;
  sourceSnapshotHash: string | null;
}

export interface RestoreCandidate {
  backupId: string;
  boardId: string;
  boardName: string;
  backedUpAt: string;
  sourceDeviceId: string | null;
  sourceDeviceName: string | null;
}

export interface OnboardingRestoreSource {
  boardId: string | null;
  capturedAt: string;
  dateGrid?: string[][];
  days: boolean[][];
  logicalToday: string;
  weekTargets: number[] | null;
  settings: {
    autoBrightness: boolean;
    brightness: number;
    customPalette?: Partial<BoardPalette>;
    dailyMinimum: string;
    name: string;
    paletteId: string;
    resetTime: string;
    rewardEnabled: boolean;
    rewardTrigger: RewardTrigger;
    rewardType: RewardType;
    timezone: string;
    weeklyTarget: number;
  };
  sourceDeviceId: string;
  sourceDeviceName: string;
}

export type RestoreChoice = "restore" | "fresh";
export type ResetFlowState = "idle" | "confirming" | "queued";
export type CelebrationTransitionStyle =
  | "column_wipe"
  | "reverse_wipe"
  | "center_split"
  | "top_drop"
  | "diagonal_wave"
  | "constellation"
  | "bottom_rise"
  | "edge_close"
  | "reverse_diagonal"
  | "matrix_rain"
  | "venetian"
  | "pulse_ring"
  | "laser_scan"
  | "spiral_collapse"
  | "glitch_overwrite"
  | "comet_overwrite";
export type CelebrationTransitionSpeed = "very_fast" | "fast" | "balanced" | "slow" | "even_slower";

export interface SharedBoard {
  celebrationEnabled: boolean;
  celebrationDwellSeconds: number;
  celebrationTransitionSpeed: CelebrationTransitionSpeed;
  celebrationTransition: CelebrationTransitionStyle;
  id: string;
  viewerMembershipId: string;
  ownerName: string;
  habitName: string;
  syncState: SyncState;
  lastSnapshotAt?: string | null;
  weeklyTarget: number;
  weekTargets: number[] | null;
  paletteId: string;
  days: boolean[][];
  dateGrid?: string[][];
  logicalToday: string;
  today: TodayPointer;
}

export interface DeviceFirmwareReleaseSummary {
  firmwareVersion: string;
  installPolicy: DeviceFirmwareInstallPolicy;
  minimumAppVersion: string | null;
  minimumConfirmedFirmwareVersion: string | null;
  releaseId: string;
}

export interface DeviceFirmwareUpdateSummary {
  availabilityReason: string;
  availableRelease: DeviceFirmwareReleaseSummary | null;
  canRequestUpdate: boolean;
  confirmedReleaseId: string | null;
  currentFirmwareChannel: string | null;
  currentFirmwareVersion: string;
  currentState: DeviceFirmwareOtaState | null;
  deviceId: string;
  lastFailureCode: string | null;
  lastFailureDetail: string | null;
  lastReportedAt: string | null;
  lastRequestedAt: string | null;
  otaCompletedAt: string | null;
  otaStartedAt: string | null;
  reportedFirmwareVersion: string | null;
  targetReleaseId: string | null;
  updateAvailable: boolean;
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

export interface SocialProfile {
  avatarUrl: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  updatedAt: string | null;
  userId: string;
  username: string | null;
}

export interface SocialProfilePhotoAsset {
  mimeType?: string | null;
  uri: string;
}

export interface SocialProfileUpdateInput {
  avatarAsset?: SocialProfilePhotoAsset | null;
  clearAvatar?: boolean;
  firstName: string;
  lastName: string;
  username: string;
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

export interface SetupFlowFailureState {
  code: SetupFlowFailureCode;
  message: string;
  retryable: boolean;
  title: string;
}

export interface SetupFlowOverlayState {
  body: string;
  title: string;
  tone: "error" | "neutral" | "success";
}

export interface SetupFlowProgressRow {
  key: "submit" | "join" | "restore" | "finish";
  label: string;
  state: SetupFlowProgressState;
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
  failure_code?: SetupFlowFailureCode | null;
  firmware_version: string | null;
  hardware_profile: string | null;
  last_failure_reason?: string | null;
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

export interface DeviceApNetworkScanResponse {
  networks: DeviceApScannedNetwork[];
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
  palette_custom?: Partial<BoardPalette>;
  palette_preset?: string;
  reward_enabled?: boolean;
  reward_trigger?: RewardTrigger;
  reward_type?: RewardType;
  timezone?: string;
  weekly_target?: number;
}
