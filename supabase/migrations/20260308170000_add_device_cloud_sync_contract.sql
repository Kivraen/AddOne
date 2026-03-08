begin;

alter table public.devices
  add column if not exists device_auth_token_hash text;

create or replace function public.register_factory_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_name text default null,
  p_hardware_profile text default null,
  p_firmware_version text default null
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_hardware_uid text := nullif(trim(p_hardware_uid), '');
  normalized_device_auth_token text := nullif(trim(coalesce(p_device_auth_token, '')), '');
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  normalized_profile text := nullif(trim(coalesce(p_hardware_profile, '')), '');
  normalized_firmware text := nullif(trim(coalesce(p_firmware_version, '')), '');
  registered_device public.devices;
begin
  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  if normalized_device_auth_token is null then
    raise exception 'Device auth token is required.';
  end if;

  select *
  into registered_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if found then
    update public.devices devices
    set
      device_auth_token_hash = public.hash_claim_token(normalized_device_auth_token),
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version)
    where devices.id = registered_device.id
    returning * into registered_device;
  else
    insert into public.devices (
      hardware_uid,
      device_auth_token_hash,
      hardware_profile,
      name,
      firmware_version
    )
    values (
      normalized_hardware_uid,
      public.hash_claim_token(normalized_device_auth_token),
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, 'unknown')
    )
    returning * into registered_device;
  end if;

  return registered_device;
end;
$$;

create or replace function public.authenticate_device(
  p_hardware_uid text,
  p_device_auth_token text
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_hardware_uid text := nullif(trim(p_hardware_uid), '');
  normalized_device_auth_token text := nullif(trim(coalesce(p_device_auth_token, '')), '');
  authenticated_device public.devices;
begin
  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  if normalized_device_auth_token is null then
    raise exception 'Device auth token is required.';
  end if;

  select *
  into authenticated_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  if authenticated_device.device_auth_token_hash is null then
    raise exception 'Device auth token is not registered.';
  end if;

  if authenticated_device.device_auth_token_hash <> public.hash_claim_token(normalized_device_auth_token) then
    raise exception 'Device authentication failed.';
  end if;

  return authenticated_device;
end;
$$;

drop function if exists public.redeem_device_onboarding_claim(text, text, text, text, text);

create or replace function public.redeem_device_onboarding_claim(
  p_claim_token text,
  p_hardware_uid text,
  p_hardware_profile text default null,
  p_firmware_version text default null,
  p_name text default null,
  p_device_auth_token text default null
)
returns public.device_onboarding_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_session public.device_onboarding_sessions;
  claimed_device public.devices;
  normalized_token text := nullif(trim(coalesce(p_claim_token, '')), '');
  normalized_device_auth_token text := nullif(trim(coalesce(p_device_auth_token, '')), '');
begin
  if normalized_token is null then
    raise exception 'Claim token is required.';
  end if;

  select *
  into current_session
  from public.device_onboarding_sessions sessions
  where sessions.claim_token_hash = public.hash_claim_token(normalized_token)
    and sessions.status in ('awaiting_ap', 'awaiting_cloud')
  for update;

  if not found then
    raise exception 'Onboarding session is invalid or already used.';
  end if;

  if current_session.expires_at <= now() then
    update public.device_onboarding_sessions sessions
    set
      status = 'expired',
      last_error = coalesce(sessions.last_error, 'Session expired before the claim was redeemed.')
    where sessions.id = current_session.id
    returning * into current_session;

    return current_session;
  end if;

  claimed_device := public.claim_device_for_user(
    p_owner_user_id => current_session.user_id,
    p_hardware_uid => p_hardware_uid,
    p_name => p_name,
    p_hardware_profile => coalesce(nullif(trim(coalesce(p_hardware_profile, '')), ''), current_session.hardware_profile_hint),
    p_firmware_version => p_firmware_version
  );

  if normalized_device_auth_token is not null then
    update public.devices devices
    set device_auth_token_hash = coalesce(devices.device_auth_token_hash, public.hash_claim_token(normalized_device_auth_token))
    where devices.id = claimed_device.id
    returning * into claimed_device;
  end if;

  update public.device_onboarding_sessions sessions
  set
    device_id = claimed_device.id,
    status = 'claimed',
    waiting_for_device_at = coalesce(sessions.waiting_for_device_at, now()),
    claimed_at = now(),
    last_error = null
  where sessions.id = current_session.id
  returning * into current_session;

  return current_session;
end;
$$;

create or replace function public.device_heartbeat(
  p_hardware_uid text,
  p_device_auth_token text,
  p_firmware_version text default null,
  p_hardware_profile text default null,
  p_last_sync_at timestamptz default now()
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  normalized_profile text := nullif(trim(coalesce(p_hardware_profile, '')), '');
  normalized_firmware text := nullif(trim(coalesce(p_firmware_version, '')), '');
begin
  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  update public.devices devices
  set
    hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
    firmware_version = coalesce(normalized_firmware, devices.firmware_version),
    last_seen_at = now(),
    last_sync_at = coalesce(p_last_sync_at, now())
  where devices.id = authenticated_device.id
  returning * into authenticated_device;

  return authenticated_device;
end;
$$;

create or replace function public.pull_device_commands(
  p_hardware_uid text,
  p_device_auth_token text,
  p_limit integer default 20
)
returns setof public.device_commands
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  normalized_limit integer := greatest(coalesce(p_limit, 20), 1);
begin
  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return query
  with selected_commands as (
    select commands.id
    from public.device_commands commands
    where commands.device_id = authenticated_device.id
      and commands.status in ('queued', 'delivered')
    order by commands.requested_at asc
    limit normalized_limit
    for update skip locked
  )
  update public.device_commands commands
  set
    status = case when commands.status = 'queued' then 'delivered' else commands.status end,
    delivered_at = coalesce(commands.delivered_at, now())
  from selected_commands
  where commands.id = selected_commands.id
  returning commands.*;
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

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return updated_command;
end;
$$;

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

  recorded_event := public.record_day_state_event(
    p_device_id => authenticated_device.id,
    p_local_date => p_local_date,
    p_is_done => p_is_done,
    p_source => 'device',
    p_device_event_id => p_device_event_id,
    p_effective_at => p_effective_at
  );

  update public.devices devices
  set
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return recorded_event;
end;
$$;

revoke all on function public.register_factory_device(text, text, text, text, text) from public;
revoke all on function public.authenticate_device(text, text) from public;
revoke all on function public.device_heartbeat(text, text, text, text, timestamptz) from public;
revoke all on function public.pull_device_commands(text, text, integer) from public;
revoke all on function public.ack_device_command(text, text, uuid, public.device_command_status, text) from public;
revoke all on function public.record_day_state_from_device(text, text, date, boolean, text, timestamptz) from public;
revoke all on function public.redeem_device_onboarding_claim(text, text, text, text, text, text) from public;

grant execute on function public.register_factory_device(text, text, text, text, text) to service_role;
grant execute on function public.redeem_device_onboarding_claim(text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.device_heartbeat(text, text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.pull_device_commands(text, text, integer) to anon, authenticated;
grant execute on function public.ack_device_command(text, text, uuid, public.device_command_status, text) to anon, authenticated;
grant execute on function public.record_day_state_from_device(text, text, date, boolean, text, timestamptz) to anon, authenticated;

commit;
