do $$
declare
  history_payload record;
begin
  for history_payload in
    select distinct on (devices.board_id, coalesce(boards.active_history_era, 1))
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
    order by
      devices.board_id,
      coalesce(boards.active_history_era, 1),
      commands.requested_at desc,
      commands.id desc
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
