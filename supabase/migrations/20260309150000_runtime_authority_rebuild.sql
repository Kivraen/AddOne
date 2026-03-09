begin;

alter type public.device_command_kind add value if not exists 'request_runtime_snapshot';
alter type public.device_command_kind add value if not exists 'apply_history_draft';
alter type public.device_command_kind add value if not exists 'apply_device_settings';

alter table public.devices
  add column if not exists last_runtime_revision bigint not null default 0,
  add column if not exists last_snapshot_at timestamptz,
  add column if not exists last_snapshot_hash text;

drop function if exists public.request_day_state_from_app(uuid, date, boolean, uuid, timestamptz);
drop function if exists public.request_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz);
drop function if exists public.set_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz);

drop trigger if exists device_settings_sync_trigger on public.devices;
drop function if exists public.queue_device_settings_sync();

drop policy if exists "devices_update_for_owner" on public.devices;

create table if not exists public.device_runtime_snapshots (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  revision bigint not null check (revision >= 0),
  current_week_start date not null,
  today_row smallint not null check (today_row between 0 and 6),
  board_days jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  board_hash text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (device_id, revision)
);

create index if not exists device_runtime_snapshots_device_created_idx
  on public.device_runtime_snapshots (device_id, created_at desc);

alter table public.device_runtime_snapshots enable row level security;

drop policy if exists "device_runtime_snapshots_select_for_members" on public.device_runtime_snapshots;

create policy "device_runtime_snapshots_select_for_members"
on public.device_runtime_snapshots
for select
to authenticated
using (public.is_device_member(device_id));

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

create or replace function public.request_day_state_from_app(
  p_device_id uuid,
  p_local_date date,
  p_is_done boolean,
  p_client_event_id uuid default gen_random_uuid(),
  p_effective_at timestamptz default now(),
  p_base_revision bigint default null
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
    raise exception 'Only the owner can change device state from the app.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'set_day_state',
    p_payload => jsonb_build_object(
      'base_revision', p_base_revision,
      'effective_at', p_effective_at,
      'is_done', p_is_done,
      'local_date', p_local_date
    ),
    p_request_key => coalesce(p_client_event_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'effective_at', p_effective_at,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.request_runtime_snapshot_from_app(
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
    raise exception 'Only the owner can request a runtime refresh.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'request_runtime_snapshot',
    p_payload => jsonb_build_object(),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.apply_history_draft_from_app(
  p_device_id uuid,
  p_updates jsonb,
  p_base_revision bigint,
  p_draft_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_updates jsonb := coalesce(p_updates, '[]'::jsonb);
  queued_command public.device_commands;
  update_entry jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can edit device history from the app.';
  end if;

  if p_base_revision is null or p_base_revision < 0 then
    raise exception 'A valid base revision is required.';
  end if;

  if jsonb_typeof(normalized_updates) <> 'array' or jsonb_array_length(normalized_updates) = 0 then
    raise exception 'History draft must contain at least one update.';
  end if;

  for update_entry in
    select value
    from jsonb_array_elements(normalized_updates)
  loop
    if nullif(update_entry ->> 'local_date', '') is null then
      raise exception 'Each history update requires local_date.';
    end if;

    if (update_entry ->> 'is_done') is null then
      raise exception 'Each history update requires is_done.';
    end if;
  end loop;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'apply_history_draft',
    p_payload => jsonb_build_object(
      'base_revision', p_base_revision,
      'updates', normalized_updates
    ),
    p_request_key => coalesce(p_draft_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.apply_device_settings_from_app(
  p_device_id uuid,
  p_patch jsonb,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  queued_command public.device_commands;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can change device settings from the app.';
  end if;

  if jsonb_typeof(normalized_patch) <> 'object' or normalized_patch = '{}'::jsonb then
    raise exception 'Device settings patch must contain at least one field.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'apply_device_settings',
    p_payload => normalized_patch,
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
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
begin
  if p_status not in ('applied', 'failed', 'cancelled') then
    raise exception 'Device command acknowledgements must use applied, failed, or cancelled status.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

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
  where devices.id = authenticated_device.id;

  return snapshot_row;
end;
$$;

revoke all on function public.request_day_state_from_app(uuid, date, boolean, uuid, timestamptz, bigint) from public;
revoke all on function public.request_runtime_snapshot_from_app(uuid, uuid) from public;
revoke all on function public.apply_history_draft_from_app(uuid, jsonb, bigint, uuid) from public;
revoke all on function public.apply_device_settings_from_app(uuid, jsonb, uuid) from public;
revoke all on function public.upload_device_runtime_snapshot(text, text, bigint, date, integer, jsonb, jsonb, text, timestamptz) from public;

grant execute on function public.request_day_state_from_app(uuid, date, boolean, uuid, timestamptz, bigint) to authenticated;
grant execute on function public.request_runtime_snapshot_from_app(uuid, uuid) to authenticated;
grant execute on function public.apply_history_draft_from_app(uuid, jsonb, bigint, uuid) to authenticated;
grant execute on function public.apply_device_settings_from_app(uuid, jsonb, uuid) to authenticated;
grant execute on function public.upload_device_runtime_snapshot(text, text, bigint, date, integer, jsonb, jsonb, text, timestamptz) to anon, authenticated;

commit;
