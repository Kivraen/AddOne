alter table public.board_habit_eras
  add column if not exists habit_started_on_local date null;

create or replace function public.logical_local_date_for_timestamp(
  p_timestamp timestamptz,
  p_timezone text default 'UTC',
  p_day_reset_time time default '00:00:00'::time
)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  normalized_timezone text := nullif(btrim(coalesce(p_timezone, '')), '');
  local_wall_time timestamp without time zone;
  sign_value text;
  offset_hours integer;
  offset_minutes integer;
  total_offset_minutes integer;
begin
  if p_timestamp is null then
    return null;
  end if;

  if normalized_timezone is null then
    normalized_timezone := 'UTC';
  end if;

  if normalized_timezone ~ '^UTC[+-][0-9]{2}:[0-9]{2}$' then
    sign_value := substring(normalized_timezone from 4 for 1);
    offset_hours := substring(normalized_timezone from 5 for 2)::integer;
    offset_minutes := substring(normalized_timezone from 8 for 2)::integer;
    total_offset_minutes := (offset_hours * 60) + offset_minutes;

    if sign_value = '-' then
      total_offset_minutes := total_offset_minutes * -1;
    end if;

    local_wall_time := timezone('UTC', p_timestamp) + make_interval(mins => total_offset_minutes);
  else
    begin
      local_wall_time := timezone(normalized_timezone, p_timestamp);
    exception
      when others then
        local_wall_time := timezone('UTC', p_timestamp);
    end;
  end if;

  if local_wall_time::time < coalesce(p_day_reset_time, '00:00:00'::time) then
    return (local_wall_time::date - 1);
  end if;

  return local_wall_time::date;
end;
$$;

with latest_board_devices as (
  select distinct on (devices.board_id)
    devices.board_id,
    devices.timezone,
    devices.day_reset_time
  from public.devices
  where devices.board_id is not null
  order by
    devices.board_id,
    devices.updated_at desc nulls last,
    devices.created_at desc,
    devices.id desc
)
update public.board_habit_eras eras
set habit_started_on_local = public.logical_local_date_for_timestamp(
  eras.started_at,
  coalesce(latest_board_devices.timezone, 'UTC'),
  coalesce(latest_board_devices.day_reset_time, '00:00:00'::time)
)
from latest_board_devices
where latest_board_devices.board_id = eras.board_id
  and eras.habit_started_on_local is null;

update public.board_habit_eras eras
set habit_started_on_local = public.logical_local_date_for_timestamp(
  eras.started_at,
  'UTC',
  '00:00:00'::time
)
where eras.habit_started_on_local is null;

create or replace function public.sync_active_board_habit_era_from_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_history_era integer;
  current_history_era_started_at timestamptz;
begin
  if new.board_id is null then
    return new;
  end if;

  select
    coalesce(boards.active_history_era, 1),
    coalesce(boards.history_era_started_at, new.created_at, now())
  into
    active_history_era,
    current_history_era_started_at
  from public.boards boards
  where boards.id = new.board_id;

  if not found then
    return new;
  end if;

  insert into public.board_habit_eras (
    board_id,
    history_era,
    habit_name,
    daily_minimum,
    weekly_target,
    started_at,
    habit_started_on_local
  )
  values (
    new.board_id,
    active_history_era,
    coalesce(nullif(btrim(new.name), ''), 'Habit Name'),
    null,
    greatest(1, least(coalesce(new.weekly_target, 1), 7)),
    current_history_era_started_at,
    public.logical_local_date_for_timestamp(
      current_history_era_started_at,
      new.timezone,
      new.day_reset_time
    )
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    weekly_target = excluded.weekly_target,
    started_at = coalesce(public.board_habit_eras.started_at, excluded.started_at),
    habit_started_on_local = coalesce(public.board_habit_eras.habit_started_on_local, excluded.habit_started_on_local);

  return new;
end;
$$;

drop function if exists public.list_device_history_metrics_for_user();

create function public.list_device_history_metrics_for_user()
returns table (
  device_id uuid,
  recorded_days_total bigint,
  successful_weeks_total bigint,
  history_era_started_at timestamptz,
  current_habit_name text,
  current_daily_minimum text,
  current_weekly_target integer,
  current_habit_started_on_local date
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
      devices.board_id,
      devices.name as device_name,
      devices.week_start,
      devices.weekly_target,
      devices.timezone,
      devices.day_reset_time,
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
    owned.history_era_started_at,
    coalesce(habit_eras.habit_name, owned.device_name) as current_habit_name,
    habit_eras.daily_minimum as current_daily_minimum,
    coalesce(habit_eras.weekly_target, owned.weekly_target) as current_weekly_target,
    coalesce(
      habit_eras.habit_started_on_local,
      public.logical_local_date_for_timestamp(
        owned.history_era_started_at,
        owned.timezone,
        owned.day_reset_time
      )
    ) as current_habit_started_on_local
  from owned_devices owned
  left join day_totals
    on day_totals.device_id = owned.device_id
  left join week_totals
    on week_totals.device_id = owned.device_id
  left join public.board_habit_eras habit_eras
    on habit_eras.board_id = owned.board_id
   and habit_eras.history_era = owned.active_history_era;
end;
$$;

create or replace function public.update_active_habit_metadata_from_app(
  p_device_id uuid,
  p_habit_name text,
  p_daily_minimum text,
  p_weekly_target integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  active_history_era integer;
  current_history_era_started_at timestamptz;
  normalized_habit_name text := coalesce(nullif(btrim(coalesce(p_habit_name, '')), ''), 'Habit Name');
  normalized_daily_minimum text := nullif(btrim(coalesce(p_daily_minimum, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can update habit metadata for this device.';
  end if;

  if p_weekly_target is null or p_weekly_target < 1 or p_weekly_target > 7 then
    raise exception 'Weekly target must be between 1 and 7.';
  end if;

  select devices.*
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

  select
    coalesce(boards.active_history_era, 1),
    coalesce(boards.history_era_started_at, target_device.created_at, now())
  into
    active_history_era,
    current_history_era_started_at
  from public.boards boards
  where boards.id = target_device.board_id;

  if not found then
    active_history_era := 1;
    current_history_era_started_at := coalesce(target_device.created_at, now());
  end if;

  update public.devices devices
  set
    name = normalized_habit_name,
    weekly_target = p_weekly_target
  where devices.id = p_device_id
  returning * into target_device;

  insert into public.board_habit_eras (
    board_id,
    history_era,
    habit_name,
    daily_minimum,
    weekly_target,
    started_at,
    habit_started_on_local,
    ended_at
  )
  values (
    target_device.board_id,
    active_history_era,
    normalized_habit_name,
    normalized_daily_minimum,
    p_weekly_target,
    current_history_era_started_at,
    public.logical_local_date_for_timestamp(
      current_history_era_started_at,
      target_device.timezone,
      target_device.day_reset_time
    ),
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    daily_minimum = excluded.daily_minimum,
    weekly_target = excluded.weekly_target,
    started_at = excluded.started_at,
    habit_started_on_local = coalesce(public.board_habit_eras.habit_started_on_local, excluded.habit_started_on_local),
    ended_at = null;

  return jsonb_build_object(
    'device_id', target_device.id,
    'history_era', active_history_era,
    'habit_name', normalized_habit_name,
    'daily_minimum', normalized_daily_minimum,
    'weekly_target', p_weekly_target,
    'habit_started_on_local', public.logical_local_date_for_timestamp(
      current_history_era_started_at,
      target_device.timezone,
      target_device.day_reset_time
    )
  );
end;
$$;

create or replace function public.set_active_habit_start_date_from_app(
  p_device_id uuid,
  p_habit_started_on_local date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  active_history_era integer;
  current_history_era_started_at timestamptz;
  current_habit_started_on_local date;
  earliest_allowed_start date;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can update the habit start date for this device.';
  end if;

  if p_habit_started_on_local is null then
    raise exception 'Habit start date is required.';
  end if;

  select devices.*
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

  select
    coalesce(boards.active_history_era, 1),
    coalesce(boards.history_era_started_at, target_device.created_at, now())
  into
    active_history_era,
    current_history_era_started_at
  from public.boards boards
  where boards.id = target_device.board_id;

  if not found then
    active_history_era := 1;
    current_history_era_started_at := coalesce(target_device.created_at, now());
  end if;

  earliest_allowed_start := public.logical_local_date_for_timestamp(
    current_history_era_started_at,
    target_device.timezone,
    target_device.day_reset_time
  );

  select coalesce(eras.habit_started_on_local, earliest_allowed_start)
  into current_habit_started_on_local
  from public.board_habit_eras eras
  where eras.board_id = target_device.board_id
    and eras.history_era = active_history_era;

  if p_habit_started_on_local > current_habit_started_on_local then
    raise exception 'Habit start can only move earlier.';
  end if;

  insert into public.board_habit_eras (
    board_id,
    history_era,
    habit_name,
    daily_minimum,
    weekly_target,
    started_at,
    habit_started_on_local,
    ended_at
  )
  values (
    target_device.board_id,
    active_history_era,
    coalesce(nullif(btrim(target_device.name), ''), 'Habit Name'),
    null,
    greatest(1, least(coalesce(target_device.weekly_target, 1), 7)),
    current_history_era_started_at,
    p_habit_started_on_local,
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_started_on_local = excluded.habit_started_on_local,
    ended_at = null;

  return jsonb_build_object(
    'device_id', target_device.id,
    'history_era', active_history_era,
    'habit_started_on_local', p_habit_started_on_local
  );
end;
$$;

create or replace function public.reset_device_history_from_app(
  p_device_id uuid,
  p_habit_name text,
  p_daily_minimum text,
  p_weekly_target integer,
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
  next_history_era_started_at timestamptz;
  queued_command public.device_commands;
  normalized_habit_name text := coalesce(nullif(btrim(coalesce(p_habit_name, '')), ''), 'Habit Name');
  normalized_daily_minimum text := nullif(btrim(coalesce(p_daily_minimum, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can reset history for this device.';
  end if;

  if p_weekly_target is null or p_weekly_target < 1 or p_weekly_target > 7 then
    raise exception 'Weekly target must be between 1 and 7.';
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
  returning boards.active_history_era, boards.history_era_started_at
  into next_history_era, next_history_era_started_at;

  update public.board_habit_eras eras
  set ended_at = coalesce(eras.ended_at, next_history_era_started_at)
  where eras.board_id = target_device.board_id
    and eras.history_era = greatest(next_history_era - 1, 1)
    and eras.ended_at is null;

  update public.devices devices
  set
    recovery_state = 'recovering',
    name = normalized_habit_name,
    weekly_target = p_weekly_target
  where devices.id = p_device_id
  returning * into target_device;

  insert into public.board_habit_eras (
    board_id,
    history_era,
    habit_name,
    daily_minimum,
    weekly_target,
    started_at,
    habit_started_on_local,
    ended_at
  )
  values (
    target_device.board_id,
    next_history_era,
    normalized_habit_name,
    normalized_daily_minimum,
    p_weekly_target,
    next_history_era_started_at,
    public.logical_local_date_for_timestamp(
      next_history_era_started_at,
      target_device.timezone,
      target_device.day_reset_time
    ),
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    daily_minimum = excluded.daily_minimum,
    weekly_target = excluded.weekly_target,
    started_at = excluded.started_at,
    habit_started_on_local = excluded.habit_started_on_local,
    ended_at = null;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'reset_history',
    p_payload => jsonb_build_object(
      'base_revision', target_device.last_runtime_revision,
      'history_era', next_history_era,
      'name', normalized_habit_name,
      'weekly_target', p_weekly_target
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

revoke all on function public.set_active_habit_start_date_from_app(uuid, date) from public;
grant execute on function public.set_active_habit_start_date_from_app(uuid, date) to authenticated;
