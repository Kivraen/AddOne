begin;

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

commit;
