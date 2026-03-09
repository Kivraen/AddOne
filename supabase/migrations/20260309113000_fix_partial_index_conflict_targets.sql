begin;

create or replace function public.record_day_state_from_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_local_date date,
  p_is_done boolean,
  p_device_event_id text,
  p_effective_at timestamptz default now()
)
returns public.device_day_events
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  existing_event public.device_day_events;
  recorded_event public.device_day_events;
begin
  if nullif(trim(coalesce(p_device_event_id, '')), '') is null then
    raise exception 'Device event ID is required.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  select *
  into existing_event
  from public.device_day_events
  where device_id = authenticated_device.id
    and device_event_id = p_device_event_id
  limit 1;

  if found then
    if existing_event.effective_at is null or p_effective_at >= existing_event.effective_at then
      update public.device_day_events
      set
        local_date = p_local_date,
        desired_state = p_is_done,
        effective_at = p_effective_at,
        source = 'device'
      where id = existing_event.id
      returning * into recorded_event;
    else
      recorded_event := existing_event;
    end if;
  else
    insert into public.device_day_events (
      device_id,
      local_date,
      desired_state,
      source,
      actor_user_id,
      client_event_id,
      device_event_id,
      effective_at
    )
    values (
      authenticated_device.id,
      p_local_date,
      p_is_done,
      'device',
      null,
      null,
      p_device_event_id,
      p_effective_at
    )
    returning * into recorded_event;
  end if;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return recorded_event;
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
  update_entry jsonb;
  event_effective_at timestamptz;
  event_local_date date;
  event_is_done boolean;
  event_id text;
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

  if p_status = 'applied' then
    if updated_command.kind = 'set_day_state' then
      event_local_date := nullif(updated_command.payload ->> 'local_date', '')::date;
      event_is_done := (updated_command.payload ->> 'is_done')::boolean;
      event_effective_at := coalesce(
        nullif(updated_command.payload ->> 'effective_at', '')::timestamptz,
        updated_command.applied_at,
        now()
      );
      event_id := format('cmd:%s:%s', updated_command.id, coalesce(event_local_date::text, 'unknown'));

      if event_local_date is not null and event_is_done is not null then
        insert into public.device_day_events (
          device_id,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          event_effective_at
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
      end if;
    elsif updated_command.kind = 'sync_day_states_batch' then
      event_effective_at := coalesce(
        nullif(updated_command.payload ->> 'effective_at', '')::timestamptz,
        updated_command.applied_at,
        now()
      );

      for update_entry in
        select value
        from jsonb_array_elements(coalesce(updated_command.payload -> 'updates', '[]'::jsonb))
      loop
        event_local_date := nullif(update_entry ->> 'local_date', '')::date;
        event_is_done := (update_entry ->> 'is_done')::boolean;
        event_id := format('cmd:%s:%s', updated_command.id, coalesce(event_local_date::text, 'unknown'));

        if event_local_date is null or event_is_done is null then
          continue;
        end if;

        insert into public.device_day_events (
          device_id,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          coalesce(nullif(update_entry ->> 'effective_at', '')::timestamptz, event_effective_at)
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
      end loop;
    end if;
  end if;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return updated_command;
end;
$$;

commit;
