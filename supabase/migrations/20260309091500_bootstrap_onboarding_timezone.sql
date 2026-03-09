begin;

alter table public.device_onboarding_sessions
  add column if not exists bootstrap_timezone text,
  add column if not exists bootstrap_day_reset_time time;

drop function if exists public.create_device_onboarding_session(text);

create or replace function public.create_device_onboarding_session(
  p_hardware_profile_hint text default null,
  p_bootstrap_timezone text default null,
  p_bootstrap_day_reset_time time default '00:00:00'
)
returns table (
  id uuid,
  status public.device_onboarding_status,
  claim_token text,
  expires_at timestamptz,
  created_at timestamptz,
  hardware_profile_hint text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  claim_token text := encode(extensions.gen_random_bytes(18), 'hex');
  new_session public.device_onboarding_sessions;
  normalized_bootstrap_timezone text := nullif(trim(coalesce(p_bootstrap_timezone, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.device_onboarding_sessions sessions
  set
    status = 'expired',
    last_error = coalesce(sessions.last_error, 'Session expired before the device completed onboarding.')
  where sessions.user_id = current_user_id
    and sessions.status in ('awaiting_ap', 'awaiting_cloud')
    and sessions.expires_at <= now();

  update public.device_onboarding_sessions sessions
  set
    status = 'cancelled',
    cancelled_at = now(),
    last_error = coalesce(sessions.last_error, 'Superseded by a newer onboarding session.')
  where sessions.user_id = current_user_id
    and sessions.status in ('awaiting_ap', 'awaiting_cloud');

  insert into public.device_onboarding_sessions (
    user_id,
    hardware_profile_hint,
    claim_token_hash,
    claim_token_prefix,
    bootstrap_timezone,
    bootstrap_day_reset_time
  )
  values (
    current_user_id,
    nullif(trim(coalesce(p_hardware_profile_hint, '')), ''),
    public.hash_claim_token(claim_token),
    upper(substr(claim_token, 1, 6)),
    normalized_bootstrap_timezone,
    coalesce(p_bootstrap_day_reset_time, '00:00:00'::time)
  )
  returning * into new_session;

  return query
  select
    new_session.id,
    new_session.status,
    claim_token,
    new_session.expires_at,
    new_session.created_at,
    new_session.hardware_profile_hint;
end;
$$;

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

  update public.devices devices
  set
    timezone = coalesce(current_session.bootstrap_timezone, devices.timezone),
    day_reset_time = coalesce(current_session.bootstrap_day_reset_time, devices.day_reset_time)
  where devices.id = claimed_device.id
  returning * into claimed_device;

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

revoke all on function public.create_device_onboarding_session(text, text, time) from public;
grant execute on function public.create_device_onboarding_session(text, text, time) to authenticated;

commit;
