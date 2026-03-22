create table if not exists public.board_habit_eras (
  board_id uuid not null references public.boards(id) on delete cascade,
  history_era integer not null check (history_era >= 1),
  habit_name text not null,
  daily_minimum text null,
  weekly_target integer not null check (weekly_target between 1 and 7),
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, history_era)
);

create index if not exists board_habit_eras_started_at_idx
  on public.board_habit_eras (board_id, started_at desc);

create index if not exists board_habit_eras_open_idx
  on public.board_habit_eras (board_id)
  where ended_at is null;

create or replace function public.touch_board_habit_eras_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_board_habit_eras_updated_at on public.board_habit_eras;

create trigger touch_board_habit_eras_updated_at
before update on public.board_habit_eras
for each row
execute function public.touch_board_habit_eras_updated_at();

insert into public.board_habit_eras (
  board_id,
  history_era,
  habit_name,
  daily_minimum,
  weekly_target,
  started_at
)
select distinct on (boards.id, coalesce(boards.active_history_era, 1))
  boards.id,
  coalesce(boards.active_history_era, 1),
  coalesce(nullif(btrim(devices.name), ''), 'Habit Name'),
  null::text,
  greatest(1, least(coalesce(devices.weekly_target, 1), 7)),
  coalesce(boards.history_era_started_at, devices.created_at, now())
from public.boards
join public.devices
  on devices.board_id = boards.id
where not exists (
  select 1
  from public.board_habit_eras eras
  where eras.board_id = boards.id
    and eras.history_era = coalesce(boards.active_history_era, 1)
)
order by
  boards.id,
  coalesce(boards.active_history_era, 1),
  devices.created_at desc;

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
    started_at
  )
  values (
    new.board_id,
    active_history_era,
    coalesce(nullif(btrim(new.name), ''), 'Habit Name'),
    null,
    greatest(1, least(coalesce(new.weekly_target, 1), 7)),
    current_history_era_started_at
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    weekly_target = excluded.weekly_target,
    started_at = coalesce(public.board_habit_eras.started_at, excluded.started_at);

  return new;
end;
$$;

drop trigger if exists sync_active_board_habit_era_from_device on public.devices;

create trigger sync_active_board_habit_era_from_device
after insert or update of board_id, name, weekly_target on public.devices
for each row
execute function public.sync_active_board_habit_era_from_device();

drop function if exists public.list_device_history_metrics_for_user();

create function public.list_device_history_metrics_for_user()
returns table (
  device_id uuid,
  recorded_days_total bigint,
  successful_weeks_total bigint,
  history_era_started_at timestamptz,
  current_habit_name text,
  current_daily_minimum text,
  current_weekly_target integer
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
    coalesce(habit_eras.weekly_target, owned.weekly_target) as current_weekly_target
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
    ended_at
  )
  values (
    target_device.board_id,
    active_history_era,
    normalized_habit_name,
    normalized_daily_minimum,
    p_weekly_target,
    current_history_era_started_at,
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    daily_minimum = excluded.daily_minimum,
    weekly_target = excluded.weekly_target,
    started_at = excluded.started_at,
    ended_at = null;

  return jsonb_build_object(
    'device_id', target_device.id,
    'history_era', active_history_era,
    'habit_name', normalized_habit_name,
    'daily_minimum', normalized_daily_minimum,
    'weekly_target', p_weekly_target
  );
end;
$$;

drop function if exists public.reset_device_history_from_app(uuid, uuid);

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
    ended_at
  )
  values (
    target_device.board_id,
    next_history_era,
    normalized_habit_name,
    normalized_daily_minimum,
    p_weekly_target,
    next_history_era_started_at,
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    daily_minimum = excluded.daily_minimum,
    weekly_target = excluded.weekly_target,
    started_at = excluded.started_at,
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

revoke all on function public.update_active_habit_metadata_from_app(uuid, text, text, integer) from public;
grant execute on function public.update_active_habit_metadata_from_app(uuid, text, text, integer) to authenticated;

revoke all on function public.reset_device_history_from_app(uuid, text, text, integer, uuid) from public;
grant execute on function public.reset_device_history_from_app(uuid, text, text, integer, uuid) to authenticated;
