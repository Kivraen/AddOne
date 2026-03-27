begin;

create table if not exists public.device_mqtt_credentials (
  device_id uuid primary key references public.devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mqtt_username text not null unique,
  mqtt_password text not null
);

drop trigger if exists set_device_mqtt_credentials_updated_at on public.device_mqtt_credentials;
create trigger set_device_mqtt_credentials_updated_at
before update on public.device_mqtt_credentials
for each row
execute function public.set_updated_at();

alter table public.device_mqtt_credentials enable row level security;

create or replace function public.revoke_device_mqtt_credentials(
  p_device_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null then
    return;
  end if;

  delete from public.device_mqtt_credentials credentials
  where credentials.device_id = p_device_id;
end;
$$;

create or replace function public.issue_device_mqtt_credentials(
  p_hardware_uid text,
  p_device_auth_token text
)
returns table (
  mqtt_username text,
  mqtt_password text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  issued_credential public.device_mqtt_credentials;
begin
  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  select *
  into issued_credential
  from public.device_mqtt_credentials credentials
  where credentials.device_id = authenticated_device.id
  for update;

  if not found then
    insert into public.device_mqtt_credentials (
      device_id,
      mqtt_username,
      mqtt_password
    )
    values (
      authenticated_device.id,
      authenticated_device.hardware_uid,
      encode(extensions.gen_random_bytes(24), 'hex')
    )
    returning * into issued_credential;
  elsif issued_credential.mqtt_username <> authenticated_device.hardware_uid then
    update public.device_mqtt_credentials credentials
    set mqtt_username = authenticated_device.hardware_uid
    where credentials.device_id = authenticated_device.id
    returning * into issued_credential;
  end if;

  return query
  select issued_credential.mqtt_username, issued_credential.mqtt_password;
end;
$$;

create or replace function public.list_active_device_mqtt_credentials()
returns table (
  device_id uuid,
  hardware_uid text,
  mqtt_username text,
  mqtt_password text
)
language sql
security definer
set search_path = public
as $$
  select
    devices.id as device_id,
    devices.hardware_uid,
    credentials.mqtt_username,
    credentials.mqtt_password
  from public.device_mqtt_credentials credentials
  join public.devices devices
    on devices.id = credentials.device_id
  where devices.account_removal_state <> 'removed'
  order by devices.hardware_uid asc;
$$;

create or replace function public.finalize_device_account_removal(
  p_device_id uuid,
  p_actor_user_id uuid default null,
  p_completion public.device_account_removal_completion default 'account_only'
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  previous_board_id uuid;
  effective_mode public.device_account_removal_mode;
begin
  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  previous_board_id := target_device.board_id;
  effective_mode := coalesce(
    target_device.account_removal_mode,
    case
      when p_completion = 'account_only' then 'account_only_remove'::public.device_account_removal_mode
      else 'remote_reset_remove'::public.device_account_removal_mode
    end
  );

  update public.device_memberships memberships
  set
    status = 'revoked',
    approved_at = coalesce(memberships.approved_at, now()),
    approved_by_user_id = coalesce(memberships.approved_by_user_id, p_actor_user_id)
  where memberships.device_id = target_device.id
    and memberships.status = 'approved';

  update public.device_share_requests requests
  set
    status = 'cancelled',
    responded_at = coalesce(requests.responded_at, now()),
    approved_by_user_id = coalesce(requests.approved_by_user_id, p_actor_user_id)
  where requests.device_id = target_device.id
    and requests.status = 'pending';

  update public.device_share_codes share_codes
  set
    is_active = false,
    expires_at = coalesce(share_codes.expires_at, now())
  where share_codes.device_id = target_device.id;

  perform public.revoke_device_mqtt_credentials(target_device.id);

  update public.devices devices
  set
    board_id = null,
    device_auth_token_hash = null,
    recovery_state = 'needs_recovery',
    account_removal_state = 'removed',
    account_removal_mode = effective_mode,
    account_removal_requested_at = coalesce(devices.account_removal_requested_at, now()),
    account_removal_deadline_at = null,
    account_removal_completed_at = now(),
    account_removal_completion = p_completion
  where devices.id = target_device.id
  returning * into target_device;

  perform public.archive_board_if_orphaned(previous_board_id);

  return target_device;
end;
$$;

create or replace function public.report_device_factory_reset(
  p_hardware_uid text,
  p_device_auth_token text,
  p_reset_epoch bigint default 0
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  next_reset_epoch bigint := greatest(coalesce(p_reset_epoch, 0), 0);
begin
  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  perform public.revoke_device_mqtt_credentials(authenticated_device.id);

  update public.devices devices
  set
    reset_epoch = greatest(devices.reset_epoch, next_reset_epoch),
    last_factory_reset_at = now(),
    last_seen_at = now(),
    last_sync_at = now(),
    recovery_state = case
      when devices.account_removal_state = 'pending_device_reset' then devices.recovery_state
      else 'needs_recovery'
    end
  where devices.id = authenticated_device.id
  returning * into authenticated_device;

  if authenticated_device.account_removal_state = 'pending_device_reset' then
    authenticated_device := public.finalize_device_account_removal(
      p_device_id => authenticated_device.id,
      p_actor_user_id => null,
      p_completion => 'device_confirmed'
    );
  end if;

  return authenticated_device;
end;
$$;

revoke all on table public.device_mqtt_credentials from public;

revoke all on function public.revoke_device_mqtt_credentials(uuid) from public;

revoke all on function public.issue_device_mqtt_credentials(text, text) from public;
grant execute on function public.issue_device_mqtt_credentials(text, text) to anon, authenticated;

revoke all on function public.list_active_device_mqtt_credentials() from public;
grant execute on function public.list_active_device_mqtt_credentials() to service_role;

commit;
