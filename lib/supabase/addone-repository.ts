import { paletteById } from "@/constants/palettes";
import {
  AddOneDevice,
  BoardPalette,
  DeviceSettingsPatch,
  DeviceOnboardingSession,
  DeviceSharingState,
  DeviceShareRequest,
  DeviceViewer,
  HistoryDraftUpdate,
  SharedBoard,
  SyncState,
  WeekStart,
} from "@/types/addone";
import { Database, Enums, Json, Tables, TablesUpdate } from "@/lib/supabase/database.types";
import { getSupabaseClient } from "@/lib/supabase";

type DeviceRow = Tables<"devices"> & {
  last_runtime_revision?: number | null;
  last_snapshot_at?: string | null;
  last_snapshot_hash?: string | null;
};
type MembershipRow = Tables<"device_memberships">;
type RuntimeSnapshotRow = Tables<"device_runtime_snapshots">;
type CommandRow = Tables<"device_commands">;
type DeviceOnboardingSessionRow = Tables<"device_onboarding_sessions">;
type ProfileRow = Tables<"profiles">;
type ShareCodeRow = Tables<"device_share_codes">;
type ShareRequestRow = Tables<"device_share_requests">;
type CreateDeviceOnboardingSessionRow = Database["public"]["Functions"]["create_device_onboarding_session"]["Returns"][number];
type ShareRequestListRow = Database["public"]["Functions"]["list_device_share_requests"]["Returns"][number];
type ViewerListRow = Database["public"]["Functions"]["list_device_viewers"]["Returns"][number];

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

  const [name] = email.split("@");
  return name || "AddOne User";
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

function deviceSeemsOnline(device: Pick<DeviceRow, "last_seen_at" | "last_sync_at">) {
  const lastSeenAt = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
  const lastSyncAt = device.last_sync_at ? new Date(device.last_sync_at).getTime() : 0;
  const now = Date.now();

  return Boolean((lastSeenAt && now - lastSeenAt < 45_000) || (lastSyncAt && now - lastSyncAt < 45_000));
}

function deriveSyncState(device: DeviceRow): SyncState {
  if (deviceSeemsOnline(device)) {
    return "online";
  }

  return "offline";
}

function normalizeWeekStart(weekStart: WeekStart): Exclude<WeekStart, "locale"> {
  if (weekStart === "sunday") {
    return "sunday";
  }

  return "monday";
}

function getWeekStartOffset(weekStart: WeekStart): 0 | 1 {
  if (normalizeWeekStart(weekStart) === "monday") {
    return 1;
  }

  return 0;
}

function toUtcDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function toLocalDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(localDate: string, offset: number) {
  const next = toUtcDate(localDate);
  next.setUTCDate(next.getUTCDate() + offset);
  return toLocalDateString(next);
}

function diffDays(fromDate: string, toDate: string) {
  return Math.round((toUtcDate(toDate).getTime() - toUtcDate(fromDate).getTime()) / 86_400_000);
}

function getTimeZoneParts(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    year: Number(values.year),
  };
}

function getLogicalToday(timezone: string, resetTime: string) {
  const parts = getTimeZoneParts(timezone);
  let localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const [resetHourRaw, resetMinuteRaw] = stripSeconds(resetTime).split(":");
  const resetHour = Number(resetHourRaw);
  const resetMinute = Number(resetMinuteRaw);

  if (parts.hour < resetHour || (parts.hour === resetHour && parts.minute < resetMinute)) {
    localDate = addDays(localDate, -1);
  }

  return localDate;
}

function startOfWeek(localDate: string, weekStart: WeekStart) {
  const date = toUtcDate(localDate);
  const day = date.getUTCDay();
  const weekStartDay = getWeekStartOffset(weekStart);
  const delta = (day - weekStartDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() - delta);
  return toLocalDateString(date);
}

function coercePalette(json: Json): Partial<BoardPalette> | undefined {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return undefined;
  }

  return json as Partial<BoardPalette>;
}

function buildBoardFrame(device: Pick<DeviceRow, "day_reset_time" | "timezone" | "week_start">) {
  const todayDate = getLogicalToday(device.timezone, device.day_reset_time);
  const currentWeekStart = startOfWeek(todayDate, normalizeWeekStart(device.week_start));
  const dateGrid = Array.from({ length: 21 }, (_, weekIndex) => {
    const weekStartDate = addDays(currentWeekStart, weekIndex * -7);
    return Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStartDate, dayIndex));
  });

  return {
    dateGrid,
    todayDate,
    todayDayIndex: diffDays(currentWeekStart, todayDate),
  };
}

function buildEmptyDays(dateGrid: string[][]) {
  return dateGrid.map((week) => week.map(() => false));
}

function buildBoardFrameFromSnapshot(snapshot: Pick<RuntimeSnapshotRow, "current_week_start" | "today_row">) {
  const currentWeekStart = snapshot.current_week_start;
  const dateGrid = Array.from({ length: 21 }, (_, weekIndex) => {
    const weekStartDate = addDays(currentWeekStart, weekIndex * -7);
    return Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStartDate, dayIndex));
  });

  return {
    dateGrid,
    todayDayIndex: snapshot.today_row,
  };
}

function parseSnapshotBoardDays(snapshot: Pick<RuntimeSnapshotRow, "board_days">) {
  if (!Array.isArray(snapshot.board_days) || snapshot.board_days.length !== 21) {
    return null;
  }

  const days = snapshot.board_days.map((week) => {
    if (!Array.isArray(week) || week.length !== 7) {
      return null;
    }

    return week.map((day) => Boolean(day));
  });

  return days.every(Boolean) ? (days as boolean[][]) : null;
}

function paletteIdForDevice(device: DeviceRow) {
  return paletteById[device.palette_preset] ? device.palette_preset : "classic";
}

function mapDeviceRowToAppDevice(input: {
  currentUserName: string;
  device: DeviceRow;
  membership: MembershipWithDevice;
  snapshot?: RuntimeSnapshotRow | null;
  sharedViewers: number;
}): AddOneDevice {
  const { currentUserName, device, membership, sharedViewers, snapshot } = input;
  const snapshotDays = snapshot ? parseSnapshotBoardDays(snapshot) : null;
  const snapshotFrame = snapshot ? buildBoardFrameFromSnapshot(snapshot) : null;
  const fallbackFrame = buildBoardFrame(device);
  const dateGrid = snapshotFrame?.dateGrid ?? fallbackFrame.dateGrid;
  const todayDayIndex = snapshotFrame?.todayDayIndex ?? fallbackFrame.todayDayIndex;
  const days = snapshotDays ?? buildEmptyDays(dateGrid);

  return {
    id: device.id,
    isLive: deviceSeemsOnline(device),
    lastSnapshotAt: snapshot?.generated_at ?? device.last_snapshot_at ?? null,
    name: device.name,
    ownerName: currentUserName,
    runtimeRevision: Number(snapshot?.revision ?? device.last_runtime_revision ?? 0),
    syncState: deriveSyncState(device),
    weeklyTarget: device.weekly_target,
    weekStart: normalizeWeekStart(device.week_start),
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
    sharedViewers,
    days,
    dateGrid,
    today: {
      weekIndex: 0,
      dayIndex: todayDayIndex,
    },
  };
}

function mapDeviceRowToSharedBoard(input: {
  device: DeviceRow;
  ownerName: string;
  snapshot?: RuntimeSnapshotRow | null;
}): SharedBoard {
  const { device, ownerName, snapshot } = input;
  const snapshotDays = snapshot ? parseSnapshotBoardDays(snapshot) : null;
  const snapshotFrame = snapshot ? buildBoardFrameFromSnapshot(snapshot) : null;
  const fallbackFrame = buildBoardFrame(device);
  const dateGrid = snapshotFrame?.dateGrid ?? fallbackFrame.dateGrid;
  const todayDayIndex = snapshotFrame?.todayDayIndex ?? fallbackFrame.todayDayIndex;

  return {
    id: device.id,
    ownerName,
    habitName: device.name,
    lastSnapshotAt: snapshot?.generated_at ?? device.last_snapshot_at ?? null,
    syncState: deriveSyncState(device),
    weeklyTarget: device.weekly_target,
    paletteId: paletteIdForDevice(device),
    days: snapshotDays ?? buildEmptyDays(dateGrid),
    dateGrid,
    today: {
      weekIndex: 0,
      dayIndex: todayDayIndex,
    },
  };
}

async function fetchLatestRuntimeSnapshots(deviceIds: string[]) {
  if (deviceIds.length === 0) {
    return [] as RuntimeSnapshotRow[];
  }

  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("device_runtime_snapshots")
    .select("*")
    .in("device_id", deviceIds)
    .order("revision", { ascending: false });

  return assertData(error, (data ?? []) as RuntimeSnapshotRow[], "Failed to load device runtime snapshots.");
}

async function fetchProfiles(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as ProfileRow[];
  }

  const supabase = ensureSupabase();
  const { data, error } = await supabase.from("profiles").select("*").in("user_id", userIds);
  return assertData(error, (data ?? []) as ProfileRow[], "Failed to load profiles.");
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
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileRow | null) ?? null;
}

export async function fetchOwnedDevices(params: { userEmail?: string | null; userId: string }) {
  const { userEmail, userId } = params;
  const supabase = ensureSupabase();
  const currentUserProfile = await fetchProfile(userId).catch(() => null);
  const currentUserName = currentUserProfile?.display_name ?? displayNameFromEmail(userEmail);

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

  const [snapshots, viewerRows] = await Promise.all([
    fetchLatestRuntimeSnapshots(deviceIds),
    supabase
      .from("device_memberships")
      .select("device_id, user_id")
      .in("device_id", deviceIds)
      .eq("role", "viewer")
      .eq("status", "approved"),
  ]);

  const viewerData = assertData(
    viewerRows.error,
    (viewerRows.data ?? []) as Array<Pick<MembershipRow, "device_id" | "user_id">>,
    "Failed to load viewer counts.",
  );
  const snapshotByDevice = snapshots.reduce<Record<string, RuntimeSnapshotRow>>((accumulator, row) => {
    accumulator[row.device_id] ??= row;
    return accumulator;
  }, {});

  const viewerCountByDevice = viewerData.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.device_id] = (accumulator[row.device_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return memberships.map((membership) =>
    mapDeviceRowToAppDevice({
      currentUserName,
      device: membership.device as DeviceRow,
      membership,
      snapshot: snapshotByDevice[membership.device_id] ?? null,
      sharedViewers: viewerCountByDevice[membership.device_id] ?? 0,
    }),
  );
}

export async function fetchSharedBoards(userId: string) {
  const supabase = ensureSupabase();
  const membershipsResponse = await supabase
    .from("device_memberships")
    .select("device_id, device:devices(*)")
    .eq("user_id", userId)
    .eq("role", "viewer")
    .eq("status", "approved");

  const memberships = assertData(
    membershipsResponse.error,
    (membershipsResponse.data ?? []) as Array<{ device_id: string; device: DeviceRow | null }>,
    "Failed to load shared boards.",
  ).filter((row) => row.device);

  const devices = memberships.map((row) => row.device as DeviceRow);
  const deviceIds = devices.map((device) => device.id);

  if (deviceIds.length === 0) {
    return [] as SharedBoard[];
  }

  const [snapshots, ownerMembershipsResponse] = await Promise.all([
    fetchLatestRuntimeSnapshots(deviceIds),
    supabase
      .from("device_memberships")
      .select("device_id, user_id")
      .in("device_id", deviceIds)
      .eq("role", "owner")
      .eq("status", "approved"),
  ]);

  const ownerMemberships = assertData(
    ownerMembershipsResponse.error,
    (ownerMembershipsResponse.data ?? []) as Array<Pick<MembershipRow, "device_id" | "user_id">>,
    "Failed to load shared board owners.",
  );
  const profiles = await fetchProfiles(ownerMemberships.map((membership) => membership.user_id));

  const ownerByDeviceId = ownerMemberships.reduce<Record<string, string>>((accumulator, membership) => {
    const profile = profiles.find((entry) => entry.user_id === membership.user_id);
    accumulator[membership.device_id] = profile?.display_name ?? "AddOne User";
    return accumulator;
  }, {});

  const snapshotByDevice = snapshots.reduce<Record<string, RuntimeSnapshotRow>>((accumulator, row) => {
    accumulator[row.device_id] ??= row;
    return accumulator;
  }, {});

  return devices.map((device) =>
    mapDeviceRowToSharedBoard({
      device,
      ownerName: ownerByDeviceId[device.id] ?? "AddOne User",
      snapshot: snapshotByDevice[device.id] ?? null,
    }),
  );
}

export async function fetchDeviceSharing(deviceId: string): Promise<DeviceSharingState> {
  const supabase = ensureSupabase();

  const [shareCodeResponse, requestsResponse, viewersResponse] = await Promise.all([
    supabase.from("device_share_codes").select("*").eq("device_id", deviceId).maybeSingle(),
    (supabase.rpc as any)("list_device_share_requests", { p_device_id: deviceId }),
    (supabase.rpc as any)("list_device_viewers", { p_device_id: deviceId }),
  ]);

  const shareCode = assertData(
    shareCodeResponse.error,
    (shareCodeResponse.data as ShareCodeRow | null) ?? null,
    "Failed to load share code.",
  );
  const pendingRequests = assertData(
    requestsResponse.error,
    (requestsResponse.data ?? []) as ShareRequestListRow[],
    "Failed to load share requests.",
  ).map(mapShareRequestRow);
  const viewers = assertData(
    viewersResponse.error,
    (viewersResponse.data ?? []) as ViewerListRow[],
    "Failed to load viewers.",
  ).map(mapViewerRow);

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

export async function redeemDeviceOnboardingClaimForTesting(params: {
  claimToken: string;
  firmwareVersion?: string;
  hardwareProfile?: string;
  hardwareUid: string;
  name?: string;
}) {
  const supabase = ensureSupabase();
  const { data, error } = await (supabase.rpc as any)("redeem_device_onboarding_claim", {
    p_claim_token: params.claimToken,
    p_firmware_version: params.firmwareVersion,
    p_hardware_profile: params.hardwareProfile,
    p_hardware_uid: params.hardwareUid,
    p_name: params.name,
  });

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
  deviceId: string;
  draftId: string;
  updates: HistoryDraftUpdate[];
}) {
  const supabase = ensureSupabase();
  const updates = params.updates.map((update) => ({
    is_done: update.isDone,
    local_date: update.localDate,
  }));

  const { data, error } = await (supabase.rpc as any)("apply_history_draft_from_app", {
    p_base_revision: params.baseRevision,
    p_device_id: params.deviceId,
    p_updates: updates,
    p_draft_id: params.draftId,
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
