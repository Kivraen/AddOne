begin;

create or replace function public.set_day_state_from_app(
  p_device_id uuid,
  p_local_date date,
  p_is_done boolean,
  p_client_event_id uuid default gen_random_uuid(),
  p_effective_at timestamptz default now()
)
returns public.device_day_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recorded_event public.device_day_events;
  command_key text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can change device state from the app.';
  end if;

  recorded_event := public.record_day_state_event(
    p_device_id => p_device_id,
    p_local_date => p_local_date,
    p_is_done => p_is_done,
    p_source => 'cloud',
    p_client_event_id => p_client_event_id,
    p_effective_at => p_effective_at
  );

  command_key := coalesce(recorded_event.client_event_id::text, gen_random_uuid()::text);

  perform public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'set_day_state',
    p_payload => jsonb_build_object(
      'local_date', p_local_date,
      'is_done', p_is_done,
      'effective_at', p_effective_at
    ),
    p_request_key => command_key
  );

  return recorded_event;
end;
$$;

create policy "device_memberships_update_for_self_or_owner"
on public.device_memberships
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_device_owner(device_id)
)
with check (
  user_id = auth.uid()
  or public.is_device_owner(device_id)
);

revoke all on function public.set_day_state_from_app(uuid, date, boolean, uuid, timestamptz) from public;

grant execute on function public.set_day_state_from_app(uuid, date, boolean, uuid, timestamptz) to authenticated;

commit;
