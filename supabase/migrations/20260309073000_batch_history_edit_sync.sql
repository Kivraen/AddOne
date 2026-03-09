begin;

alter type public.device_command_kind add value if not exists 'sync_day_states_batch';

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
      and commands.status in ('queued', 'delivered')
      and (
        (commands.kind = 'set_day_state' and commands.payload ->> 'local_date' = target_local_date)
        or (
          commands.kind = 'sync_day_states_batch'
          and exists (
            select 1
            from jsonb_array_elements(coalesce(commands.payload -> 'updates', '[]'::jsonb)) as existing_update
            where existing_update ->> 'local_date' = target_local_date
          )
        )
      );
  elsif p_kind = 'sync_day_states_batch' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer history batch.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and (
        commands.kind = 'sync_day_states_batch'
        or (
          commands.kind = 'set_day_state'
          and exists (
            select 1
            from jsonb_array_elements(coalesce(normalized_payload -> 'updates', '[]'::jsonb)) as incoming_update
            where incoming_update ->> 'local_date' = commands.payload ->> 'local_date'
          )
        )
      );
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

create or replace function public.set_day_states_batch_from_app(
  p_device_id uuid,
  p_updates jsonb,
  p_batch_event_id uuid default gen_random_uuid(),
  p_effective_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  update_entry jsonb;
  normalized_updates jsonb := coalesce(p_updates, '[]'::jsonb);
  local_date_value date;
  is_done_value boolean;
  applied_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can batch-edit device history from the app.';
  end if;

  if jsonb_typeof(normalized_updates) <> 'array' or jsonb_array_length(normalized_updates) = 0 then
    raise exception 'Batch updates must contain at least one entry.';
  end if;

  for update_entry in
    select value
    from jsonb_array_elements(normalized_updates)
  loop
    local_date_value := nullif(update_entry ->> 'local_date', '')::date;
    is_done_value := (update_entry ->> 'is_done')::boolean;

    if local_date_value is null then
      raise exception 'Each batch history update requires local_date.';
    end if;

    if is_done_value is null then
      raise exception 'Each batch history update requires is_done.';
    end if;

    perform public.record_day_state_event(
      p_device_id => p_device_id,
      p_local_date => local_date_value,
      p_is_done => is_done_value,
      p_source => 'cloud',
      p_effective_at => p_effective_at
    );

    applied_count := applied_count + 1;
  end loop;

  perform public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'sync_day_states_batch',
    p_payload => jsonb_build_object(
      'batch_event_id', p_batch_event_id,
      'effective_at', p_effective_at,
      'updates', normalized_updates
    ),
    p_request_key => p_batch_event_id::text
  );

  return jsonb_build_object(
    'applied_count', applied_count,
    'batch_event_id', p_batch_event_id,
    'effective_at', p_effective_at
  );
end;
$$;

revoke all on function public.set_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz) from public;
grant execute on function public.set_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz) to authenticated;

commit;
