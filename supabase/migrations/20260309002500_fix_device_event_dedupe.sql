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
    if p_effective_at >= existing_event.effective_at then
      update public.device_day_events
      set
        desired_state = p_is_done,
        effective_at = p_effective_at
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

revoke all on function public.record_day_state_from_device(text, text, date, boolean, text, timestamptz) from public;
grant execute on function public.record_day_state_from_device(text, text, date, boolean, text, timestamptz) to anon, authenticated;

commit;
