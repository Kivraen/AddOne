begin;

alter type public.device_command_kind add value if not exists 'reset_history';

do $$
begin
  create type public.device_recovery_state as enum ('ready', 'needs_recovery', 'recovering');
exception
  when duplicate_object then null;
end
$$;

alter table public.boards
  add column if not exists active_history_era integer not null default 1,
  add column if not exists history_era_started_at timestamptz not null default now();

update public.boards
set
  active_history_era = greatest(coalesce(active_history_era, 1), 1),
  history_era_started_at = coalesce(history_era_started_at, created_at, now());

alter table public.devices
  add column if not exists recovery_state public.device_recovery_state not null default 'ready',
  add column if not exists last_factory_reset_at timestamptz;

alter table public.device_day_events
  add column if not exists history_era integer;

alter table public.device_day_states
  add column if not exists history_era integer;

alter table public.device_runtime_snapshots
  add column if not exists history_era integer;

alter table public.board_backups
  add column if not exists history_era integer,
  add column if not exists backup_day date;

update public.device_day_events events
set history_era = coalesce(boards.active_history_era, 1)
from public.devices devices
left join public.boards boards
  on boards.id = devices.board_id
where devices.id = events.device_id
  and events.history_era is null;

update public.device_day_states states
set history_era = coalesce(boards.active_history_era, 1)
from public.devices devices
left join public.boards boards
  on boards.id = devices.board_id
where devices.id = states.device_id
  and states.history_era is null;

update public.device_runtime_snapshots snapshots
set history_era = coalesce(boards.active_history_era, 1)
from public.devices devices
left join public.boards boards
  on boards.id = devices.board_id
where devices.id = snapshots.device_id
  and snapshots.history_era is null;

update public.board_backups backups
set
  history_era = coalesce(boards.active_history_era, 1),
  backup_day = coalesce(backups.backup_day, timezone('utc', backups.backed_up_at)::date)
from public.boards boards
where boards.id = backups.board_id
  and (backups.history_era is null or backups.backup_day is null);

alter table public.device_day_events
  alter column history_era set not null;

alter table public.device_day_states
  alter column history_era set not null;

alter table public.device_runtime_snapshots
  alter column history_era set not null;

alter table public.board_backups
  alter column history_era set not null,
  alter column backup_day set not null;

alter table public.device_day_states
  drop constraint if exists device_day_states_pkey;

alter table public.device_day_states
  add primary key (device_id, history_era, local_date);

alter table public.board_backups
  drop constraint if exists board_backups_board_id_key;

drop index if exists board_backups_backed_up_at_idx;

create unique index if not exists board_backups_board_era_day_uidx
  on public.board_backups (board_id, history_era, backup_day);

create index if not exists board_backups_board_era_backed_up_idx
  on public.board_backups (board_id, history_era, backed_up_at desc);

create index if not exists board_backups_backed_up_at_idx
  on public.board_backups (backed_up_at desc);

create index if not exists device_day_states_device_era_date_idx
  on public.device_day_states (device_id, history_era, local_date desc);

create index if not exists device_day_events_device_era_date_idx
  on public.device_day_events (device_id, history_era, local_date desc, effective_at desc);

create index if not exists device_runtime_snapshots_device_era_generated_idx
  on public.device_runtime_snapshots (device_id, history_era, generated_at desc);

create or replace function public.archive_board_if_orphaned(
  p_board_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_board_id is null then
    return;
  end if;

  update public.boards boards
  set archived_at = coalesce(boards.archived_at, now())
  where boards.id = p_board_id
    and not exists (
      select 1
      from public.devices devices
      where devices.board_id = boards.id
    );
end;
$$;

create or replace function public.device_active_history_era(
  p_device_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(boards.active_history_era, 1)
  from public.devices devices
  left join public.boards boards
    on boards.id = devices.board_id
  where devices.id = p_device_id
$$;

create or replace function public.history_week_start(
  p_local_date date,
  p_week_start public.device_week_start
)
returns date
language sql
immutable
as $$
  select case
    when p_local_date is null then null
    when coalesce(p_week_start, 'monday') = 'sunday'
      then p_local_date - extract(dow from p_local_date)::integer
    else
      p_local_date - ((extract(dow from p_local_date)::integer + 6) % 7)
  end
$$;

create or replace function public.board_backup_is_valid(
  p_board_days jsonb,
  p_today_row integer,
  p_settings jsonb default '{}'::jsonb
)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(p_board_days) = 'array'
    and jsonb_array_length(p_board_days) = 21
    and p_today_row between 0 and 6
    and jsonb_typeof(coalesce(p_settings, '{}'::jsonb)) = 'object'
$$;

create or replace function public.board_has_valid_backup(
  p_board_id uuid,
  p_history_era integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.board_backups backups
    where backups.board_id = p_board_id
      and backups.history_era = p_history_era
      and public.board_backup_is_valid(backups.board_days, backups.today_row, backups.settings)
  )
$$;

create or replace function public.list_device_history_metrics_for_user()
returns table (
  device_id uuid,
  recorded_days_total bigint,
  successful_weeks_total bigint,
  history_era_started_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  return query
  with owned_devices as (
    select
      devices.id as device_id,
      devices.week_start,
      devices.weekly_target,
      coalesce(boards.active_history_era, 1) as active_history_era,
      coalesce(boards.history_era_started_at, devices.created_at) as history_era_started_at
    from public.device_memberships memberships
    join public.devices devices
      on devices.id = memberships.device_id
    left join public.boards boards
      on boards.id = devices.board_id
    where memberships.user_id = auth.uid()
      and memberships.role = 'owner'
      and memberships.status = 'approved'
  ),
  day_totals as (
    select
      owned.device_id,
      count(*) filter (where states.is_done) as recorded_days_total
    from owned_devices owned
    left join public.device_day_states states
      on states.device_id = owned.device_id
     and states.history_era = owned.active_history_era
    group by owned.device_id
  ),
  week_totals as (
    select
      weekly.device_id,
      count(*) filter (where weekly.week_start is not null and weekly.done_days >= weekly.weekly_target) as successful_weeks_total
    from (
      select
        owned.device_id,
        owned.weekly_target,
        public.history_week_start(states.local_date, owned.week_start) as week_start,
        count(*) filter (where states.is_done) as done_days
      from owned_devices owned
      left join public.device_day_states states
        on states.device_id = owned.device_id
       and states.history_era = owned.active_history_era
      group by
        owned.device_id,
        owned.weekly_target,
        public.history_week_start(states.local_date, owned.week_start)
    ) weekly
    group by weekly.device_id
  )
  select
    owned.device_id,
    coalesce(day_totals.recorded_days_total, 0) as recorded_days_total,
    coalesce(week_totals.successful_weeks_total, 0) as successful_weeks_total,
    owned.history_era_started_at
  from owned_devices owned
  left join day_totals
    on day_totals.device_id = owned.device_id
  left join week_totals
    on week_totals.device_id = owned.device_id;
end;
$$;

create or replace function public.record_day_state_event(
  p_device_id uuid,
  p_local_date date,
  p_is_done boolean,
  p_source public.device_event_source default 'cloud',
  p_client_event_id uuid default null,
  p_device_event_id text default null,
  p_effective_at timestamptz default now()
)
returns public.device_day_events
language plpgsql
security definer
set search_path = public
as $$
declare
  active_history_era integer := coalesce(public.device_active_history_era(p_device_id), 1);
  recorded_event public.device_day_events;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can create cloud history events.';
  end if;

  insert into public.device_day_events (
    device_id,
    history_era,
    local_date,
    desired_state,
    source,
    actor_user_id,
    client_event_id,
    device_event_id,
    effective_at
  )
  values (
    p_device_id,
    active_history_era,
    p_local_date,
    p_is_done,
    p_source,
    auth.uid(),
    p_client_event_id,
    p_device_event_id,
    p_effective_at
  )
  returning * into recorded_event;

  return recorded_event;
end;
$$;

create or replace function public.apply_day_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.device_day_states as current_states (
    device_id,
    history_era,
    local_date,
    is_done,
    effective_at,
    updated_from,
    updated_by_user_id
  )
  values (
    new.device_id,
    new.history_era,
    new.local_date,
    new.desired_state,
    new.effective_at,
    new.source,
    new.actor_user_id
  )
  on conflict (device_id, history_era, local_date) do update
  set
    is_done = excluded.is_done,
    effective_at = excluded.effective_at,
    updated_from = excluded.updated_from,
    updated_by_user_id = excluded.updated_by_user_id,
    updated_at = now()
  where excluded.effective_at >= current_states.effective_at;

  return new;
end;
$$;

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
  previous_board_id uuid;
  target_board_id uuid;
  target_history_era integer := 1;
  requires_transfer_reassignment boolean := false;
  same_owner_reset_recovery boolean := false;
  has_recovery_backup boolean := false;
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
    previous_board_id := claimed_device.board_id;

    select memberships.user_id
    into current_owner_user_id
    from public.device_memberships memberships
    where memberships.device_id = claimed_device.id
      and memberships.role = 'owner'
      and memberships.status = 'approved'
    limit 1;

    if current_owner_user_id is not null
       and current_owner_user_id <> p_owner_user_id
       and requested_reset_epoch <= claimed_device.reset_epoch then
      raise exception 'Device is already claimed by another owner.';
    end if;

    requires_transfer_reassignment :=
      requested_reset_epoch > claimed_device.reset_epoch
      and current_owner_user_id is not null
      and current_owner_user_id <> p_owner_user_id;

    same_owner_reset_recovery :=
      requested_reset_epoch > claimed_device.reset_epoch
      and current_owner_user_id = p_owner_user_id;

    if requires_transfer_reassignment then
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
    elsif current_owner_user_id is null then
      target_board_id := public.create_board_for_owner(p_owner_user_id);
    else
      target_board_id := coalesce(
        claimed_device.board_id,
        public.create_board_for_owner(p_owner_user_id)
      );
    end if;

    select coalesce(boards.active_history_era, 1)
    into target_history_era
    from public.boards boards
    where boards.id = target_board_id;

    has_recovery_backup :=
      same_owner_reset_recovery
      and public.board_has_valid_backup(target_board_id, target_history_era);

    update public.devices devices
    set
      board_id = target_board_id,
      reset_epoch = greatest(devices.reset_epoch, requested_reset_epoch),
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version),
      last_seen_at = coalesce(devices.last_seen_at, now()),
      last_factory_reset_at = case
        when requested_reset_epoch > devices.reset_epoch then now()
        else devices.last_factory_reset_at
      end,
      recovery_state = case
        when same_owner_reset_recovery and has_recovery_backup then 'recovering'::public.device_recovery_state
        when requested_reset_epoch > devices.reset_epoch then 'ready'::public.device_recovery_state
        else coalesce(devices.recovery_state, 'ready'::public.device_recovery_state)
      end
    where devices.id = claimed_device.id
    returning * into claimed_device;

    if previous_board_id is not null and previous_board_id <> target_board_id then
      perform public.archive_board_if_orphaned(previous_board_id);
    end if;
  else
    target_board_id := public.create_board_for_owner(p_owner_user_id);

    insert into public.devices (
      board_id,
      hardware_uid,
      hardware_profile,
      name,
      firmware_version,
      last_seen_at,
      reset_epoch,
      recovery_state
    )
    values (
      target_board_id,
      normalized_hardware_uid,
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, 'unknown'),
      now(),
      requested_reset_epoch,
      'ready'
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
    set device_auth_token_hash = public.hash_claim_token(normalized_device_auth_token)
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
  elsif p_kind = 'reset_history' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer history reset request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'reset_history';
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

create or replace function public.report_device_factory_reset(
  p_hardware_uid text,
  p_device_auth_token text,
  p_reset_epoch bigint default 0
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  next_reset_epoch bigint := greatest(coalesce(p_reset_epoch, 0), 0);
begin
  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  update public.devices devices
  set
    reset_epoch = greatest(devices.reset_epoch, next_reset_epoch),
    last_factory_reset_at = now(),
    last_seen_at = now(),
    last_sync_at = now(),
    recovery_state = 'needs_recovery'
  where devices.id = authenticated_device.id
  returning * into authenticated_device;

  return authenticated_device;
end;
$$;

create or replace function public.reset_device_history_from_app(
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  next_history_era integer;
  queued_command public.device_commands;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can reset history for this device.';
  end if;

  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  if target_device.board_id is null then
    raise exception 'Device is missing its board.';
  end if;

  update public.boards boards
  set
    active_history_era = boards.active_history_era + 1,
    history_era_started_at = now()
  where boards.id = target_device.board_id
  returning boards.active_history_era into next_history_era;

  update public.devices devices
  set recovery_state = 'recovering'
  where devices.id = p_device_id;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'reset_history',
    p_payload => jsonb_build_object(
      'base_revision', target_device.last_runtime_revision,
      'history_era', next_history_era,
      'weekly_target', target_device.weekly_target
    ),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'history_era', next_history_era,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.factory_reset_and_remove_device_from_app(
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
    raise exception 'Only the owner can remove this device from the app.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'factory_reset',
    p_payload => jsonb_build_object(
      'remove_from_owner', true
    ),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
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
    p_payload => jsonb_build_object(
      'remove_from_owner', false
    ),
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_device_id is not null and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can list restore candidates for this device.';
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
   and backups.history_era = boards.active_history_era
  left join public.devices source_devices
    on source_devices.id = backups.source_device_id
  where boards.owner_user_id = auth.uid()
    and public.board_backup_is_valid(backups.board_days, backups.today_row, backups.settings)
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
      and boards.active_history_era = target_backup.history_era
  ) then
    raise exception 'You do not have access to that board backup.';
  end if;

  if not public.board_backup_is_valid(target_backup.board_days, target_backup.today_row, target_backup.settings) then
    raise exception 'The requested board backup is invalid.';
  end if;

  previous_board_id := target_device.board_id;

  update public.devices devices
  set board_id = null
  where devices.board_id = target_backup.board_id
    and devices.id <> target_device.id;

  update public.devices devices
  set
    board_id = target_backup.board_id,
    recovery_state = 'recovering'
  where devices.id = target_device.id
  returning * into target_device;

  if previous_board_id is not null and previous_board_id <> target_backup.board_id then
    perform public.archive_board_if_orphaned(previous_board_id);
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
      'history_era', target_backup.history_era,
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

create or replace function public.record_day_state_from_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_local_date date,
  p_is_done boolean,
  p_device_event_id text,
  p_effective_at timestamptz default now()
)
returns public.device_day_events
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  active_history_era integer;
  existing_event public.device_day_events;
  recorded_event public.device_day_events;
begin
  if nullif(trim(coalesce(p_device_event_id, '')), '') is null then
    raise exception 'Device event ID is required.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);
  active_history_era := coalesce(public.device_active_history_era(authenticated_device.id), 1);

  select *
  into existing_event
  from public.device_day_events
  where device_id = authenticated_device.id
    and device_event_id = p_device_event_id
  limit 1;

  if found then
    if existing_event.effective_at is null or p_effective_at >= existing_event.effective_at then
      update public.device_day_events
      set
        history_era = active_history_era,
        local_date = p_local_date,
        desired_state = p_is_done,
        effective_at = p_effective_at,
        source = 'device'
      where id = existing_event.id
      returning * into recorded_event;
    else
      recorded_event := existing_event;
    end if;
  else
    insert into public.device_day_events (
      device_id,
      history_era,
      local_date,
      desired_state,
      source,
      actor_user_id,
      client_event_id,
      device_event_id,
      effective_at
    )
    values (
      authenticated_device.id,
      active_history_era,
      p_local_date,
      p_is_done,
      'device',
      null,
      null,
      p_device_event_id,
      p_effective_at
    )
    returning * into recorded_event;
  end if;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return recorded_event;
end;
$$;

create or replace function public.ack_device_command(
  p_hardware_uid text,
  p_device_auth_token text,
  p_command_id uuid,
  p_status public.device_command_status,
  p_last_error text default null
)
returns public.device_commands
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  updated_command public.device_commands;
  update_entry jsonb;
  event_effective_at timestamptz;
  event_local_date date;
  event_is_done boolean;
  event_id text;
  active_history_era integer;
  previous_board_id uuid;
  remove_from_owner boolean := false;
begin
  if p_status not in ('applied', 'failed', 'cancelled') then
    raise exception 'Device command acknowledgements must use applied, failed, or cancelled status.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);
  active_history_era := coalesce(public.device_active_history_era(authenticated_device.id), 1);

  update public.device_commands commands
  set
    status = p_status,
    delivered_at = coalesce(commands.delivered_at, now()),
    applied_at = case when p_status = 'applied' then now() else commands.applied_at end,
    failed_at = case when p_status = 'failed' then now() else commands.failed_at end,
    last_error = case when p_status = 'failed' then p_last_error else null end
  where commands.id = p_command_id
    and commands.device_id = authenticated_device.id
  returning * into updated_command;

  if not found then
    raise exception 'Device command not found.';
  end if;

  if p_status = 'applied' then
    if updated_command.kind = 'set_day_state' then
      event_local_date := nullif(updated_command.payload ->> 'local_date', '')::date;
      event_is_done := (updated_command.payload ->> 'is_done')::boolean;
      event_effective_at := coalesce(
        nullif(updated_command.payload ->> 'effective_at', '')::timestamptz,
        updated_command.applied_at,
        now()
      );
      event_id := format('cmd:%s:%s', updated_command.id, coalesce(event_local_date::text, 'unknown'));

      if event_local_date is not null and event_is_done is not null then
        insert into public.device_day_events (
          device_id,
          history_era,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          active_history_era,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          event_effective_at
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
      end if;
    elsif updated_command.kind = 'sync_day_states_batch' then
      event_effective_at := coalesce(
        nullif(updated_command.payload ->> 'effective_at', '')::timestamptz,
        updated_command.applied_at,
        now()
      );

      for update_entry in
        select value
        from jsonb_array_elements(coalesce(updated_command.payload -> 'updates', '[]'::jsonb))
      loop
        event_local_date := nullif(update_entry ->> 'local_date', '')::date;
        event_is_done := (update_entry ->> 'is_done')::boolean;
        event_id := format('cmd:%s:%s', updated_command.id, coalesce(event_local_date::text, 'unknown'));

        if event_local_date is null or event_is_done is null then
          continue;
        end if;

        insert into public.device_day_events (
          device_id,
          history_era,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          active_history_era,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          coalesce(nullif(update_entry ->> 'effective_at', '')::timestamptz, event_effective_at)
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
      end loop;
    elsif updated_command.kind = 'restore_board_backup' then
      update public.devices devices
      set recovery_state = 'ready'
      where devices.id = authenticated_device.id
      returning * into authenticated_device;
    elsif updated_command.kind = 'reset_history' then
      update public.devices devices
      set recovery_state = 'ready'
      where devices.id = authenticated_device.id
      returning * into authenticated_device;
    elsif updated_command.kind = 'factory_reset' then
      remove_from_owner := coalesce((updated_command.payload ->> 'remove_from_owner')::boolean, false);

      update public.devices devices
      set
        last_factory_reset_at = now(),
        recovery_state = 'needs_recovery'
      where devices.id = authenticated_device.id
      returning * into authenticated_device;

      if remove_from_owner then
        previous_board_id := authenticated_device.board_id;

        update public.device_memberships memberships
        set
          status = 'revoked',
          approved_at = coalesce(memberships.approved_at, now()),
          approved_by_user_id = coalesce(memberships.approved_by_user_id, updated_command.requested_by_user_id)
        where memberships.device_id = authenticated_device.id
          and memberships.status = 'approved';

        update public.device_share_requests requests
        set
          status = 'cancelled',
          responded_at = coalesce(requests.responded_at, now()),
          approved_by_user_id = coalesce(requests.approved_by_user_id, updated_command.requested_by_user_id)
        where requests.device_id = authenticated_device.id
          and requests.status = 'pending';

        update public.device_share_codes share_codes
        set
          is_active = false,
          expires_at = coalesce(share_codes.expires_at, now())
        where share_codes.device_id = authenticated_device.id;

        update public.devices devices
        set
          board_id = null,
          device_auth_token_hash = null
        where devices.id = authenticated_device.id
        returning * into authenticated_device;

        perform public.archive_board_if_orphaned(previous_board_id);
      end if;
    end if;
  end if;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return updated_command;
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
  active_history_era integer := 1;
  should_commit_history boolean := true;
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
  active_history_era := coalesce(public.device_active_history_era(authenticated_device.id), 1);
  should_commit_history := authenticated_device.recovery_state <> 'recovering';

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
    history_era,
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
    active_history_era,
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
    history_era = excluded.history_era,
    current_week_start = excluded.current_week_start,
    today_row = excluded.today_row,
    board_days = excluded.board_days,
    settings = excluded.settings,
    board_hash = excluded.board_hash,
    generated_at = greatest(snapshots.generated_at, excluded.generated_at)
  returning * into snapshot_row;

  if should_commit_history then
    oldest_visible := p_current_week_start - 140;
    visible_until := p_current_week_start + 6;

    delete from public.device_day_states states
    where states.device_id = authenticated_device.id
      and states.history_era = active_history_era
      and states.local_date between oldest_visible and visible_until;

    for week_index in 0..20 loop
      for day_index in 0..6 loop
        local_date := p_current_week_start - (week_index * 7) + day_index;
        desired_state := coalesce((p_board_days -> week_index ->> day_index)::boolean, false);

        insert into public.device_day_states (
          device_id,
          history_era,
          local_date,
          is_done,
          effective_at,
          updated_from,
          updated_by_user_id
        )
        values (
          authenticated_device.id,
          active_history_era,
          local_date,
          desired_state,
          p_generated_at,
          'device',
          null
        );
      end loop;
    end loop;
  end if;

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

  if should_commit_history and authenticated_device.board_id is not null then
    insert into public.board_backups as backups (
      board_id,
      history_era,
      backup_day,
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
      active_history_era,
      timezone('utc', p_generated_at)::date,
      p_board_days,
      p_current_week_start,
      p_today_row,
      normalized_settings,
      authenticated_device.id,
      p_revision,
      normalized_hash,
      p_generated_at
    )
    on conflict (board_id, history_era, backup_day) do update
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

    delete from public.board_backups backups
    where backups.board_id = authenticated_device.board_id
      and backups.history_era = active_history_era
      and backups.id not in (
        select recent.id
        from public.board_backups recent
        where recent.board_id = authenticated_device.board_id
          and recent.history_era = active_history_era
        order by recent.backed_up_at desc, recent.created_at desc
        limit 21
      );
  end if;

  return snapshot_row;
end;
$$;

revoke all on function public.list_device_history_metrics_for_user() from public;
grant execute on function public.list_device_history_metrics_for_user() to authenticated;

revoke all on function public.report_device_factory_reset(text, text, bigint) from public;
grant execute on function public.report_device_factory_reset(text, text, bigint) to anon, authenticated;

revoke all on function public.reset_device_history_from_app(uuid, uuid) from public;
grant execute on function public.reset_device_history_from_app(uuid, uuid) to authenticated;

revoke all on function public.factory_reset_and_remove_device_from_app(uuid, uuid) from public;
grant execute on function public.factory_reset_and_remove_device_from_app(uuid, uuid) to authenticated;

commit;
