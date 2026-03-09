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
  recorded_event public.device_day_events;
begin
  if nullif(trim(coalesce(p_device_event_id, '')), '') is null then
    raise exception 'Device event ID is required.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

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
  on conflict (device_id, device_event_id) do update
  set
    desired_state = excluded.desired_state,
    effective_at = excluded.effective_at
  where excluded.effective_at >= public.device_day_events.effective_at
  returning * into recorded_event;

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
