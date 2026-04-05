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
  normalized_fallback_weekly_target integer := greatest(1, least(coalesce(p_fallback_weekly_target, 1), 7));
  oldest_visible_week_start date := p_current_week_start - 140;
  target_before_visible integer;
begin
  if p_board_id is null or p_history_era is null or p_current_week_start is null or p_week_targets is null then
    return;
  end if;

  if not public.week_targets_json_is_valid(p_week_targets) then
    raise exception 'week_targets must be a 21-entry array of weekly targets between 1 and 7.';
  end if;

  delete from public.board_weekly_target_changes changes
  where changes.board_id = p_board_id
    and changes.history_era = p_history_era
    and changes.effective_week_start between oldest_visible_week_start and p_current_week_start;

  target_before_visible := public.resolve_board_weekly_target_for_week(
    p_board_id,
    p_history_era,
    oldest_visible_week_start - 7,
    normalized_fallback_weekly_target
  );

  insert into public.board_weekly_target_changes as changes (
    board_id,
    history_era,
    effective_week_start,
    weekly_target
  )
  with desired_window as (
    select
      p_current_week_start - (week_index * 7) as week_start,
      greatest(
        1,
        least(
          coalesce((p_week_targets ->> week_index)::integer, normalized_fallback_weekly_target),
          7
        )
      ) as desired_target
    from generate_series(20, 0, -1) as week_index
  ),
  change_points as (
    select
      desired_window.week_start,
      desired_window.desired_target,
      lag(desired_window.desired_target, 1, target_before_visible) over (order by desired_window.week_start) as previous_target
    from desired_window
  )
  select
    p_board_id,
    p_history_era,
    change_points.week_start,
    change_points.desired_target
  from change_points
  where change_points.desired_target is distinct from change_points.previous_target
  on conflict (board_id, history_era, effective_week_start)
  do update
  set
    weekly_target = excluded.weekly_target,
    updated_at = now();
end;
$$;

do $$
declare
  history_payload record;
begin
  for history_payload in
    select distinct on (commands.device_id)
      devices.board_id,
      coalesce(boards.active_history_era, 1) as active_history_era,
      greatest(
        1,
        least(
          coalesce(habit_eras.weekly_target, devices.weekly_target, 1),
          7
        )
      ) as fallback_weekly_target,
      (commands.payload ->> 'current_week_start')::date as current_week_start,
      commands.payload -> 'week_targets' as week_targets
    from public.device_commands commands
    join public.devices devices
      on devices.id = commands.device_id
    left join public.boards boards
      on boards.id = devices.board_id
    left join public.board_habit_eras habit_eras
      on habit_eras.board_id = devices.board_id
     and habit_eras.history_era = coalesce(boards.active_history_era, 1)
    where commands.kind = 'apply_history_draft'
      and commands.status = 'applied'
      and devices.board_id is not null
      and commands.payload ? 'current_week_start'
      and jsonb_typeof(commands.payload -> 'week_targets') = 'array'
      and (
        boards.history_era_started_at is null
        or commands.requested_at >= boards.history_era_started_at
      )
    order by commands.device_id, commands.requested_at desc
  loop
    perform public.persist_visible_week_targets_for_history_era(
      history_payload.board_id,
      history_payload.active_history_era,
      history_payload.current_week_start,
      history_payload.week_targets,
      history_payload.fallback_weekly_target
    );
  end loop;
end;
$$;
