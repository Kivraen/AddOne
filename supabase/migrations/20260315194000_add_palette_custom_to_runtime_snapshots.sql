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
  where devices.id = authenticated_device.id;

  return snapshot_row;
end;
$$;
