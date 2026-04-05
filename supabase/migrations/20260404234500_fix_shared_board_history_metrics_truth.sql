drop function if exists public.list_shared_board_history_metrics_for_user(uuid[]);

create function public.list_shared_board_history_metrics_for_user(p_device_ids uuid[])
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
  with accessible_devices as (
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
      and memberships.status = 'approved'
      and devices.id = any(p_device_ids)
  ),
  day_totals as (
    select
      accessible.device_id,
      count(*) filter (where states.is_done) as recorded_days_total
    from accessible_devices accessible
    left join public.device_day_states states
      on states.device_id = accessible.device_id
     and states.history_era = accessible.active_history_era
    group by accessible.device_id
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
        accessible.device_id,
        public.history_week_start(states.local_date, accessible.week_start) as week_start,
        count(*) filter (where states.is_done) as done_days,
        public.resolve_board_weekly_target_for_week(
          accessible.board_id,
          accessible.active_history_era,
          public.history_week_start(states.local_date, accessible.week_start),
          accessible.era_weekly_target
        ) as weekly_target
      from accessible_devices accessible
      left join public.device_day_states states
        on states.device_id = accessible.device_id
       and states.history_era = accessible.active_history_era
      group by
        accessible.device_id,
        accessible.board_id,
        accessible.active_history_era,
        accessible.era_weekly_target,
        public.history_week_start(states.local_date, accessible.week_start)
    ) weekly
    group by weekly.device_id
  ),
  week_target_timeline as (
    select
      accessible.device_id,
      jsonb_agg(
        public.resolve_board_weekly_target_for_week(
          accessible.board_id,
          accessible.active_history_era,
          accessible.current_week_start - (offsets.week_index * 7),
          accessible.era_weekly_target
        )
        order by offsets.week_index
      ) as visible_week_targets
    from accessible_devices accessible
    cross join generate_series(0, 20) as offsets(week_index)
    group by accessible.device_id
  )
  select
    accessible.device_id,
    coalesce(day_totals.recorded_days_total, 0) as recorded_days_total,
    coalesce(week_totals.successful_weeks_total, 0) as successful_weeks_total,
    accessible.history_era_started_at,
    coalesce(accessible.era_habit_name, accessible.device_name) as current_habit_name,
    accessible.era_daily_minimum as current_daily_minimum,
    public.resolve_board_weekly_target_for_week(
      accessible.board_id,
      accessible.active_history_era,
      accessible.current_week_start,
      accessible.era_weekly_target
    ) as current_weekly_target,
    coalesce(
      accessible.era_habit_started_on_local,
      public.logical_local_date_for_timestamp(
        accessible.history_era_started_at,
        accessible.timezone,
        accessible.day_reset_time
      )
    ) as current_habit_started_on_local,
    week_target_timeline.visible_week_targets
  from accessible_devices accessible
  left join day_totals
    on day_totals.device_id = accessible.device_id
  left join week_totals
    on week_totals.device_id = accessible.device_id
  left join week_target_timeline
    on week_target_timeline.device_id = accessible.device_id;
end;
$$;

revoke all on function public.list_shared_board_history_metrics_for_user(uuid[]) from public;
grant execute on function public.list_shared_board_history_metrics_for_user(uuid[]) to authenticated;
