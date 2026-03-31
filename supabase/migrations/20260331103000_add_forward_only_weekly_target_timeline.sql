begin;

create table if not exists public.board_weekly_target_changes (
  board_id uuid not null references public.boards(id) on delete cascade,
  history_era integer not null check (history_era >= 1),
  effective_week_start date not null,
  weekly_target integer not null check (weekly_target between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, history_era, effective_week_start)
);

create index if not exists board_weekly_target_changes_lookup_idx
  on public.board_weekly_target_changes (board_id, history_era, effective_week_start desc);

create or replace function public.touch_board_weekly_target_changes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_board_weekly_target_changes_updated_at on public.board_weekly_target_changes;

create trigger touch_board_weekly_target_changes_updated_at
before update on public.board_weekly_target_changes
for each row
execute function public.touch_board_weekly_target_changes_updated_at();

alter table public.device_runtime_snapshots
  add column if not exists week_targets jsonb;

alter table public.board_backups
  add column if not exists week_targets jsonb;

create or replace function public.week_targets_json_is_valid(
  p_week_targets jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_week_targets is null
    or (
      jsonb_typeof(p_week_targets) = 'array'
      and jsonb_array_length(p_week_targets) = 21
      and not exists (
        select 1
        from jsonb_array_elements_text(p_week_targets) as entry(value)
        where entry.value !~ '^\d+$'
          or entry.value::integer < 1
          or entry.value::integer > 7
      )
    )
$$;

create or replace function public.resolve_board_weekly_target_for_week(
  p_board_id uuid,
  p_history_era integer,
  p_week_start date,
  p_fallback_weekly_target integer
)
returns integer
language sql
stable
set search_path = public
as $$
  select greatest(
    1,
    least(
      coalesce(
        (
          select changes.weekly_target
          from public.board_weekly_target_changes changes
          where changes.board_id = p_board_id
            and changes.history_era = p_history_era
            and changes.effective_week_start <= p_week_start
          order by changes.effective_week_start desc
          limit 1
        ),
        p_fallback_weekly_target,
        1
      ),
      7
    )
  )
$$;

create or replace function public.board_backup_is_valid(
  p_board_days jsonb,
  p_today_row integer,
  p_settings jsonb default '{}'::jsonb,
  p_week_targets jsonb default null
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
    and public.week_targets_json_is_valid(p_week_targets)
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
      and public.board_backup_is_valid(backups.board_days, backups.today_row, backups.settings, backups.week_targets)
  )
$$;

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
    started_at = coalesce(public.board_habit_eras.started_at, excluded.started_at),
    habit_started_on_local = coalesce(public.board_habit_eras.habit_started_on_local, excluded.habit_started_on_local);

  return new;
end;
$$;

drop trigger if exists sync_active_board_habit_era_from_device on public.devices;

create trigger sync_active_board_habit_era_from_device
after insert or update of board_id, name on public.devices
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
  current_weekly_target integer,
  current_habit_started_on_local date,
  visible_week_targets jsonb
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
      devices.weekly_target as live_weekly_target,
      devices.timezone,
      devices.day_reset_time,
      public.history_week_start(
        public.logical_local_date_for_timestamp(
          now(),
          devices.timezone,
          devices.day_reset_time
        ),
        devices.week_start
      ) as current_week_start,
      coalesce(boards.active_history_era, 1) as active_history_era,
      coalesce(boards.history_era_started_at, devices.created_at) as history_era_started_at,
      habit_eras.habit_name as era_habit_name,
      habit_eras.daily_minimum as era_daily_minimum,
      coalesce(habit_eras.weekly_target, devices.weekly_target) as era_weekly_target,
      habit_eras.habit_started_on_local as era_habit_started_on_local
    from public.device_memberships memberships
    join public.devices devices
      on devices.id = memberships.device_id
    left join public.boards boards
      on boards.id = devices.board_id
    left join public.board_habit_eras habit_eras
      on habit_eras.board_id = devices.board_id
     and habit_eras.history_era = coalesce(boards.active_history_era, 1)
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
      count(*) filter (
        where weekly.week_start is not null
          and weekly.done_days >= weekly.weekly_target
      ) as successful_weeks_total
    from (
      select
        owned.device_id,
        public.history_week_start(states.local_date, owned.week_start) as week_start,
        count(*) filter (where states.is_done) as done_days,
        public.resolve_board_weekly_target_for_week(
          owned.board_id,
          owned.active_history_era,
          public.history_week_start(states.local_date, owned.week_start),
          owned.era_weekly_target
        ) as weekly_target
      from owned_devices owned
      left join public.device_day_states states
        on states.device_id = owned.device_id
       and states.history_era = owned.active_history_era
      group by
        owned.device_id,
        owned.board_id,
        owned.active_history_era,
        owned.era_weekly_target,
        public.history_week_start(states.local_date, owned.week_start)
    ) weekly
    group by weekly.device_id
  ),
  week_target_timeline as (
    select
      owned.device_id,
      jsonb_agg(
        public.resolve_board_weekly_target_for_week(
          owned.board_id,
          owned.active_history_era,
          owned.current_week_start - (offsets.week_index * 7),
          owned.era_weekly_target
        )
        order by offsets.week_index
      ) as visible_week_targets
    from owned_devices owned
    cross join generate_series(0, 20) as offsets(week_index)
    group by owned.device_id
  )
  select
    owned.device_id,
    coalesce(day_totals.recorded_days_total, 0) as recorded_days_total,
    coalesce(week_totals.successful_weeks_total, 0) as successful_weeks_total,
    owned.history_era_started_at,
    coalesce(owned.era_habit_name, owned.device_name) as current_habit_name,
    owned.era_daily_minimum as current_daily_minimum,
    greatest(1, least(coalesce(owned.live_weekly_target, owned.era_weekly_target), 7)) as current_weekly_target,
    coalesce(
      owned.era_habit_started_on_local,
      public.logical_local_date_for_timestamp(
        owned.history_era_started_at,
        owned.timezone,
        owned.day_reset_time
      )
    ) as current_habit_started_on_local,
    week_target_timeline.visible_week_targets
  from owned_devices owned
  left join day_totals
    on day_totals.device_id = owned.device_id
  left join week_totals
    on week_totals.device_id = owned.device_id
  left join week_target_timeline
    on week_target_timeline.device_id = owned.device_id;
end;
$$;

drop function if exists public.apply_history_draft_from_app(
  uuid,
  jsonb,
  bigint,
  uuid
);

create or replace function public.apply_history_draft_from_app(
  p_device_id uuid,
  p_updates jsonb,
  p_base_revision bigint,
  p_draft_id uuid default gen_random_uuid(),
  p_current_week_start date default null,
  p_week_targets jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_updates jsonb := coalesce(p_updates, '[]'::jsonb);
  normalized_week_targets jsonb := p_week_targets;
  queued_command public.device_commands;
  update_entry jsonb;
  has_updates boolean;
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

  if jsonb_typeof(normalized_updates) <> 'array' then
    raise exception 'History draft updates must be an array.';
  end if;

  has_updates := jsonb_array_length(normalized_updates) > 0;

  if normalized_week_targets is not null then
    if p_current_week_start is null then
      raise exception 'current_week_start is required when week_targets are provided.';
    end if;

    if not public.week_targets_json_is_valid(normalized_week_targets) then
      raise exception 'week_targets must be a 21-entry array of weekly targets between 1 and 7.';
    end if;
  end if;

  if not has_updates and normalized_week_targets is null then
    raise exception 'History draft must contain at least one update or week_targets.';
  end if;

  if has_updates then
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
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'apply_history_draft',
    p_payload => jsonb_strip_nulls(
      jsonb_build_object(
        'base_revision', p_base_revision,
        'current_week_start', p_current_week_start,
        'updates', normalized_updates,
        'week_targets', normalized_week_targets
      )
    ),
    p_request_key => coalesce(p_draft_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
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
  current_habit_started_on_local date;
  current_week_start date;
  current_era_weekly_target integer;
  command_id uuid := null;
  command_status text := null;
  normalized_habit_name text := coalesce(nullif(btrim(coalesce(p_habit_name, '')), ''), 'Habit Name');
  normalized_daily_minimum text := nullif(btrim(coalesce(p_daily_minimum, '')), '');
  previous_weekly_target integer;
  queued_command public.device_commands;
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

  previous_weekly_target := greatest(1, least(coalesce(target_device.weekly_target, 1), 7));

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

  select
    habit_eras.weekly_target,
    habit_eras.habit_started_on_local
  into
    current_era_weekly_target,
    current_habit_started_on_local
  from public.board_habit_eras habit_eras
  where habit_eras.board_id = target_device.board_id
    and habit_eras.history_era = active_history_era;

  current_era_weekly_target := greatest(
    1,
    least(
      coalesce(current_era_weekly_target, previous_weekly_target, 1),
      7
    )
  );

  if current_habit_started_on_local is null then
    current_habit_started_on_local := public.logical_local_date_for_timestamp(
      current_history_era_started_at,
      target_device.timezone,
      target_device.day_reset_time
    );
  end if;

  current_week_start := public.history_week_start(
    public.logical_local_date_for_timestamp(
      now(),
      target_device.timezone,
      target_device.day_reset_time
    ),
    target_device.week_start
  );

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
    current_era_weekly_target,
    current_history_era_started_at,
    current_habit_started_on_local,
    null
  )
  on conflict (board_id, history_era)
  do update
  set
    habit_name = excluded.habit_name,
    daily_minimum = excluded.daily_minimum,
    started_at = excluded.started_at,
    habit_started_on_local = coalesce(public.board_habit_eras.habit_started_on_local, excluded.habit_started_on_local),
    ended_at = null;

  if previous_weekly_target is distinct from p_weekly_target then
    insert into public.board_weekly_target_changes (
      board_id,
      history_era,
      effective_week_start,
      weekly_target
    )
    values (
      target_device.board_id,
      active_history_era,
      current_week_start,
      p_weekly_target
    )
    on conflict (board_id, history_era, effective_week_start)
    do update
    set
      weekly_target = excluded.weekly_target,
      updated_at = now();

    queued_command := public.queue_device_command(
      p_device_id => p_device_id,
      p_kind => 'apply_device_settings',
      p_payload => jsonb_build_object(
        'weekly_target', p_weekly_target,
        'weekly_target_effective_week_start', current_week_start
      )
    );

    command_id := queued_command.id;
    command_status := queued_command.status;
  end if;

  return jsonb_build_object(
    'command_id', command_id,
    'current_week_start', current_week_start,
    'daily_minimum', normalized_daily_minimum,
    'device_id', target_device.id,
    'habit_name', normalized_habit_name,
    'habit_started_on_local', current_habit_started_on_local,
    'history_era', active_history_era,
    'status', command_status,
    'weekly_target', p_weekly_target
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
    and public.board_backup_is_valid(backups.board_days, backups.today_row, backups.settings, backups.week_targets)
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

  if not public.board_backup_is_valid(target_backup.board_days, target_backup.today_row, target_backup.settings, target_backup.week_targets) then
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
      'week_targets', target_backup.week_targets,
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

drop function if exists public.upload_device_runtime_snapshot(
  text,
  text,
  bigint,
  date,
  integer,
  jsonb,
  jsonb,
  text,
  timestamptz
);

create or replace function public.upload_device_runtime_snapshot(
  p_hardware_uid text,
  p_device_auth_token text,
  p_revision bigint,
  p_current_week_start date,
  p_today_row integer,
  p_board_days jsonb,
  p_settings jsonb default '{}'::jsonb,
  p_week_targets jsonb default null,
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
  normalized_week_targets jsonb := p_week_targets;
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

  if not public.week_targets_json_is_valid(normalized_week_targets) then
    raise exception 'week_targets must be a 21-entry array of weekly targets between 1 and 7.';
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
    normalized_hash := md5(p_board_days::text || normalized_settings::text || coalesce(normalized_week_targets::text, 'null'));
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
    week_targets,
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
    normalized_week_targets,
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
    week_targets = excluded.week_targets,
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
      week_targets,
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
      normalized_week_targets,
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
      week_targets = excluded.week_targets,
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

drop function if exists public.queue_friend_celebration_from_device(
  text,
  text,
  date,
  date,
  integer,
  integer,
  jsonb,
  text,
  jsonb,
  text
);

create or replace function public.queue_friend_celebration_from_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_source_local_date date,
  p_current_week_start date,
  p_today_row integer,
  p_weekly_target integer,
  p_board_days jsonb,
  p_palette_preset text,
  p_palette_custom jsonb default '{}'::jsonb,
  p_emitted_at text default null,
  p_week_targets jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  recipient record;
  expires_at timestamptz := now() + interval '60 seconds';
  emitted_at_text text := nullif(trim(coalesce(p_emitted_at, '')), '');
  expires_at_text text := to_char(timezone('UTC', expires_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  normalized_week_targets jsonb := p_week_targets;
  queued_count integer := 0;
  command_request_key text;
  queued_command public.device_commands;
begin
  if p_source_local_date is null then
    raise exception 'Source local date is required.';
  end if;

  if p_today_row is null or p_today_row < 0 or p_today_row > 6 then
    raise exception 'today_row must be between 0 and 6.';
  end if;

  if p_weekly_target is null or p_weekly_target < 1 or p_weekly_target > 7 then
    raise exception 'weekly_target must be between 1 and 7.';
  end if;

  if p_board_days is null or jsonb_typeof(p_board_days) <> 'array' then
    raise exception 'board_days must be a JSON array.';
  end if;

  if not public.week_targets_json_is_valid(normalized_week_targets) then
    raise exception 'week_targets must be a 21-entry array of weekly targets between 1 and 7.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  for recipient in
    select distinct
      recipient_devices.id as recipient_device_id
    from public.device_memberships viewers
    join public.device_memberships recipient_owners
      on recipient_owners.user_id = viewers.user_id
     and recipient_owners.role = 'owner'
     and recipient_owners.status = 'approved'
    join public.devices recipient_devices
      on recipient_devices.id = recipient_owners.device_id
    where viewers.device_id = authenticated_device.id
      and viewers.role = 'viewer'
      and viewers.status = 'approved'
      and viewers.celebration_enabled = true
      and recipient_devices.id <> authenticated_device.id
      and recipient_devices.last_seen_at >= now() - interval '2 minutes'
  loop
    command_request_key := format(
      'friend-celebration:%s:%s:%s',
      recipient.recipient_device_id,
      authenticated_device.id,
      p_source_local_date::text
    );

    select *
    into queued_command
    from public.device_commands commands
    where commands.request_key = command_request_key;

    if found then
      queued_count := queued_count + 1;
      continue;
    end if;

    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer friend celebration.'
    where commands.device_id = recipient.recipient_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'play_friend_celebration';

    begin
      insert into public.device_commands (
        device_id,
        kind,
        payload,
        requested_by_user_id,
        request_key
      )
      values (
        recipient.recipient_device_id,
        'play_friend_celebration',
        jsonb_strip_nulls(
          jsonb_build_object(
            'source_device_id', authenticated_device.id,
            'source_local_date', p_source_local_date::text,
            'expires_at', expires_at_text,
            'current_week_start', p_current_week_start::text,
            'today_row', p_today_row,
            'weekly_target', p_weekly_target,
            'week_targets', normalized_week_targets,
            'board_days', p_board_days,
            'palette_preset', coalesce(nullif(trim(coalesce(p_palette_preset, '')), ''), 'classic'),
            'palette_custom', coalesce(p_palette_custom, '{}'::jsonb),
            'emitted_at', coalesce(emitted_at_text, to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
          )
        ),
        null,
        command_request_key
      )
      returning * into queued_command;
    exception
      when unique_violation then
        select *
        into queued_command
        from public.device_commands commands
        where commands.request_key = command_request_key;
    end;

    queued_count := queued_count + 1;
  end loop;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return jsonb_build_object(
    'queued_count', queued_count,
    'expires_at', expires_at_text
  );
end;
$$;

commit;
