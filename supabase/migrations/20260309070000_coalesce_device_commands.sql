begin;

create or replace function public.queue_device_command(
  p_device_id uuid,
  p_kind public.device_command_kind,
  p_payload jsonb default '{}'::jsonb,
  p_request_key text default null
)
returns public.device_commands
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_command public.device_commands;
  normalized_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  target_local_date text := nullif(normalized_payload ->> 'local_date', '');
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can queue device commands.';
  end if;

  if p_request_key is not null then
    select *
    into queued_command
    from public.device_commands commands
    where commands.request_key = p_request_key;

    if found then
      return queued_command;
    end if;
  end if;

  if p_kind = 'set_day_state' and target_local_date is not null then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer cloud day-state command.'
    where commands.device_id = p_device_id
      and commands.kind = 'set_day_state'
      and commands.status in ('queued', 'delivered')
      and commands.payload ->> 'local_date' = target_local_date;
  elsif p_kind = 'sync_settings' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer settings sync.'
    where commands.device_id = p_device_id
      and commands.kind = 'sync_settings'
      and commands.status in ('queued', 'delivered');
  end if;

  insert into public.device_commands (
    device_id,
    kind,
    payload,
    requested_by_user_id,
    request_key
  )
  values (
    p_device_id,
    p_kind,
    normalized_payload,
    auth.uid(),
    p_request_key
  )
  returning * into queued_command;

  return queued_command;
end;
$$;

commit;
