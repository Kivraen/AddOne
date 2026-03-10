begin;

alter type public.device_command_kind add value if not exists 'enter_wifi_recovery';

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
      last_error = 'Superseded by a newer day-state request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'set_day_state'
      and commands.payload ->> 'local_date' = target_local_date;
  elsif p_kind = 'apply_history_draft' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer history draft.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'apply_history_draft';
  elsif p_kind = 'apply_device_settings' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer settings draft.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'apply_device_settings';
  elsif p_kind = 'request_runtime_snapshot' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer runtime refresh request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'request_runtime_snapshot';
  elsif p_kind = 'enter_wifi_recovery' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer Wi-Fi recovery request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'enter_wifi_recovery';
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

create or replace function public.enter_wifi_recovery_from_app(
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_command public.device_commands;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can start Wi-Fi recovery from the app.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'enter_wifi_recovery',
    p_payload => jsonb_build_object(),
    p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'status', queued_command.status
  );
end;
$$;

revoke all on function public.enter_wifi_recovery_from_app(uuid, uuid) from public;
grant execute on function public.enter_wifi_recovery_from_app(uuid, uuid) to authenticated;

commit;
