begin;

alter table public.devices
  alter column week_start set default 'monday';

update public.devices
set week_start = 'monday'
where week_start = 'locale';

create or replace function public.request_day_state_from_app(
  p_device_id uuid,
  p_local_date date,
  p_is_done boolean,
  p_client_event_id uuid default gen_random_uuid(),
  p_effective_at timestamptz default now()
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
    raise exception 'Only the owner can change device state from the app.';
  end if;

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'set_day_state',
    p_payload => jsonb_build_object(
      'local_date', p_local_date,
      'is_done', p_is_done,
      'effective_at', p_effective_at
    ),
    p_request_key => coalesce(p_client_event_id::text, gen_random_uuid()::text)
  );

  return jsonb_build_object(
    'command_id', queued_command.id,
    'effective_at', p_effective_at,
    'status', queued_command.status
  );
end;
$$;

create or replace function public.request_day_states_batch_from_app(
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
  normalized_updates jsonb := coalesce(p_updates, '[]'::jsonb);
  queued_command public.device_commands;
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

  queued_command := public.queue_device_command(
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
    'command_id', queued_command.id,
    'batch_event_id', p_batch_event_id,
    'effective_at', p_effective_at,
    'status', queued_command.status
  );
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
        on conflict (device_id, device_event_id) do nothing;
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
        on conflict (device_id, device_event_id) do nothing;
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

revoke all on function public.request_day_state_from_app(uuid, date, boolean, uuid, timestamptz) from public;
revoke all on function public.request_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz) from public;

grant execute on function public.request_day_state_from_app(uuid, date, boolean, uuid, timestamptz) to authenticated;
grant execute on function public.request_day_states_batch_from_app(uuid, jsonb, uuid, timestamptz) to authenticated;

commit;
