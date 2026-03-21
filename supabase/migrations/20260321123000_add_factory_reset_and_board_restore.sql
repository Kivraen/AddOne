begin;

alter type public.device_command_kind add value if not exists 'factory_reset';
alter type public.device_command_kind add value if not exists 'restore_board_backup';

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_owner_created_idx
  on public.boards (owner_user_id, created_at desc);

create table if not exists public.board_backups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null unique references public.boards (id) on delete cascade,
  board_days jsonb not null,
  current_week_start date not null,
  today_row integer not null check (today_row between 0 and 6),
  settings jsonb not null default '{}'::jsonb,
  source_device_id uuid references public.devices (id) on delete set null,
  source_snapshot_revision bigint not null default 0,
  source_snapshot_hash text,
  backed_up_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_backups_backed_up_at_idx
  on public.board_backups (backed_up_at desc);

alter table public.devices
  add column if not exists board_id uuid references public.boards (id) on delete set null,
  add column if not exists reset_epoch bigint not null default 0;

create index if not exists devices_board_id_idx
  on public.devices (board_id);

create temp table device_board_mappings on commit drop as
select
  devices.id as device_id,
  gen_random_uuid() as board_id,
  owners.user_id as owner_user_id
from public.devices devices
left join lateral (
  select memberships.user_id
  from public.device_memberships memberships
  where memberships.device_id = devices.id
    and memberships.role = 'owner'
    and memberships.status = 'approved'
  limit 1
) owners on true
where devices.board_id is null
  and owners.user_id is not null;

insert into public.boards (id, owner_user_id, created_at, updated_at)
select mappings.board_id, mappings.owner_user_id, now(), now()
from device_board_mappings mappings
on conflict (id) do nothing;

update public.devices devices
set board_id = mappings.board_id
from device_board_mappings mappings
where devices.id = mappings.device_id
  and devices.board_id is null;

insert into public.board_backups (
  board_id,
  board_days,
  current_week_start,
  today_row,
  settings,
  source_device_id,
  source_snapshot_revision,
  source_snapshot_hash,
  backed_up_at
)
select
  devices.board_id,
  snapshots.board_days,
  snapshots.current_week_start,
  snapshots.today_row,
  snapshots.settings,
  devices.id,
  snapshots.revision,
  snapshots.board_hash,
  snapshots.generated_at
from public.devices devices
join lateral (
  select latest.*
  from public.device_runtime_snapshots latest
  where latest.device_id = devices.id
  order by latest.revision desc, latest.created_at desc
  limit 1
) snapshots on true
where devices.board_id is not null
on conflict (board_id) do update
set
  board_days = excluded.board_days,
  current_week_start = excluded.current_week_start,
  today_row = excluded.today_row,
  settings = excluded.settings,
  source_device_id = excluded.source_device_id,
  source_snapshot_revision = excluded.source_snapshot_revision,
  source_snapshot_hash = excluded.source_snapshot_hash,
  backed_up_at = excluded.backed_up_at,
  updated_at = now();

create trigger set_boards_updated_at
before update on public.boards
for each row
execute function public.set_updated_at();

create trigger set_board_backups_updated_at
before update on public.board_backups
for each row
execute function public.set_updated_at();

alter table public.boards enable row level security;
alter table public.board_backups enable row level security;

create policy "boards_select_own"
on public.boards
for select
using (owner_user_id = auth.uid());

create policy "board_backups_select_own"
on public.board_backups
for select
using (
  exists (
    select 1
    from public.boards boards
    where boards.id = board_backups.board_id
      and boards.owner_user_id = auth.uid()
  )
);

create or replace function public.create_board_for_owner(
  p_owner_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_board_id uuid := gen_random_uuid();
begin
  if p_owner_user_id is null then
    raise exception 'Board owner is required.';
  end if;

  insert into public.boards (id, owner_user_id)
  values (next_board_id, p_owner_user_id);

  return next_board_id;
end;
$$;

drop function if exists public.claim_device_for_user(uuid, text, text, text, text);

create or replace function public.claim_device_for_user(
  p_owner_user_id uuid,
  p_hardware_uid text,
  p_name text default null,
  p_hardware_profile text default null,
  p_firmware_version text default null,
  p_reset_epoch bigint default 0
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_hardware_uid text := nullif(trim(p_hardware_uid), '');
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  normalized_profile text := nullif(trim(coalesce(p_hardware_profile, '')), '');
  normalized_firmware text := nullif(trim(coalesce(p_firmware_version, '')), '');
  requested_reset_epoch bigint := greatest(coalesce(p_reset_epoch, 0), 0);
  claimed_device public.devices;
  current_owner_user_id uuid;
  target_board_id uuid;
  requires_reset_reassignment boolean := false;
begin
  if p_owner_user_id is null then
    raise exception 'Owner user is required.';
  end if;

  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  select *
  into claimed_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if found then
    select memberships.user_id
    into current_owner_user_id
    from public.device_memberships memberships
    where memberships.device_id = claimed_device.id
      and memberships.role = 'owner'
      and memberships.status = 'approved'
    limit 1;

    if current_owner_user_id is not null and current_owner_user_id <> p_owner_user_id and requested_reset_epoch <= claimed_device.reset_epoch then
      raise exception 'Device is already claimed by another owner.';
    end if;

    requires_reset_reassignment := requested_reset_epoch > claimed_device.reset_epoch;

    if requires_reset_reassignment then
      update public.device_memberships memberships
      set
        status = 'revoked',
        approved_at = coalesce(memberships.approved_at, now()),
        approved_by_user_id = coalesce(memberships.approved_by_user_id, p_owner_user_id)
      where memberships.device_id = claimed_device.id
        and memberships.status = 'approved';

      update public.device_share_requests requests
      set
        status = 'cancelled',
        responded_at = coalesce(requests.responded_at, now()),
        approved_by_user_id = coalesce(requests.approved_by_user_id, p_owner_user_id)
      where requests.device_id = claimed_device.id
        and requests.status = 'pending';

      update public.device_share_codes share_codes
      set
        is_active = false,
        expires_at = coalesce(share_codes.expires_at, now())
      where share_codes.device_id = claimed_device.id;

      target_board_id := public.create_board_for_owner(p_owner_user_id);
    else
      target_board_id := coalesce(
        claimed_device.board_id,
        public.create_board_for_owner(coalesce(current_owner_user_id, p_owner_user_id))
      );
    end if;

    update public.devices devices
    set
      board_id = target_board_id,
      reset_epoch = greatest(devices.reset_epoch, requested_reset_epoch),
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version),
      last_seen_at = coalesce(devices.last_seen_at, now())
    where devices.id = claimed_device.id
    returning * into claimed_device;
  else
    target_board_id := public.create_board_for_owner(p_owner_user_id);

    insert into public.devices (
      board_id,
      hardware_uid,
      hardware_profile,
      name,
      firmware_version,
      last_seen_at,
      reset_epoch
    )
    values (
      target_board_id,
      normalized_hardware_uid,
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, 'unknown'),
      now(),
      requested_reset_epoch
    )
    returning * into claimed_device;
  end if;

  insert into public.device_memberships (
    device_id,
    user_id,
    role,
    status,
    approved_by_user_id,
    approved_at
  )
  values (
    claimed_device.id,
    p_owner_user_id,
    'owner',
    'approved',
    p_owner_user_id,
    now()
  )
  on conflict (device_id, user_id) do update
  set
    role = 'owner',
    status = 'approved',
    approved_by_user_id = excluded.approved_by_user_id,
    approved_at = coalesce(public.device_memberships.approved_at, excluded.approved_at);

  insert into public.device_share_codes (device_id, code, created_by_user_id, is_active, expires_at)
  values (claimed_device.id, public.generate_share_code(), p_owner_user_id, true, null)
  on conflict (device_id) do update
  set
    code = public.generate_share_code(),
    is_active = true,
    expires_at = null,
    created_by_user_id = excluded.created_by_user_id;

  return claimed_device;
end;
$$;

drop function if exists public.claim_device(text, text, text);

create or replace function public.claim_device(
  p_hardware_uid text,
  p_name text default null,
  p_hardware_profile text default null,
  p_reset_epoch bigint default 0
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  return public.claim_device_for_user(
    p_owner_user_id => auth.uid(),
    p_hardware_uid => p_hardware_uid,
    p_name => p_name,
    p_hardware_profile => p_hardware_profile,
    p_reset_epoch => p_reset_epoch
  );
end;
$$;

drop function if exists public.redeem_device_onboarding_claim(text, text, text, text, text, text);

create or replace function public.redeem_device_onboarding_claim(
  p_claim_token text,
  p_hardware_uid text,
  p_hardware_profile text default null,
  p_firmware_version text default null,
  p_name text default null,
  p_device_auth_token text default null,
  p_reset_epoch bigint default 0
)
returns public.device_onboarding_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_session public.device_onboarding_sessions;
  claimed_device public.devices;
  normalized_token text := nullif(trim(coalesce(p_claim_token, '')), '');
  normalized_device_auth_token text := nullif(trim(coalesce(p_device_auth_token, '')), '');
begin
  if normalized_token is null then
    raise exception 'Claim token is required.';
  end if;

  select *
  into current_session
  from public.device_onboarding_sessions sessions
  where sessions.claim_token_hash = public.hash_claim_token(normalized_token)
    and sessions.status in ('awaiting_ap', 'awaiting_cloud')
  for update;

  if not found then
    raise exception 'Onboarding session is invalid or already used.';
  end if;

  if current_session.expires_at <= now() then
    update public.device_onboarding_sessions sessions
    set
      status = 'expired',
      last_error = coalesce(sessions.last_error, 'Session expired before the claim was redeemed.')
    where sessions.id = current_session.id
    returning * into current_session;

    return current_session;
  end if;

  claimed_device := public.claim_device_for_user(
    p_owner_user_id => current_session.user_id,
    p_hardware_uid => p_hardware_uid,
    p_name => p_name,
    p_hardware_profile => coalesce(nullif(trim(coalesce(p_hardware_profile, '')), ''), current_session.hardware_profile_hint),
    p_firmware_version => p_firmware_version,
    p_reset_epoch => p_reset_epoch
  );

  update public.devices devices
  set
    timezone = coalesce(current_session.bootstrap_timezone, devices.timezone),
    day_reset_time = coalesce(current_session.bootstrap_day_reset_time, devices.day_reset_time)
  where devices.id = claimed_device.id
  returning * into claimed_device;

  if normalized_device_auth_token is not null then
    update public.devices devices
    set device_auth_token_hash = coalesce(devices.device_auth_token_hash, public.hash_claim_token(normalized_device_auth_token))
    where devices.id = claimed_device.id
    returning * into claimed_device;
  end if;

  update public.device_onboarding_sessions sessions
  set
    device_id = claimed_device.id,
    status = 'claimed',
    waiting_for_device_at = coalesce(sessions.waiting_for_device_at, now()),
    claimed_at = now(),
    last_error = null
  where sessions.id = current_session.id
  returning * into current_session;

  return current_session;
end;
$$;

create or replace function public.queue_device_command(
  p_device_id uuid,
  p_kind public.device_command_kind,
  p_payload jsonb default '{}'::jsonb,
  p_request_key text default null
)
returns public.device_commands
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_command public.device_commands;
  normalized_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  target_local_date text := nullif(normalized_payload ->> 'local_date', '');
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can queue device commands.';
  end if;

  if p_request_key is not null then
    select *
    into queued_command
    from public.device_commands commands
    where commands.request_key = p_request_key;

    if found then
      return queued_command;
    end if;
  end if;

  if p_kind = 'set_day_state' and target_local_date is not null then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer day-state request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'set_day_state'
      and commands.payload ->> 'local_date' = target_local_date;
  elsif p_kind = 'apply_history_draft' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer history draft.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'apply_history_draft';
  elsif p_kind = 'apply_device_settings' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer settings draft.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'apply_device_settings';
  elsif p_kind = 'request_runtime_snapshot' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer runtime refresh request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'request_runtime_snapshot';
  elsif p_kind = 'enter_wifi_recovery' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer Wi-Fi recovery request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'enter_wifi_recovery';
  elsif p_kind = 'factory_reset' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer factory reset request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'factory_reset';
  elsif p_kind = 'restore_board_backup' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer restore request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'restore_board_backup';
  end if;

  insert into public.device_commands (
    device_id,
    kind,
    payload,
    requested_by_user_id,
    request_key
  )
  values (
    p_device_id,
    p_kind,
    normalized_payload,
    auth.uid(),
    p_request_key
  )
  returning * into queued_command;

  return queued_command;
end;
$$;

create or replace function public.request_device_factory_reset_from_app(
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_command public.device_commands;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can factory reset this device from the app.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'factory_reset',
    p_payload => jsonb_build_object(),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.list_restorable_board_backups_for_user(
  p_device_id uuid default null
)
returns table (
  backup_id uuid,
  board_id uuid,
  board_name text,
  backed_up_at timestamptz,
  source_device_id uuid,
  source_device_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  excluded_board_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_device_id is not null then
    if not public.is_device_owner(p_device_id) then
      raise exception 'Only the owner can list restore candidates for this device.';
    end if;

    select devices.board_id
    into excluded_board_id
    from public.devices devices
    where devices.id = p_device_id;
  end if;

  return query
  select
    backups.id as backup_id,
    backups.board_id,
    coalesce(nullif(trim(backups.settings ->> 'name'), ''), 'AddOne') as board_name,
    backups.backed_up_at,
    backups.source_device_id,
    source_devices.name as source_device_name
  from public.board_backups backups
  join public.boards boards
    on boards.id = backups.board_id
  left join public.devices source_devices
    on source_devices.id = backups.source_device_id
  where boards.owner_user_id = auth.uid()
    and (excluded_board_id is null or backups.board_id <> excluded_board_id)
  order by backups.backed_up_at desc;
end;
$$;

create or replace function public.restore_board_backup_to_device(
  p_backup_id uuid,
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_command public.device_commands;
  target_device public.devices;
  target_backup public.board_backups;
  previous_board_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can restore a board backup to this device.';
  end if;

  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  select *
  into target_backup
  from public.board_backups backups
  where backups.id = p_backup_id
  for update;

  if not found then
    raise exception 'Board backup not found.';
  end if;

  if not exists (
    select 1
    from public.boards boards
    where boards.id = target_backup.board_id
      and boards.owner_user_id = auth.uid()
  ) then
    raise exception 'You do not have access to that board backup.';
  end if;

  previous_board_id := target_device.board_id;

  update public.devices devices
  set board_id = null
  where devices.board_id = target_backup.board_id
    and devices.id <> target_device.id;

  update public.devices devices
  set board_id = target_backup.board_id
  where devices.id = target_device.id
  returning * into target_device;

  if previous_board_id is not null and previous_board_id <> target_backup.board_id then
    update public.boards boards
    set archived_at = coalesce(boards.archived_at, now())
    where boards.id = previous_board_id
      and not exists (
        select 1
        from public.devices devices
        where devices.board_id = boards.id
      );
  end if;

  update public.boards boards
  set archived_at = null
  where boards.id = target_backup.board_id;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'restore_board_backup',
    p_payload => jsonb_build_object(
      'backup_id', target_backup.id,
      'board_id', target_backup.board_id,
      'board_days', target_backup.board_days,
      'current_week_start', target_backup.current_week_start,
      'today_row', target_backup.today_row,
      'settings', target_backup.settings,
      'source_snapshot_revision', target_backup.source_snapshot_revision
    ),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'board_id', target_backup.board_id,
    'command_id', queued_command.id,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.upload_device_runtime_snapshot(
  p_hardware_uid text,
  p_device_auth_token text,
  p_revision bigint,
  p_current_week_start date,
  p_today_row integer,
  p_board_days jsonb,
  p_settings jsonb default '{}'::jsonb,
  p_board_hash text default null,
  p_generated_at timestamptz default now()
)
returns public.device_runtime_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  snapshot_row public.device_runtime_snapshots;
  week_entry jsonb;
  visible_until date;
  oldest_visible date;
  week_index integer;
  day_index integer;
  local_date date;
  desired_state boolean;
  normalized_hash text := nullif(trim(coalesce(p_board_hash, '')), '');
  normalized_settings jsonb := coalesce(p_settings, '{}'::jsonb);
  next_name text := nullif(trim(coalesce(normalized_settings ->> 'name', '')), '');
  next_timezone text := nullif(trim(coalesce(normalized_settings ->> 'timezone', '')), '');
  next_day_reset_time time := nullif(trim(coalesce(normalized_settings ->> 'day_reset_time', '')), '')::time;
  next_weekly_target smallint := nullif(trim(coalesce(normalized_settings ->> 'weekly_target', '')), '')::smallint;
  next_palette_preset text := nullif(trim(coalesce(normalized_settings ->> 'palette_preset', '')), '');
  next_palette_custom jsonb := case
    when normalized_settings ? 'palette_custom' and jsonb_typeof(normalized_settings -> 'palette_custom') = 'object'
      then normalized_settings -> 'palette_custom'
    else null
  end;
  next_reward_enabled boolean := case when normalized_settings ? 'reward_enabled' then (normalized_settings ->> 'reward_enabled')::boolean else null end;
  next_reward_type public.device_reward_type := nullif(trim(coalesce(normalized_settings ->> 'reward_type', '')), '')::public.device_reward_type;
  next_reward_trigger public.device_reward_trigger := nullif(trim(coalesce(normalized_settings ->> 'reward_trigger', '')), '')::public.device_reward_trigger;
  next_brightness smallint := nullif(trim(coalesce(normalized_settings ->> 'brightness', '')), '')::smallint;
  next_ambient_auto boolean := case when normalized_settings ? 'ambient_auto' then (normalized_settings ->> 'ambient_auto')::boolean else null end;
begin
  if p_revision < 0 then
    raise exception 'Snapshot revision must be non-negative.';
  end if;

  if p_current_week_start is null then
    raise exception 'Current week start is required.';
  end if;

  if p_today_row < 0 or p_today_row > 6 then
    raise exception 'today_row must be between 0 and 6.';
  end if;

  if normalized_settings ? 'palette_custom' and jsonb_typeof(normalized_settings -> 'palette_custom') <> 'object' then
    raise exception 'palette_custom must be a JSON object when provided.';
  end if;

  if jsonb_typeof(p_board_days) <> 'array' or jsonb_array_length(p_board_days) <> 21 then
    raise exception 'board_days must be a 21-column JSON array.';
  end if;

  for week_entry in
    select value
    from jsonb_array_elements(p_board_days)
  loop
    if jsonb_typeof(week_entry) <> 'array' or jsonb_array_length(week_entry) <> 7 then
      raise exception 'Each board_days week entry must be a 7-row JSON array.';
    end if;
  end loop;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  if normalized_hash is null then
    normalized_hash := md5(p_board_days::text || normalized_settings::text);
  end if;

  if p_revision < coalesce(authenticated_device.last_runtime_revision, 0) then
    select *
    into snapshot_row
    from public.device_runtime_snapshots snapshots
    where snapshots.device_id = authenticated_device.id
    order by snapshots.revision desc, snapshots.created_at desc
    limit 1;

    if found then
      return snapshot_row;
    end if;
  end if;

  insert into public.device_runtime_snapshots as snapshots (
    device_id,
    revision,
    current_week_start,
    today_row,
    board_days,
    settings,
    board_hash,
    generated_at
  )
  values (
    authenticated_device.id,
    p_revision,
    p_current_week_start,
    p_today_row,
    p_board_days,
    normalized_settings,
    normalized_hash,
    p_generated_at
  )
  on conflict (device_id, revision) do update
  set
    current_week_start = excluded.current_week_start,
    today_row = excluded.today_row,
    board_days = excluded.board_days,
    settings = excluded.settings,
    board_hash = excluded.board_hash,
    generated_at = greatest(snapshots.generated_at, excluded.generated_at)
  returning * into snapshot_row;

  oldest_visible := p_current_week_start - 140;
  visible_until := p_current_week_start + 6;

  delete from public.device_day_states states
  where states.device_id = authenticated_device.id
    and states.local_date between oldest_visible and visible_until;

  for week_index in 0..20 loop
    for day_index in 0..6 loop
      local_date := p_current_week_start - (week_index * 7) + day_index;
      desired_state := coalesce((p_board_days -> week_index ->> day_index)::boolean, false);

      insert into public.device_day_states (
        device_id,
        local_date,
        is_done,
        effective_at,
        updated_from,
        updated_by_user_id
      )
      values (
        authenticated_device.id,
        local_date,
        desired_state,
        p_generated_at,
        'device',
        null
      );
    end loop;
  end loop;

  update public.devices devices
  set
    name = coalesce(next_name, devices.name),
    timezone = coalesce(next_timezone, devices.timezone),
    day_reset_time = coalesce(next_day_reset_time, devices.day_reset_time),
    weekly_target = coalesce(next_weekly_target, devices.weekly_target),
    palette_preset = coalesce(next_palette_preset, devices.palette_preset),
    palette_custom = coalesce(next_palette_custom, devices.palette_custom),
    reward_enabled = coalesce(next_reward_enabled, devices.reward_enabled),
    reward_type = coalesce(next_reward_type, devices.reward_type),
    reward_trigger = coalesce(next_reward_trigger, devices.reward_trigger),
    brightness = coalesce(next_brightness, devices.brightness),
    ambient_auto = coalesce(next_ambient_auto, devices.ambient_auto),
    last_runtime_revision = greatest(coalesce(devices.last_runtime_revision, 0), p_revision),
    last_seen_at = now(),
    last_snapshot_at = p_generated_at,
    last_snapshot_hash = normalized_hash,
    last_sync_at = now()
  where devices.id = authenticated_device.id
  returning * into authenticated_device;

  if authenticated_device.board_id is not null then
    insert into public.board_backups as backups (
      board_id,
      board_days,
      current_week_start,
      today_row,
      settings,
      source_device_id,
      source_snapshot_revision,
      source_snapshot_hash,
      backed_up_at
    )
    values (
      authenticated_device.board_id,
      p_board_days,
      p_current_week_start,
      p_today_row,
      normalized_settings,
      authenticated_device.id,
      p_revision,
      normalized_hash,
      p_generated_at
    )
    on conflict (board_id) do update
    set
      board_days = excluded.board_days,
      current_week_start = excluded.current_week_start,
      today_row = excluded.today_row,
      settings = excluded.settings,
      source_device_id = excluded.source_device_id,
      source_snapshot_revision = excluded.source_snapshot_revision,
      source_snapshot_hash = excluded.source_snapshot_hash,
      backed_up_at = excluded.backed_up_at,
      updated_at = now();
  end if;

  return snapshot_row;
end;
$$;

revoke all on function public.request_device_factory_reset_from_app(uuid, uuid) from public;
grant execute on function public.request_device_factory_reset_from_app(uuid, uuid) to authenticated;

revoke all on function public.list_restorable_board_backups_for_user(uuid) from public;
grant execute on function public.list_restorable_board_backups_for_user(uuid) to authenticated;

revoke all on function public.restore_board_backup_to_device(uuid, uuid, uuid) from public;
grant execute on function public.restore_board_backup_to_device(uuid, uuid, uuid) to authenticated;

revoke all on function public.claim_device_for_user(uuid, text, text, text, text, bigint) from public;

commit;
