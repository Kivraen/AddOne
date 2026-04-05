import { paletteById } from "@/constants/palettes";
import {
  DEFAULT_CELEBRATION_DWELL_SECONDS,
  DEFAULT_CELEBRATION_TRANSITION,
  DEFAULT_CELEBRATION_TRANSITION_SPEED,
} from "@/lib/celebration-transitions";
import { connectionGraceState } from "@/lib/device-connection";
import {
  AddOneDevice,
  DeviceAccountRemovalMode,
  DeviceAccountRemovalState,
  BoardPalette,
  CelebrationTransitionSpeed,
  CelebrationTransitionStyle,
  DeviceFirmwareInstallPolicy,
  DeviceFirmwareOtaState,
  DeviceFirmwareUpdateSummary,
  DeviceSettingsPatch,
  DeviceOnboardingSession,
  DeviceRecoveryState,
  DeviceSharingState,
  DeviceShareRequest,
  DeviceViewer,
  HistoryDraftUpdate,
  RestoreCandidate,
  SharedBoard,
  SyncState,
} from "@/types/addone";
import { buildRuntimeBoardProjection, normalizeWeekStart } from "@/lib/runtime-board-projection";
import { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { getSupabaseClient } from "@/lib/supabase";

type DeviceRow = Tables<"devices"> & {
  account_removal_deadline_at?: string | null;
  account_removal_mode?: DeviceAccountRemovalMode | null;
  account_removal_requested_at?: string | null;
  account_removal_state?: DeviceAccountRemovalState | null;
  last_runtime_revision?: number | null;
  last_snapshot_at?: string | null;
  last_snapshot_hash?: string | null;
  board_id?: string | null;
  reset_epoch?: number | null;
  recovery_state?: DeviceRecoveryState | null;
  last_factory_reset_at?: string | null;
};
type MembershipRow = Tables<"device_memberships">;
type RuntimeSnapshotRow = Tables<"device_runtime_snapshots">;
type CommandRow = Tables<"device_commands">;
type DeviceDayStateRow = Tables<"device_day_states">;
type DeviceOnboardingSessionRow = Tables<"device_onboarding_sessions">;
type ProfileRow = Tables<"profiles">;
type ShareCodeRow = Tables<"device_share_codes">;
type ShareRequestRow = Tables<"device_share_requests">;
type CreateDeviceOnboardingSessionRow = Database["public"]["Functions"]["create_device_onboarding_session"]["Returns"][number];
type ShareRequestListRow = Database["public"]["Functions"]["list_device_share_requests"]["Returns"][number];
type ViewerListRow = Database["public"]["Functions"]["list_device_viewers"]["Returns"][number];
type RestoreCandidateRow = Database["public"]["Functions"]["list_restorable_board_backups_for_user"]["Returns"][number];
type DeviceHistoryMetricRow = {
  current_daily_minimum: string | null;
  current_habit_name: string | null;
  current_habit_started_on_local: string | null;
  current_weekly_target: number | null;
  device_id: string;
  history_era_started_at: string | null;
  recorded_days_total: number | null;
  successful_weeks_total: number | null;
  visible_week_targets: Json | null;
};

const lastKnownOwnedHistoryMetricsByDevice: Record<string, DeviceHistoryMetricRow | undefined> = {};
type DeviceFirmwareUpdateSummaryRow = {
  availability_reason: string | null;
  available_firmware_version: string | null;
  available_install_policy: DeviceFirmwareInstallPolicy | null;
  available_release_id: string | null;
  can_request_update: boolean | null;
  confirmed_release_id: string | null;
  current_firmware_channel: string | null;
  current_firmware_version: string;
  current_state: DeviceFirmwareOtaState | null;
  device_id: string;
  last_failure_code: string | null;
  last_failure_detail: string | null;
  last_reported_at: string | null;
  last_requested_at: string | null;
  minimum_app_version: string | null;
  minimum_confirmed_firmware_version: string | null;
  ota_completed_at: string | null;
  ota_started_at: string | null;
  reported_firmware_version: string | null;
  target_release_id: string | null;
  update_available: boolean | null;
};
type BeginFirmwareUpdateRow = {
  command_id: string | null;
  command_status: string;
  release_id: string;
  request_id: string;
  request_status: string;
  requested_at: string;
};

type MembershipWithDevice = Pick<MembershipRow, "device_id" | "reminder_enabled" | "reminder_time"> & {
  device: DeviceRow | null;
};

function ensureSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function assertData<T>(error: { message: string } | null, data: T, message: string) {
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function displayNameFromEmail(email?: string | null) {
  if (!email) {
    return "AddOne User";
  }

  const [localPart] = email.split("@");
  const normalizedLocalPart = localPart
    ?.trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalizedLocalPart) {
    return "AddOne User";
  }

  return normalizedLocalPart
    .split(" ")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function timestampsMatch(left?: string | null, right?: string | null) {
  if (!left || !right) {
    return false;
  }

  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function buildDisplayName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export class UsernameConflictError extends Error {
  constructor(message = "That username is already taken.") {
    super(message);
    this.name = "UsernameConflictError";
  }
}

export class ProfileMigrationRequiredError extends Error {
  constructor(message = "The profile backend needs the latest migration before this change can be saved.") {
    super(message);
    this.name = "ProfileMigrationRequiredError";
  }
}

export function isUsernameConflictError(error: unknown): error is UsernameConflictError {
  return error instanceof UsernameConflictError;
}

export function isProfileMigrationRequiredError(error: unknown): error is ProfileMigrationRequiredError {
  return error instanceof ProfileMigrationRequiredError;
}

function isProfileMigrationMessage(message: string) {
  return (
    /schema cache/i.test(message) ||
    /could not find the '?(first_name|last_name|username)'? column/i.test(message) ||
    (/bucket/i.test(message) && /profile-avatars/i.test(message))
  );
}

function isMissingRestoreBackendMessage(message: string) {
  return /list_restorable_board_backups_for_user/i.test(message) && /schema cache|could not find the function/i.test(message);
}

function isMissingHistoryMetricsBackendMessage(message: string) {
  return /list_device_history_metrics_for_user/i.test(message) && /schema cache|could not find the function/i.test(message);
}

function isMissingRemovalFinalizerBackendMessage(message: string) {
  return /finalize_stale_device_account_removals_for_user/i.test(message) && /schema cache|could not find the function/i.test(message);
}

function isMissingRevokeViewerBackendMessage(message: string) {
  return /revoke_device_viewer_membership/i.test(message) && /schema cache|could not find the function/i.test(message);
}

function isMissingLeaveSharedBoardBackendMessage(message: string) {
  return /leave_shared_board/i.test(message) && /schema cache|could not find the function/i.test(message);
}

function isTransientNetworkFailureMessage(message: string) {
  return /network request failed|network request timed out|timed out|failed to fetch|load failed/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withTransientNetworkRetry<T>(operation: () => Promise<T>, options?: { attempts?: number; delayMs?: number }) {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 600;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !isTransientNetworkFailureMessage(error.message) || attempt >= attempts) {
        throw error;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("The request failed.");
}

function stripSeconds(value: string | null | undefined, fallback = "00:00") {
  if (!value) {
    return fallback;
  }

  return value.slice(0, 5);
}

function formatTimeLabel(value: string) {
  const [hourRaw, minuteRaw] = stripSeconds(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  if (hour === 0 && minute === 0) {
    return "midnight";
  }

  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function nextResetLabel(resetTime: string) {
  const formatted = formatTimeLabel(resetTime);
  return formatted === "midnight" ? "Resets at midnight" : `Resets at ${formatted}`;
}

function deviceConnectionState(device: Pick<DeviceRow, "last_seen_at" | "last_snapshot_at" | "last_sync_at">) {
  return connectionGraceState({
    lastSeenAt: device.last_seen_at ?? null,
    lastSnapshotAt: device.last_snapshot_at ?? null,
    lastSyncAt: device.last_sync_at ?? null,
  });
}

function deviceSeemsOnline(device: Pick<DeviceRow, "last_seen_at" | "last_snapshot_at" | "last_sync_at">) {
  return deviceConnectionState(device) !== "offline";
}

function normalizeRecoveryState(value?: string | null): DeviceRecoveryState {
  if (value === "needs_recovery" || value === "recovering") {
    return value;
  }

  return "ready";
}

function normalizeAccountRemovalState(value?: string | null): DeviceAccountRemovalState {
  return value === "pending_device_reset" || value === "removed" ? value : "active";
}

function deriveSyncState(device: DeviceRow): SyncState {
  const connectionState = deviceConnectionState(device);
  const accountRemovalState = normalizeAccountRemovalState(device.account_removal_state);
  if (accountRemovalState === "pending_device_reset") {
    return connectionState === "offline" ? "offline" : "syncing";
  }

  const recoveryState = normalizeRecoveryState(device.recovery_state);
  if (recoveryState === "needs_recovery") {
    return connectionState === "offline" ? "offline" : "syncing";
  }

  if (recoveryState === "recovering") {
    return "syncing";
  }

  if (connectionState === "online") {
    return "online";
  }

  return connectionState === "checking" ? "syncing" : "offline";
}

function coercePalette(json: Json): Partial<BoardPalette> | undefined {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return undefined;
  }

  return json as Partial<BoardPalette>;
}

function paletteIdForDevice(device: DeviceRow) {
  return paletteById[device.palette_preset] ? device.palette_preset : "classic";
}

function mapDeviceRowToAppDevice(input: {
  currentUserName: string;
  device: DeviceRow;
  metrics?: DeviceHistoryMetricRow | null;
  membership: MembershipWithDevice;
  snapshot?: RuntimeSnapshotRow | null;
}): AddOneDevice {
  const { currentUserName, device, membership, metrics, snapshot } = input;
  const normalizedWeekStart = normalizeWeekStart(device.week_start);
  const liveWeeklyTarget = Number(device.weekly_target);
  const currentWeekTarget = Number(metrics?.current_weekly_target ?? device.weekly_target);
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: currentWeekTarget,
    resetTime: device.day_reset_time,
    snapshot: snapshot
      ? {
          boardDays: snapshot.board_days,
          currentWeekStart: snapshot.current_week_start,
          todayRow: snapshot.today_row,
          weekTargets: snapshot.week_targets,
        }
      : null,
    visibleWeekTargets: metrics?.visible_week_targets ?? null,
    timezone: device.timezone,
    weekStart: normalizedWeekStart,
  });

  return {
    accountRemovalDeadlineAt: device.account_removal_deadline_at ?? null,
    accountRemovalMode: device.account_removal_mode ?? null,
    accountRemovalRequestedAt: device.account_removal_requested_at ?? null,
    accountRemovalState: normalizeAccountRemovalState(device.account_removal_state),
    boardId: device.board_id ?? null,
    dailyMinimum: metrics?.current_daily_minimum ?? "",
    id: device.id,
    isLive: deviceSeemsOnline(device),
    lastSnapshotAt: snapshot?.generated_at ?? device.last_snapshot_at ?? null,
    lastSeenAt: device.last_seen_at,
    lastSyncAt: device.last_sync_at,
    habitStartedOnLocal: metrics?.current_habit_started_on_local ?? null,
    historyEraStartedAt: metrics?.history_era_started_at ?? null,
    name: metrics?.current_habit_name?.trim() || device.name,
    ownerName: currentUserName,
    recoveryState: normalizeRecoveryState(device.recovery_state),
    recordedDaysTotal: Number(metrics?.recorded_days_total ?? 0),
    runtimeRevision: Number(snapshot?.revision ?? device.last_runtime_revision ?? 0),
    successfulWeeksTotal: Number(metrics?.successful_weeks_total ?? 0),
    syncState: deriveSyncState(device),
    weeklyTarget: liveWeeklyTarget,
    weekTargets: projection.weekTargets,
    weekStart: normalizedWeekStart,
    timezone: device.timezone,
    resetTime: stripSeconds(device.day_reset_time),
    nextResetLabel: nextResetLabel(device.day_reset_time),
    paletteId: paletteIdForDevice(device),
    customPalette: coercePalette(device.palette_custom),
    rewardEnabled: device.reward_enabled,
    rewardType: device.reward_type,
    rewardTrigger: device.reward_trigger,
    brightness: device.brightness,
    autoBrightness: device.ambient_auto,
    reminderEnabled: membership.reminder_enabled,
    reminderTime: stripSeconds(membership.reminder_time, "19:30"),
    firmwareVersion: device.firmware_version,
    days: projection.days,
    dateGrid: projection.dateGrid,
    logicalToday: projection.logicalToday,
    isProjectedBeyondSnapshot: projection.isProjectedBeyondSnapshot,
    needsSnapshotRefresh: projection.needsSnapshotRefresh,
    today: projection.today,
  };
}

function mapDeviceRowToSharedBoard(input: {
  celebrationEnabled: boolean;
  celebrationDwellSeconds: number;
  celebrationTransitionSpeed: CelebrationTransitionSpeed;
  celebrationTransition: CelebrationTransitionStyle;
  device: DeviceRow;
  ownerName: string;
  snapshot?: RuntimeSnapshotRow | null;
  viewerMembershipId: string;
}): SharedBoard {
  const { celebrationEnabled, celebrationDwellSeconds, celebrationTransition, celebrationTransitionSpeed, device, ownerName, snapshot, viewerMembershipId } = input;
  const projection = buildRuntimeBoardProjection({
    fallbackWeeklyTarget: device.weekly_target,
    resetTime: device.day_reset_time,
    snapshot: snapshot
      ? {
          boardDays: snapshot.board_days,
          currentWeekStart: snapshot.current_week_start,
          todayRow: snapshot.today_row,
          weekTargets: snapshot.week_targets,
        }
      : null,
    timezone: device.timezone,
    weekStart: normalizeWeekStart(device.week_start),
  });

  return {
    celebrationEnabled,
    celebrationDwellSeconds,
    celebrationTransitionSpeed,
    celebrationTransition,
    id: device.id,
    viewerMembershipId,
    ownerName,
    habitName: device.name,
    lastSnapshotAt: snapshot?.generated_at ?? device.last_snapshot_at ?? null,
    syncState: deriveSyncState(device),
    weeklyTarget: device.weekly_target,
    weekTargets: projection.weekTargets,
    paletteId: paletteIdForDevice(device),
    days: projection.days,
    dateGrid: projection.dateGrid,
    logicalToday: projection.logicalToday,
    today: projection.today,
  };
}

async function fetchLatestRuntimeSnapshots(deviceIds: string[], options?: { allowEmptyOnTransientFailure?: boolean }) {
  if (deviceIds.length === 0) {
    return [] as RuntimeSnapshotRow[];
  }

  const supabase = ensureSupabase();
  try {
    return await withTransientNetworkRetry(async () => {
      const { data, error } = await supabase
        .from("device_runtime_snapshots")
        .select("*")
        .in("device_id", deviceIds)
        .order("generated_at", { ascending: false })
        .order("created_at", { ascending: false });

      return assertData(error, (data ?? []) as RuntimeSnapshotRow[], "Failed to load device runtime snapshots.");
    });
  } catch (error) {
    if (options?.allowEmptyOnTransientFailure !== false && error instanceof Error && isTransientNetworkFailureMessage(error.message)) {
      return [] as RuntimeSnapshotRow[];
    }

    throw error;
  }
}

async function fetchDeviceDayStatesForLocalDates(
  deviceIds: string[],
  localDates: string[],
  options?: { allowEmptyOnTransientFailure?: boolean },
) {
  if (deviceIds.length === 0 || localDates.length === 0) {
    return [] as DeviceDayStateRow[];
  }

  const supabase = ensureSupabase();
  try {
    return await withTransientNetworkRetry(async () => {
      const { data, error } = await supabase
        .from("device_day_states")
        .select("device_id, history_era, local_date, is_done, effective_at, updated_at")
        .in("device_id", deviceIds)
        .in("local_date", localDates);

      return assertData(error, (data ?? []) as DeviceDayStateRow[], "Failed to load current device day states.");
    });
  } catch (error) {
    if (options?.allowEmptyOnTransientFailure !== false && error instanceof Error && isTransientNetworkFailureMessage(error.message)) {
      return [] as DeviceDayStateRow[];
    }

    throw error;
  }
}

function resolveAuthoritativeSnapshotForDevice(device: DeviceRow, snapshots: RuntimeSnapshotRow[]) {
  const deviceSnapshots = snapshots.filter((row) => row.device_id === device.id);
  if (deviceSnapshots.length === 0) {
    return null;
  }

  if (device.last_snapshot_at) {
    const exactTimestampMatch = deviceSnapshots.find((row) => timestampsMatch(row.generated_at, device.last_snapshot_at));
    if (exactTimestampMatch) {
      return exactTimestampMatch;
    }
  }

  if ((device.last_runtime_revision ?? 0) > 0) {
    const revisionMatch = deviceSnapshots.find((row) => Number(row.revision) === Number(device.last_runtime_revision));
    if (revisionMatch) {
      return revisionMatch;
    }
  }

  return null;
}

function selectProjectedTodayState(device: AddOneDevice, dayStates: DeviceDayStateRow[]) {
  const eraStartedAt = device.historyEraStartedAt ? new Date(device.historyEraStartedAt).getTime() : null;
  const matchingStates = dayStates.filter((row) => {
    if (row.device_id !== device.id || row.local_date !== device.logicalToday) {
      return false;
    }

    if (eraStartedAt === null) {
      return true;
    }

    const effectiveAt = row.effective_at ? new Date(row.effective_at).getTime() : Number.NaN;
    return Number.isFinite(effectiveAt) && effectiveAt >= eraStartedAt;
  });
  if (matchingStates.length === 0) {
    return null;
  }

  matchingStates.sort((left, right) => {
    const historyEraDelta = Number(right.history_era ?? 0) - Number(left.history_era ?? 0);
    if (historyEraDelta !== 0) {
      return historyEraDelta;
    }

    const effectiveAtDelta = new Date(right.effective_at ?? 0).getTime() - new Date(left.effective_at ?? 0).getTime();
    if (effectiveAtDelta !== 0) {
      return effectiveAtDelta;
    }

    return new Date(right.updated_at ?? 0).getTime() - new Date(left.updated_at ?? 0).getTime();
  });

  return matchingStates[0] ?? null;
}

function overlayProjectedTodayState(device: AddOneDevice, dayStates: DeviceDayStateRow[]) {
  const projectedTodayState = selectProjectedTodayState(device, dayStates);
  if (!projectedTodayState) {
    return device;
  }

  const week = device.days[device.today.weekIndex];
  const currentState = week?.[device.today.dayIndex];
  if (currentState === undefined || currentState === projectedTodayState.is_done) {
    return device;
  }

  const days = device.days.map((currentWeek) => [...currentWeek]);
  days[device.today.weekIndex][device.today.dayIndex] = projectedTodayState.is_done;

  return {
    ...device,
    days,
  };
}

async function fetchOwnedDeviceHistoryMetrics(deviceIds: string[]) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("list_device_history_metrics_for_user");

  if (error && isMissingHistoryMetricsBackendMessage(error.message)) {
    return [] as DeviceHistoryMetricRow[];
  }

  if (error && isTransientNetworkFailureMessage(error.message)) {
    return deviceIds.flatMap((deviceId) => {
      const cachedMetrics = lastKnownOwnedHistoryMetricsByDevice[deviceId];
      return cachedMetrics ? [cachedMetrics] : [];
    });
  }

  const rows = assertData(
    error,
    (data ?? []) as DeviceHistoryMetricRow[],
    "Failed to load device history metrics.",
  );

  for (const row of rows) {
    lastKnownOwnedHistoryMetricsByDevice[row.device_id] = row;
  }

  return rows;
}

async function fetchProfiles(userIds: string[], options?: { allowEmptyOnTransientFailure?: boolean }) {
  if (userIds.length === 0) {
    return [] as ProfileRow[];
  }

  const supabase = ensureSupabase();
  try {
    return await withTransientNetworkRetry(async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return assertData(error, (data ?? []) as ProfileRow[], "Failed to load profiles.");
    });
  } catch (error) {
    if (options?.allowEmptyOnTransientFailure !== false && error instanceof Error && isTransientNetworkFailureMessage(error.message)) {
      return [] as ProfileRow[];
    }

    throw error;
  }
}

function mapShareRequestRow(row: ShareRequestListRow): DeviceShareRequest {
  return {
    createdAt: row.created_at,
    id: row.id,
    requesterAvatarUrl: row.requester_avatar_url,
    requesterDisplayName: row.requester_display_name,
    requesterUserId: row.requester_user_id,
    status: row.status,
  };
}

function mapViewerRow(row: ViewerListRow): DeviceViewer {
  return {
    approvedAt: row.approved_at,
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    membershipId: row.membership_id,
    userId: row.user_id,
  };
}

function mapDeviceOnboardingSessionRow(
  row: Pick<
    DeviceOnboardingSessionRow,
    "claim_token_prefix" | "claimed_at" | "created_at" | "device_id" | "expires_at" | "hardware_profile_hint" | "id" | "last_error" | "status" | "waiting_for_device_at"
  > & {
    claim_token?: string | null;
  },
): DeviceOnboardingSession {
  const isExpired = row.status !== "claimed" && row.status !== "cancelled" && new Date(row.expires_at).getTime() <= Date.now();

  return {
    id: row.id,
    claimToken: row.claim_token ?? null,
    claimTokenPrefix: row.claim_token_prefix,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    deviceId: row.device_id,
    expiresAt: row.expires_at,
    hardwareProfileHint: row.hardware_profile_hint,
    isExpired,
    lastError: row.last_error,
    status: isExpired && row.status !== "expired" ? "expired" : row.status,
    waitingForDeviceAt: row.waiting_for_device_at,
  };
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = ensureSupabase();
  return withTransientNetworkRetry(async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    return (data as ProfileRow | null) ?? null;
  });
}

export async function saveProfile(params: {
  profile: { avatarUrl: string | null; firstName: string; lastName: string; username: string };
  userId: string;
}): Promise<ProfileRow> {
  const { profile, userId } = params;
  const supabase = ensureSupabase();
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();

  const payload: TablesInsert<"profiles"> = {
    avatar_url: profile.avatarUrl,
    display_name: buildDisplayName(firstName, lastName),
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
    user_id: userId,
    username: normalizeUsername(profile.username),
  };

  return withTransientNetworkRetry(async () => {
    const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select("*").single();

    if (error) {
      const combinedMessage = `${error.message} ${error.details ?? ""}`;

      if (isProfileMigrationMessage(combinedMessage)) {
        throw new ProfileMigrationRequiredError();
      }

      if (error.code === "23505" && /username/i.test(combinedMessage)) {
        throw new UsernameConflictError();
      }

      throw new Error(error.message);
    }

    return data as ProfileRow;
  }).catch((error) => {
    if (error instanceof Error && isTransientNetworkFailureMessage(error.message)) {
      throw new Error("Network request failed while saving your profile. Keep the app open for a few seconds, confirm the phone still has internet access, then try again.");
    }

    throw error;
  });
}

export async function uploadProfileAvatar(params: { mimeType?: string | null; uri: string; userId: string }) {
  const supabase = ensureSupabase();
  const response = await fetch(params.uri);

  if (!response.ok) {
    throw new Error("We couldn't read the selected photo.");
  }

  const path = `${params.userId}/avatar`;
  const contentType = params.mimeType ?? response.headers.get("Content-Type") ?? "image/jpeg";
  const file = await response.arrayBuffer();
  const { error } = await supabase.storage.from("profile-avatars").upload(path, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    if (isProfileMigrationMessage(`${error.message}`)) {
      throw new ProfileMigrationRequiredError();
    }

    throw new Error(error.message);
  }

  return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
}

export async function removeProfileAvatar(userId: string) {
  const supabase = ensureSupabase();
  const { error } = await supabase.storage.from("profile-avatars").remove([`${userId}/avatar`]);

  if (error) {
    if (isProfileMigrationMessage(`${error.message}`)) {
      throw new ProfileMigrationRequiredError();
    }

    throw new Error(error.message);
  }
}

export async function fetchOwnedDevices(params: { userEmail?: string | null; userId: string }) {
  const { userEmail, userId } = params;
  const supabase = ensureSupabase();
  const currentUserProfile = await fetchProfile(userId).catch(() => null);
  const currentUserName = currentUserProfile?.display_name ?? displayNameFromEmail(userEmail);

  const removalFinalizerResponse = await (supabase.rpc as any)("finalize_stale_device_account_removals_for_user");
  if (removalFinalizerResponse.error && !isMissingRemovalFinalizerBackendMessage(removalFinalizerResponse.error.message)) {
    throw new Error(removalFinalizerResponse.error.message);
  }

  const membershipsResponse = await supabase
    .from("device_memberships")
    .select("device_id, reminder_enabled, reminder_time, device:devices(*)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "approved");

  const memberships = assertData(
    membershipsResponse.error,
    (membershipsResponse.data ?? []) as MembershipWithDevice[],
    "Failed to load owned devices.",
  ).filter((row) => row.device);

  const devices = memberships.map((row) => row.device as DeviceRow);
  const deviceIds = devices.map((device) => device.id);

  if (deviceIds.length === 0) {
    return [] as AddOneDevice[];
  }

  const [snapshots, historyMetrics] = await Promise.all([
    fetchLatestRuntimeSnapshots(deviceIds),
    fetchOwnedDeviceHistoryMetrics(deviceIds),
  ]);
  const metricsByDevice = historyMetrics.reduce<Record<string, DeviceHistoryMetricRow>>((accumulator, row) => {
    accumulator[row.device_id] = row;
    return accumulator;
  }, {});
  const provisionalDevices = memberships.map((membership) =>
    mapDeviceRowToAppDevice({
      currentUserName,
      device: membership.device as DeviceRow,
      metrics: metricsByDevice[membership.device_id] ?? lastKnownOwnedHistoryMetricsByDevice[membership.device_id] ?? null,
      membership,
      snapshot: resolveAuthoritativeSnapshotForDevice(membership.device as DeviceRow, snapshots),
    }),
  );
  const todayStateDates = Array.from(new Set(provisionalDevices.map((device) => device.logicalToday).filter(Boolean)));
  const dayStates = await fetchDeviceDayStatesForLocalDates(deviceIds, todayStateDates);

  return provisionalDevices.map((device) => overlayProjectedTodayState(device, dayStates));
}

export async function fetchSharedBoards(userId: string) {
  const supabase = ensureSupabase();
  return withTransientNetworkRetry(async () => {
    const membershipsResponse = await supabase
      .from("device_memberships")
      .select("id, device_id, celebration_enabled, celebration_transition, celebration_transition_speed, celebration_dwell_seconds, device:devices(*)")
      .eq("user_id", userId)
      .eq("role", "viewer")
      .eq("status", "approved");

    const memberships = assertData(
      membershipsResponse.error,
      (membershipsResponse.data ?? []) as Array<{
        celebration_dwell_seconds: number | null;
        celebration_enabled: boolean;
        celebration_transition: CelebrationTransitionStyle | null;
        celebration_transition_speed: CelebrationTransitionSpeed | null;
        device: DeviceRow | null;
        device_id: string;
        id: string;
      }>,
      "Failed to load shared boards.",
    ).filter((row) => row.device);

    const devices = memberships.map((row) => row.device as DeviceRow);
    const deviceIds = devices.map((device) => device.id);

    if (deviceIds.length === 0) {
      return [] as SharedBoard[];
    }

    const [snapshots, ownerRowsResponse] = await Promise.all([
      fetchLatestRuntimeSnapshots(deviceIds, { allowEmptyOnTransientFailure: false }),
      (supabase.rpc as any)("list_shared_board_owners", {
        p_device_ids: deviceIds,
      }),
    ]);

    const ownerRows = assertData(
      ownerRowsResponse.error,
      (ownerRowsResponse.data ?? []) as Array<{
        device_id: string;
        owner_display_name: string | null;
        owner_user_id: string;
      }>,
      "Failed to load shared board owners.",
    );

    if (__DEV__) {
      console.info("[friends] fetchSharedBoards", {
        ownerMembershipCount: ownerRows.length,
        userId,
        viewerDeviceCount: deviceIds.length,
      });
    }

    const ownerByDeviceId = ownerRows.reduce<Record<string, string>>((accumulator, ownerRow) => {
      accumulator[ownerRow.device_id] = ownerRow.owner_display_name ?? "AddOne User";
      return accumulator;
    }, {});

    return devices.map((device) =>
      mapDeviceRowToSharedBoard({
        celebrationDwellSeconds:
          memberships.find((membership) => membership.device_id === device.id)?.celebration_dwell_seconds ??
          DEFAULT_CELEBRATION_DWELL_SECONDS,
        celebrationEnabled: memberships.find((membership) => membership.device_id === device.id)?.celebration_enabled ?? true,
        celebrationTransition:
          memberships.find((membership) => membership.device_id === device.id)?.celebration_transition ??
          DEFAULT_CELEBRATION_TRANSITION,
        celebrationTransitionSpeed:
          memberships.find((membership) => membership.device_id === device.id)?.celebration_transition_speed ??
          DEFAULT_CELEBRATION_TRANSITION_SPEED,
        device,
        ownerName: ownerByDeviceId[device.id] ?? "AddOne User",
        viewerMembershipId: memberships.find((membership) => membership.device_id === device.id)?.id ?? device.id,
        snapshot: resolveAuthoritativeSnapshotForDevice(device, snapshots),
      }),
    );
  });
}

export async function fetchDeviceSharing(deviceId: string): Promise<DeviceSharingState> {
  const supabase = ensureSupabase();

  if (__DEV__) {
    console.info("[friends] fetchDeviceSharing:start", { deviceId });
  }

  const { pendingRequests, shareCode, viewers } = await withTransientNetworkRetry(async () => {
    const [shareCodeResponse, requestsResponse, viewersResponse] = await Promise.all([
      supabase.from("device_share_codes").select("*").eq("device_id", deviceId).maybeSingle(),
      (supabase.rpc as any)("list_device_share_requests", { p_device_id: deviceId }),
      (supabase.rpc as any)("list_device_viewers", { p_device_id: deviceId }),
    ]);

    return {
      shareCode: assertData(
        shareCodeResponse.error,
        (shareCodeResponse.data as ShareCodeRow | null) ?? null,
        "Failed to load share code.",
      ),
      pendingRequests: assertData(
        requestsResponse.error,
        (requestsResponse.data ?? []) as ShareRequestListRow[],
        "Failed to load share requests.",
      ).map(mapShareRequestRow),
      viewers: assertData(
        viewersResponse.error,
        (viewersResponse.data ?? []) as ViewerListRow[],
        "Failed to load viewers.",
      ).map(mapViewerRow),
    };
  });

  if (__DEV__) {
    console.info("[friends] fetchDeviceSharing:done", {
      deviceId,
      hasCode: Boolean(shareCode?.code),
      pendingRequestIds: pendingRequests.map((request) => request.id),
      viewerMembershipIds: viewers.map((viewer) => viewer.membershipId),
    });
  }

  return {
    code: shareCode?.code ?? null,
    pendingRequests,
    viewers,
  };
}

export async function claimDevice(params: { hardwareProfile?: string; hardwareUid: string; name?: string }) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("claim_device", {
    p_hardware_profile: params.hardwareProfile,
    p_hardware_uid: params.hardwareUid,
    p_name: params.name,
    p_reset_epoch: 0,
  });

  return assertData(error, data as DeviceRow, "Failed to claim device.");
}

export async function createDeviceOnboardingSession(params?: {
  bootstrapDayResetTime?: string | null;
  bootstrapTimezone?: string | null;
  hardwareProfileHint?: string | null;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("create_device_onboarding_session", {
    p_bootstrap_day_reset_time: params?.bootstrapDayResetTime ?? "00:00:00",
    p_bootstrap_timezone: params?.bootstrapTimezone ?? null,
    p_hardware_profile_hint: params?.hardwareProfileHint ?? null,
  });

  const session = assertData(
    error,
    ((data ?? []) as CreateDeviceOnboardingSessionRow[])[0] ?? null,
    "Failed to create the onboarding session.",
  );

  if (!session) {
    throw new Error("Failed to create the onboarding session.");
  }

  return mapDeviceOnboardingSessionRow({
    ...session,
    claim_token_prefix: session.claim_token.slice(0, 6).toUpperCase(),
    claimed_at: null,
    device_id: null,
    last_error: null,
    waiting_for_device_at: null,
  });
}

export async function fetchLatestActiveDeviceOnboardingSession(userId: string) {
  const supabase = ensureSupabase();

  const { data, error } = await supabase
    .from("device_onboarding_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["awaiting_ap", "awaiting_cloud"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDeviceOnboardingSessionRow(data as DeviceOnboardingSessionRow) : null;
}

export async function fetchDeviceOnboardingSession(sessionId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase.from("device_onboarding_sessions").select("*").eq("id", sessionId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDeviceOnboardingSessionRow(data as DeviceOnboardingSessionRow) : null;
}

export async function markDeviceOnboardingWaiting(sessionId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("mark_device_onboarding_waiting", {
    p_session_id: sessionId,
  });

  return mapDeviceOnboardingSessionRow(
    assertData(error, data as DeviceOnboardingSessionRow, "Failed to mark the onboarding session as waiting for device."),
  );
}

export async function cancelDeviceOnboardingSession(sessionId: string, reason?: string | null) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("cancel_device_onboarding_session", {
    p_reason: reason ?? null,
    p_session_id: sessionId,
  });

  return mapDeviceOnboardingSessionRow(
    assertData(error, data as DeviceOnboardingSessionRow, "Failed to cancel the onboarding session."),
  );
}

export async function redeemDeviceOnboardingClaimForTesting(params: {
  claimToken: string;
  firmwareVersion?: string;
  hardwareProfile?: string;
  hardwareUid: string;
  name?: string;
  resetEpoch?: number;
}) {
  const supabase = ensureSupabase();
  let { data, error } = await (supabase.rpc as any)("redeem_device_onboarding_claim", {
    p_claim_token: params.claimToken,
    p_device_auth_token: undefined,
    p_firmware_version: params.firmwareVersion,
    p_hardware_profile: params.hardwareProfile,
    p_hardware_uid: params.hardwareUid,
    p_name: params.name,
    p_reset_epoch: params.resetEpoch ?? 0,
  });

  if (error?.message?.includes("p_reset_epoch") && error.message.includes("schema cache")) {
    ({ data, error } = await (supabase.rpc as any)("redeem_device_onboarding_claim", {
      p_claim_token: params.claimToken,
      p_device_auth_token: undefined,
      p_firmware_version: params.firmwareVersion,
      p_hardware_profile: params.hardwareProfile,
      p_hardware_uid: params.hardwareUid,
      p_name: params.name,
    }));
  }

  return mapDeviceOnboardingSessionRow(
    assertData(error, data as DeviceOnboardingSessionRow, "Failed to redeem the onboarding claim."),
  );
}

export async function setDayStateFromApp(params: {
  baseRevision: number;
  clientEventId: string;
  deviceId: string;
  isDone: boolean;
  localDate: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("request_day_state_from_app", {
    p_base_revision: params.baseRevision,
    p_client_event_id: params.clientEventId,
    p_device_id: params.deviceId,
    p_is_done: params.isDone,
    p_local_date: params.localDate,
  });

  return assertData(
    error,
    data as { command_id: string; effective_at: string; status: string },
    "Failed to request day state update.",
  );
}

export async function requestRuntimeSnapshotFromApp(params: {
  deviceId: string;
  requestId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("request_runtime_snapshot_from_app", {
    p_device_id: params.deviceId,
    p_request_id: params.requestId,
  });

  return assertData(
    error,
    data as { command_id: string; status: string },
    "Failed to request a fresh device snapshot.",
  );
}

export async function applyHistoryDraftFromApp(params: {
  baseRevision: number;
  currentWeekStart?: string | null;
  deviceId: string;
  draftId: string;
  updates: HistoryDraftUpdate[];
  weekTargets?: number[] | null;
}) {
  const supabase = ensureSupabase();
  const updates = params.updates.map((update) => ({
    is_done: update.isDone,
    local_date: update.localDate,
  }));

  const { data, error } = await (supabase.rpc as any)("apply_history_draft_from_app", {
    p_base_revision: params.baseRevision,
    p_current_week_start: params.currentWeekStart ?? null,
    p_device_id: params.deviceId,
    p_updates: updates,
    p_draft_id: params.draftId,
    p_week_targets: params.weekTargets ?? null,
  });

  return assertData(
    error,
    data as { command_id: string; status: string },
    "Failed to save history draft.",
  );
}

export async function applyDeviceSettingsFromApp(deviceId: string, patch: DeviceSettingsPatch) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("apply_device_settings_from_app", {
    p_device_id: deviceId,
    p_patch: patch,
  });

  return assertData(
    error,
    data as { command_id: string; status: string },
    "Failed to request device settings update.",
  );
}

export async function enterWifiRecoveryFromApp(params: {
  deviceId: string;
  requestId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("enter_wifi_recovery_from_app", {
    p_device_id: params.deviceId,
    p_request_id: params.requestId,
  });

  return assertData(
    error,
    data as { command_id: string; status: string },
    "Failed to request Wi‑Fi recovery mode.",
  );
}

export async function requestDeviceFactoryResetFromApp(params: {
  deviceId: string;
  requestId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("request_device_factory_reset_from_app", {
    p_device_id: params.deviceId,
    p_request_id: params.requestId,
  });

  return assertData(
    error,
    data as { command_id: string; status: string },
    "Failed to request factory reset.",
  );
}

export async function resetDeviceHistoryFromApp(params: {
  dailyMinimum: string;
  deviceId: string;
  habitName: string;
  requestId: string;
  weeklyTarget: number;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("reset_device_history_from_app", {
    p_daily_minimum: params.dailyMinimum,
    p_device_id: params.deviceId,
    p_habit_name: params.habitName,
    p_request_id: params.requestId,
    p_weekly_target: params.weeklyTarget,
  });

  return assertData(
    error,
    data as { command_id: string; history_era: number; status: string },
    "Failed to reset device history.",
  );
}

export async function saveActiveHabitMetadataFromApp(params: {
  dailyMinimum: string;
  deviceId: string;
  habitName: string;
  weeklyTarget: number;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("update_active_habit_metadata_from_app", {
    p_daily_minimum: params.dailyMinimum,
    p_device_id: params.deviceId,
    p_habit_name: params.habitName,
    p_weekly_target: params.weeklyTarget,
  });

  return assertData(
    error,
    data as {
      command_id: string | null;
      current_week_start: string;
      daily_minimum: string | null;
      device_id: string;
      habit_name: string;
      history_era: number;
      status: string | null;
      weekly_target: number;
    },
    "Failed to save the current habit details.",
  );
}

export async function setActiveHabitStartDateFromApp(params: {
  deviceId: string;
  habitStartedOnLocal: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("set_active_habit_start_date_from_app", {
    p_device_id: params.deviceId,
    p_habit_started_on_local: params.habitStartedOnLocal,
  });

  return assertData(
    error,
    data as {
      device_id: string;
      habit_started_on_local: string;
      history_era: number;
    },
    "Failed to update the habit start date.",
  );
}

export async function removeDeviceFromAccountFromApp(params: {
  deviceId: string;
  remoteReset: boolean;
  requestId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("remove_device_from_account_from_app", {
    p_device_id: params.deviceId,
    p_remote_reset: params.remoteReset,
    p_request_id: params.requestId,
  });

  return assertData(
    error,
    data as {
      command_id: string | null;
      mode: DeviceAccountRemovalMode;
      removal_deadline_at: string | null;
      status: string;
    },
    "Failed to remove the device from the app.",
  );
}

function mapRestoreCandidateRow(row: RestoreCandidateRow): RestoreCandidate {
  return {
    backupId: row.backup_id,
    backedUpAt: row.backed_up_at,
    boardId: row.board_id,
    boardName: row.board_name,
    sourceDeviceId: row.source_device_id,
    sourceDeviceName: row.source_device_name,
  };
}

function mapDeviceFirmwareUpdateSummaryRow(row: DeviceFirmwareUpdateSummaryRow): DeviceFirmwareUpdateSummary {
  return {
    availabilityReason: row.availability_reason ?? "no_active_release",
    availableRelease:
      row.available_release_id && row.available_firmware_version && row.available_install_policy
        ? {
            firmwareVersion: row.available_firmware_version,
            installPolicy: row.available_install_policy,
            minimumAppVersion: row.minimum_app_version ?? null,
            minimumConfirmedFirmwareVersion: row.minimum_confirmed_firmware_version ?? null,
            releaseId: row.available_release_id,
          }
        : null,
    canRequestUpdate: row.can_request_update ?? false,
    confirmedReleaseId: row.confirmed_release_id ?? null,
    currentFirmwareChannel: row.current_firmware_channel ?? null,
    currentFirmwareVersion: row.current_firmware_version,
    currentState: row.current_state ?? null,
    deviceId: row.device_id,
    lastFailureCode: row.last_failure_code ?? null,
    lastFailureDetail: row.last_failure_detail ?? null,
    lastReportedAt: row.last_reported_at ?? null,
    lastRequestedAt: row.last_requested_at ?? null,
    otaCompletedAt: row.ota_completed_at ?? null,
    otaStartedAt: row.ota_started_at ?? null,
    reportedFirmwareVersion: row.reported_firmware_version ?? null,
    targetReleaseId: row.target_release_id ?? null,
    updateAvailable: row.update_available ?? false,
  };
}

export async function fetchRestorableBoardBackupsForUser(deviceId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("list_restorable_board_backups_for_user", {
    p_device_id: deviceId,
  });

  if (error && isMissingRestoreBackendMessage(error.message)) {
    return [];
  }

  return assertData(
    error,
    (data ?? []) as RestoreCandidateRow[],
    "Failed to load restorable board backups.",
  ).map(mapRestoreCandidateRow);
}

export async function restoreBoardBackupToDevice(params: {
  backupId: string;
  deviceId: string;
  requestId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("restore_board_backup_to_device", {
    p_backup_id: params.backupId,
    p_device_id: params.deviceId,
    p_request_id: params.requestId,
  });

  return assertData(
    error,
    data as { board_id: string; command_id: string; status: string },
    "Failed to restore the saved board to this device.",
  );
}

export async function fetchDeviceCommandStatus(commandId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("device_commands")
    .select("id, status, last_error, applied_at, failed_at")
    .eq("id", commandId)
    .single();

  return assertData(
    error,
    data as Pick<CommandRow, "applied_at" | "failed_at" | "id" | "last_error" | "status">,
    "Failed to load command status.",
  );
}

export async function fetchDeviceFirmwareUpdateSummary(params: {
  appVersion?: string | null;
  deviceId: string;
}) {
  const supabase = ensureSupabase();
  return withTransientNetworkRetry(async () => {
    const { data, error } = await (supabase.rpc as any)("get_device_firmware_update_summary", {
      p_app_version: params.appVersion ?? null,
      p_device_id: params.deviceId,
    });

    const row = assertData(
      error,
      ((data ?? []) as DeviceFirmwareUpdateSummaryRow[])[0] ?? null,
      "Failed to load firmware update status.",
    );

    if (!row) {
      throw new Error("Firmware update status is unavailable for this device.");
    }

    return mapDeviceFirmwareUpdateSummaryRow(row);
  });
}

export async function beginFirmwareUpdate(params: {
  deviceId: string;
  releaseId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("begin_firmware_update", {
    p_device_id: params.deviceId,
    p_release_id: params.releaseId,
  });

  const row = assertData(
    error,
    ((data ?? []) as BeginFirmwareUpdateRow[])[0] ?? null,
    "Failed to request the firmware update.",
  );

  if (!row) {
    throw new Error("The firmware update request did not return a status row.");
  }

  return row;
}

export async function queueFriendCelebrationPreviewFromApp(params: {
  boardDays: boolean[][];
  dwellSeconds?: number;
  deviceId: string;
  paletteCustom?: Record<string, string>;
  palettePreset: string;
  requestId: string;
  sourceDeviceId?: string;
  transitionSpeed?: CelebrationTransitionSpeed;
  transitionStyle?: CelebrationTransitionStyle;
  weeklyTarget: number;
  weekTargets?: number[] | null;
}) {
  const supabase = ensureSupabase();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const { data, error } = await (supabase.rpc as any)("queue_device_command", {
    p_device_id: params.deviceId,
    p_kind: "play_friend_celebration",
    p_payload: {
      board_days: params.boardDays,
      dwell_seconds: params.dwellSeconds ?? DEFAULT_CELEBRATION_DWELL_SECONDS,
      expires_at: expiresAt,
      palette_custom: params.paletteCustom ?? {},
      palette_preset: params.palettePreset,
      source_device_id: params.sourceDeviceId ?? "preview",
      transition_speed: params.transitionSpeed ?? DEFAULT_CELEBRATION_TRANSITION_SPEED,
      transition_style: params.transitionStyle ?? DEFAULT_CELEBRATION_TRANSITION,
      weekly_target: params.weeklyTarget,
      week_targets: params.weekTargets ?? null,
    },
    p_request_key: params.requestId,
  });

  return assertData(
    error,
    data as { id: string; status: string },
    "Failed to queue the celebration preview.",
  );
}

export async function updateMembershipReminder(params: {
  patch: TablesUpdate<"device_memberships">;
  userId: string;
  deviceId: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await ((supabase.from("device_memberships") as any)
    .update(params.patch as any)
    .eq("device_id", params.deviceId)
    .eq("user_id", params.userId)
    .eq("role", "owner")
    .eq("status", "approved")
    .select("device_id")
    .single() as any);

  return assertData(error, data as { device_id: string }, "Failed to update reminder settings.");
}

export async function rotateDeviceShareCode(deviceId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("rotate_device_share_code", {
    p_device_id: deviceId,
  });

  return assertData(error, data as ShareCodeRow, "Failed to rotate the share code.");
}

export async function requestDeviceViewAccess(code: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("request_device_view_access", {
    p_code: code,
  });

  return assertData(error, data as ShareRequestRow, "Failed to send the share request.");
}

export async function approveDeviceViewRequest(requestId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("approve_device_view_request", {
    p_request_id: requestId,
  });

  return assertData(error, data as ShareRequestRow, "Failed to approve the share request.");
}

export async function rejectDeviceViewRequest(requestId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("reject_device_view_request", {
    p_request_id: requestId,
  });

  return assertData(error, data as ShareRequestRow, "Failed to reject the share request.");
}

export async function revokeDeviceViewerMembership(params: { deviceId: string; membershipId: string }) {
  const supabase = ensureSupabase();

  if (__DEV__) {
    console.info("[friends] revokeViewer:start", params);
  }

  const directUpdateResponse = await ((supabase.from("device_memberships") as any)
    .update({
      status: "revoked",
    } as TablesUpdate<"device_memberships">)
    .eq("id", params.membershipId)
    .eq("device_id", params.deviceId)
    .eq("role", "viewer")
    .eq("status", "approved")
    .select("*")
    .maybeSingle() as any);

  if (__DEV__) {
    console.info("[friends] revokeViewer:direct-update", {
      dataStatus: (directUpdateResponse.data as MembershipRow | null)?.status ?? null,
      deviceId: params.deviceId,
      error: directUpdateResponse.error?.message ?? null,
      membershipId: params.membershipId,
    });
  }

  if (!directUpdateResponse.error && directUpdateResponse.data) {
    return directUpdateResponse.data as MembershipRow;
  }

  const rpcResponse = await (supabase.rpc as any)("revoke_device_viewer_membership", {
    p_device_id: params.deviceId,
    p_membership_id: params.membershipId,
  });

  if (!rpcResponse.error) {
    if (__DEV__) {
      console.info("[friends] revokeViewer:rpc-success", {
        deviceId: params.deviceId,
        membershipId: params.membershipId,
        status: (rpcResponse.data as MembershipRow | null)?.status ?? null,
      });
    }

    return rpcResponse.data as MembershipRow;
  }

  if (!isMissingRevokeViewerBackendMessage(rpcResponse.error.message)) {
    if (__DEV__) {
      console.info("[friends] revokeViewer:rpc-error", {
        deviceId: params.deviceId,
        error: rpcResponse.error.message,
        membershipId: params.membershipId,
      });
    }

    throw new Error(rpcResponse.error.message);
  }

  if (__DEV__) {
    console.info("[friends] revokeViewer:fallback-update", params);
  }

  const { data, error } = directUpdateResponse;

  if (__DEV__) {
    console.info("[friends] revokeViewer:fallback-result", {
      deviceId: params.deviceId,
      error: error?.message ?? null,
      membershipId: params.membershipId,
      status: (data as MembershipRow | null)?.status ?? null,
    });
  }

  const membership = assertData(error, data as MembershipRow | null, "Failed to remove viewer access.");
  if (!membership) {
    throw new Error("Failed to remove viewer access.");
  }

  return membership;
}

export async function leaveSharedBoard(params: { deviceId: string; membershipId: string }) {
  const supabase = ensureSupabase();

  if (__DEV__) {
    console.info("[friends] leaveSharedBoard:start", params);
  }

  const directUpdateResponse = await ((supabase.from("device_memberships") as any)
    .update({
      status: "revoked",
    } as TablesUpdate<"device_memberships">)
    .eq("id", params.membershipId)
    .eq("device_id", params.deviceId)
    .eq("role", "viewer")
    .eq("status", "approved")
    .select("*")
    .maybeSingle() as any);

  if (__DEV__) {
    console.info("[friends] leaveSharedBoard:direct-update", {
      dataStatus: (directUpdateResponse.data as MembershipRow | null)?.status ?? null,
      deviceId: params.deviceId,
      error: directUpdateResponse.error?.message ?? null,
      membershipId: params.membershipId,
    });
  }

  if (!directUpdateResponse.error && directUpdateResponse.data) {
    return directUpdateResponse.data as MembershipRow;
  }

  const rpcResponse = await (supabase.rpc as any)("leave_shared_board", {
    p_device_id: params.deviceId,
    p_membership_id: params.membershipId,
  });

  if (!rpcResponse.error) {
    if (__DEV__) {
      console.info("[friends] leaveSharedBoard:rpc-success", {
        deviceId: params.deviceId,
        membershipId: params.membershipId,
        status: (rpcResponse.data as MembershipRow | null)?.status ?? null,
      });
    }

    return rpcResponse.data as MembershipRow;
  }

  if (!isMissingLeaveSharedBoardBackendMessage(rpcResponse.error.message)) {
    if (__DEV__) {
      console.info("[friends] leaveSharedBoard:rpc-error", {
        deviceId: params.deviceId,
        error: rpcResponse.error.message,
        membershipId: params.membershipId,
      });
    }

    throw new Error(rpcResponse.error.message);
  }

  if (__DEV__) {
    console.info("[friends] leaveSharedBoard:fallback-update", params);
  }

  const { data, error } = directUpdateResponse;

  if (__DEV__) {
    console.info("[friends] leaveSharedBoard:fallback-result", {
      deviceId: params.deviceId,
      error: error?.message ?? null,
      membershipId: params.membershipId,
      status: (data as MembershipRow | null)?.status ?? null,
    });
  }

  const membership = assertData(error, data as MembershipRow | null, "Failed to remove this shared board.");
  if (!membership) {
    throw new Error("Failed to remove this shared board.");
  }

  return membership;
}

export async function setSharedBoardCelebrationPreferences(params: {
  dwellSeconds?: number;
  deviceId: string;
  enabled?: boolean;
  membershipId: string;
  transitionSpeed?: CelebrationTransitionSpeed;
  transition?: CelebrationTransitionStyle;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("set_shared_board_celebration_preferences", {
    p_dwell_seconds: params.dwellSeconds ?? null,
    p_device_id: params.deviceId,
    p_enabled: params.enabled ?? null,
    p_membership_id: params.membershipId,
    p_transition_speed: params.transitionSpeed ?? null,
    p_transition: params.transition ?? null,
  });

  return assertData(error, data as MembershipRow, "Failed to update celebration preference.");
}
