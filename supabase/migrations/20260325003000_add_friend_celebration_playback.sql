begin;

alter type public.device_command_kind add value if not exists 'play_friend_celebration';

alter table public.device_memberships
  add column if not exists celebration_enabled boolean not null default true;

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
  elsif p_kind = 'factory_reset' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer factory reset request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'factory_reset';
  elsif p_kind = 'restore_board_backup' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer restore request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'restore_board_backup';
  elsif p_kind = 'reset_history' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer history reset request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'reset_history';
  elsif p_kind = 'play_friend_celebration' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer friend celebration.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'play_friend_celebration';
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

create or replace function public.set_shared_board_celebration_enabled(
  p_device_id uuid,
  p_membership_id uuid,
  p_enabled boolean
)
returns public.device_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_membership public.device_memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into viewer_membership
  from public.device_memberships memberships
  where memberships.id = p_membership_id
    and memberships.device_id = p_device_id
  for update;

  if not found then
    raise exception 'Shared board membership not found.';
  end if;

  if viewer_membership.user_id <> auth.uid() then
    raise exception 'You can only update your own shared-board preferences.';
  end if;

  if viewer_membership.role <> 'viewer' then
    raise exception 'Only viewer memberships can change celebration preferences.';
  end if;

  if viewer_membership.status <> 'approved' then
    raise exception 'Only approved shared boards can change celebration preferences.';
  end if;

  update public.device_memberships memberships
  set celebration_enabled = coalesce(p_enabled, true)
  where memberships.id = viewer_membership.id
  returning * into viewer_membership;

  return viewer_membership;
end;
$$;

revoke all on function public.set_shared_board_celebration_enabled(uuid, uuid, boolean) from public;
grant execute on function public.set_shared_board_celebration_enabled(uuid, uuid, boolean) to authenticated;

create or replace function public.queue_friend_celebration_from_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_source_local_date date,
  p_current_week_start date,
  p_today_row integer,
  p_weekly_target integer,
  p_board_days jsonb,
  p_palette_preset text,
  p_palette_custom jsonb default '{}'::jsonb,
  p_emitted_at text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  recipient record;
  expires_at timestamptz := now() + interval '60 seconds';
  emitted_at_text text := nullif(trim(coalesce(p_emitted_at, '')), '');
  expires_at_text text := to_char(timezone('UTC', expires_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  queued_count integer := 0;
  request_key text;
begin
  if p_source_local_date is null then
    raise exception 'Source local date is required.';
  end if;

  if p_today_row is null or p_today_row < 0 or p_today_row > 6 then
    raise exception 'today_row must be between 0 and 6.';
  end if;

  if p_weekly_target is null or p_weekly_target < 1 or p_weekly_target > 7 then
    raise exception 'weekly_target must be between 1 and 7.';
  end if;

  if p_board_days is null or jsonb_typeof(p_board_days) <> 'array' then
    raise exception 'board_days must be a JSON array.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  for recipient in
    select distinct
      recipient_devices.id as recipient_device_id
    from public.device_memberships viewers
    join public.device_memberships recipient_owners
      on recipient_owners.user_id = viewers.user_id
     and recipient_owners.role = 'owner'
     and recipient_owners.status = 'approved'
    join public.devices recipient_devices
      on recipient_devices.id = recipient_owners.device_id
    where viewers.device_id = authenticated_device.id
      and viewers.role = 'viewer'
      and viewers.status = 'approved'
      and viewers.celebration_enabled = true
      and recipient_devices.id <> authenticated_device.id
      and recipient_devices.last_seen_at >= now() - interval '2 minutes'
  loop
    request_key := format(
      'friend-celebration:%s:%s:%s',
      recipient.recipient_device_id,
      authenticated_device.id,
      p_source_local_date::text
    );

    perform public.queue_device_command(
      p_device_id => recipient.recipient_device_id,
      p_kind => 'play_friend_celebration',
      p_payload => jsonb_build_object(
        'source_device_id', authenticated_device.id,
        'source_local_date', p_source_local_date::text,
        'expires_at', expires_at_text,
        'current_week_start', p_current_week_start::text,
        'today_row', p_today_row,
        'weekly_target', p_weekly_target,
        'board_days', p_board_days,
        'palette_preset', coalesce(nullif(trim(coalesce(p_palette_preset, '')), ''), 'classic'),
        'palette_custom', coalesce(p_palette_custom, '{}'::jsonb),
        'emitted_at', coalesce(emitted_at_text, to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      ),
      p_request_key => request_key
    );

    queued_count := queued_count + 1;
  end loop;

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return jsonb_build_object(
    'queued_count', queued_count,
    'expires_at', expires_at_text
  );
end;
$$;

revoke all on function public.queue_friend_celebration_from_device(text, text, date, date, integer, integer, jsonb, text, jsonb, text) from public;
grant execute on function public.queue_friend_celebration_from_device(text, text, date, date, integer, integer, jsonb, text, jsonb, text) to anon, authenticated;

commit;
