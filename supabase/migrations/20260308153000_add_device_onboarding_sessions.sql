begin;

create type public.device_onboarding_status as enum (
  'awaiting_ap',
  'awaiting_cloud',
  'claimed',
  'expired',
  'cancelled',
  'failed'
);

create table public.device_onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  hardware_profile_hint text,
  claim_token_hash text not null unique,
  claim_token_prefix text not null,
  status public.device_onboarding_status not null default 'awaiting_ap',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  waiting_for_device_at timestamptz,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index device_onboarding_sessions_one_active_per_user_idx
  on public.device_onboarding_sessions (user_id)
  where status in ('awaiting_ap', 'awaiting_cloud');

create index device_onboarding_sessions_user_status_idx
  on public.device_onboarding_sessions (user_id, status, created_at desc);

create index device_onboarding_sessions_device_idx
  on public.device_onboarding_sessions (device_id, created_at desc);

create or replace function public.hash_claim_token(p_claim_token text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select encode(extensions.digest(trim(p_claim_token), 'sha256'), 'hex');
$$;

create or replace function public.claim_device_for_user(
  p_owner_user_id uuid,
  p_hardware_uid text,
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
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  normalized_profile text := nullif(trim(coalesce(p_hardware_profile, '')), '');
  normalized_firmware text := nullif(trim(coalesce(p_firmware_version, '')), '');
  claimed_device public.devices;
begin
  if p_owner_user_id is null then
    raise exception 'Owner user is required.';
  end if;

  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  select *
  into claimed_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if found then
    if exists (
      select 1
      from public.device_memberships memberships
      where memberships.device_id = claimed_device.id
        and memberships.role = 'owner'
        and memberships.status = 'approved'
        and memberships.user_id <> p_owner_user_id
    ) then
      raise exception 'Device is already claimed by another owner.';
    end if;

    update public.devices devices
    set
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version),
      last_seen_at = coalesce(devices.last_seen_at, now())
    where devices.id = claimed_device.id
    returning * into claimed_device;
  else
    insert into public.devices (hardware_uid, hardware_profile, name, firmware_version, last_seen_at)
    values (
      normalized_hardware_uid,
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, 'unknown'),
      now()
    )
    returning * into claimed_device;
  end if;

  insert into public.device_memberships (
    device_id,
    user_id,
    role,
    status,
    approved_by_user_id,
    approved_at
  )
  values (
    claimed_device.id,
    p_owner_user_id,
    'owner',
    'approved',
    p_owner_user_id,
    now()
  )
  on conflict (device_id, user_id) do update
  set
    role = 'owner',
    status = 'approved',
    approved_by_user_id = excluded.approved_by_user_id,
    approved_at = coalesce(public.device_memberships.approved_at, excluded.approved_at);

  return claimed_device;
end;
$$;

create or replace function public.claim_device(
  p_hardware_uid text,
  p_name text default null,
  p_hardware_profile text default null
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  return public.claim_device_for_user(
    p_owner_user_id => auth.uid(),
    p_hardware_uid => p_hardware_uid,
    p_name => p_name,
    p_hardware_profile => p_hardware_profile
  );
end;
$$;

create or replace function public.create_device_onboarding_session(
  p_hardware_profile_hint text default null
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
    claim_token_prefix
  )
  values (
    current_user_id,
    nullif(trim(coalesce(p_hardware_profile_hint, '')), ''),
    public.hash_claim_token(claim_token),
    upper(substr(claim_token, 1, 6))
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

create or replace function public.mark_device_onboarding_waiting(
  p_session_id uuid
)
returns public.device_onboarding_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_session public.device_onboarding_sessions;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into current_session
  from public.device_onboarding_sessions sessions
  where sessions.id = p_session_id
    and sessions.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Onboarding session not found.';
  end if;

  if current_session.status in ('claimed', 'cancelled', 'failed') then
    return current_session;
  end if;

  if current_session.expires_at <= now() then
    update public.device_onboarding_sessions sessions
    set
      status = 'expired',
      last_error = coalesce(sessions.last_error, 'Session expired before the device connected to cloud.')
    where sessions.id = current_session.id
    returning * into current_session;

    return current_session;
  end if;

  update public.device_onboarding_sessions sessions
  set
    status = 'awaiting_cloud',
    waiting_for_device_at = coalesce(sessions.waiting_for_device_at, now())
  where sessions.id = current_session.id
  returning * into current_session;

  return current_session;
end;
$$;

create or replace function public.redeem_device_onboarding_claim(
  p_claim_token text,
  p_hardware_uid text,
  p_hardware_profile text default null,
  p_firmware_version text default null,
  p_name text default null
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

create trigger set_device_onboarding_sessions_updated_at
before update on public.device_onboarding_sessions
for each row
execute function public.set_updated_at();

alter table public.device_onboarding_sessions enable row level security;

create policy "device_onboarding_sessions_select_own"
on public.device_onboarding_sessions
for select
to authenticated
using (user_id = auth.uid());

revoke all on function public.hash_claim_token(text) from public;
revoke all on function public.claim_device_for_user(uuid, text, text, text, text) from public;
revoke all on function public.create_device_onboarding_session(text) from public;
revoke all on function public.mark_device_onboarding_waiting(uuid) from public;
revoke all on function public.redeem_device_onboarding_claim(text, text, text, text, text) from public;
revoke all on function public.claim_device(text, text, text) from public;

grant execute on function public.create_device_onboarding_session(text) to authenticated;
grant execute on function public.mark_device_onboarding_waiting(uuid) to authenticated;
grant execute on function public.redeem_device_onboarding_claim(text, text, text, text, text) to authenticated;
grant execute on function public.redeem_device_onboarding_claim(text, text, text, text, text) to service_role;
grant execute on function public.claim_device(text, text, text) to authenticated;

commit;
