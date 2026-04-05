begin;

create or replace function public.persist_visible_week_targets_for_history_era(
  p_board_id uuid,
  p_history_era integer,
  p_current_week_start date,
  p_week_targets jsonb,
  p_fallback_weekly_target integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_target integer;
  existing_target integer;
  normalized_fallback_weekly_target integer := greatest(1, least(coalesce(p_fallback_weekly_target, 1), 7));
  week_index integer;
  week_start date;
begin
  if p_board_id is null or p_history_era is null or p_current_week_start is null or p_week_targets is null then
    return;
  end if;

  if not public.week_targets_json_is_valid(p_week_targets) then
    raise exception 'week_targets must be a 21-entry array of weekly targets between 1 and 7.';
  end if;

  for week_index in 0..20 loop
    week_start := p_current_week_start - (week_index * 7);
    desired_target := greatest(
      1,
      least(
        coalesce((p_week_targets ->> week_index)::integer, normalized_fallback_weekly_target),
        7
      )
    );
    existing_target := public.resolve_board_weekly_target_for_week(
      p_board_id,
      p_history_era,
      week_start,
      normalized_fallback_weekly_target
    );

    if desired_target is distinct from existing_target then
      insert into public.board_weekly_target_changes as changes (
        board_id,
        history_era,
        effective_week_start,
        weekly_target
      )
      values (
        p_board_id,
        p_history_era,
        week_start,
        desired_target
      )
      on conflict (board_id, history_era, effective_week_start)
      do update
      set
        weekly_target = excluded.weekly_target,
        updated_at = now();
    end if;
  end loop;
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
    public.resolve_board_weekly_target_for_week(
      owned.board_id,
      owned.active_history_era,
      owned.current_week_start,
      owned.era_weekly_target
    ) as current_weekly_target,
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
  active_history_era integer;
  current_era_weekly_target integer;
  has_updates boolean;
  normalized_updates jsonb := coalesce(p_updates, '[]'::jsonb);
  normalized_week_targets jsonb := p_week_targets;
  queued_command public.device_commands;
  target_device public.devices;
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

  if normalized_week_targets is not null then
    select devices.*
    into target_device
    from public.devices devices
    where devices.id = p_device_id
    for update;

    if not found then
      raise exception 'Device not found.';
    end if;

    active_history_era := coalesce(public.device_active_history_era(p_device_id), 1);

    select habit_eras.weekly_target
    into current_era_weekly_target
    from public.board_habit_eras habit_eras
    where habit_eras.board_id = target_device.board_id
      and habit_eras.history_era = active_history_era;

    current_era_weekly_target := greatest(
      1,
      least(
        coalesce(current_era_weekly_target, target_device.weekly_target, 1),
        7
      )
    );

    perform public.persist_visible_week_targets_for_history_era(
      target_device.board_id,
      active_history_era,
      p_current_week_start,
      normalized_week_targets,
      current_era_weekly_target
    );
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
  active_history_era integer := 1;
  authenticated_device public.devices;
  current_era_weekly_target integer;
  day_index integer;
  desired_state boolean;
  local_date date;
  normalized_hash text := nullif(trim(coalesce(p_board_hash, '')), '');
  normalized_settings jsonb := coalesce(p_settings, '{}'::jsonb);
  normalized_week_targets jsonb := p_week_targets;
  next_ambient_auto boolean := case when normalized_settings ? 'ambient_auto' then (normalized_settings ->> 'ambient_auto')::boolean else null end;
  next_brightness smallint := nullif(trim(coalesce(normalized_settings ->> 'brightness', '')), '')::smallint;
  next_day_reset_time time := nullif(trim(coalesce(normalized_settings ->> 'day_reset_time', '')), '')::time;
  next_name text := nullif(trim(coalesce(normalized_settings ->> 'name', '')), '');
  next_palette_custom jsonb := case
    when normalized_settings ? 'palette_custom' and jsonb_typeof(normalized_settings -> 'palette_custom') = 'object'
      then normalized_settings -> 'palette_custom'
    else null
  end;
  next_palette_preset text := nullif(trim(coalesce(normalized_settings ->> 'palette_preset', '')), '');
  next_reward_enabled boolean := case when normalized_settings ? 'reward_enabled' then (normalized_settings ->> 'reward_enabled')::boolean else null end;
  next_reward_trigger public.device_reward_trigger := nullif(trim(coalesce(normalized_settings ->> 'reward_trigger', '')), '')::public.device_reward_trigger;
  next_reward_type public.device_reward_type := nullif(trim(coalesce(normalized_settings ->> 'reward_type', '')), '')::public.device_reward_type;
  next_timezone text := nullif(trim(coalesce(normalized_settings ->> 'timezone', '')), '');
  next_weekly_target smallint := nullif(trim(coalesce(normalized_settings ->> 'weekly_target', '')), '')::smallint;
  oldest_visible date;
  should_commit_history boolean := true;
  snapshot_row public.device_runtime_snapshots;
  visible_until date;
  week_entry jsonb;
  week_index integer;
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

  select habit_eras.weekly_target
  into current_era_weekly_target
  from public.board_habit_eras habit_eras
  where habit_eras.board_id = authenticated_device.board_id
    and habit_eras.history_era = active_history_era;

  current_era_weekly_target := greatest(
    1,
    least(
      coalesce(current_era_weekly_target, authenticated_device.weekly_target, 1),
      7
    )
  );

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

  if should_commit_history and authenticated_device.board_id is not null and normalized_week_targets is not null then
    perform public.persist_visible_week_targets_for_history_era(
      authenticated_device.board_id,
      active_history_era,
      p_current_week_start,
      normalized_week_targets,
      current_era_weekly_target
    );
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

commit;
