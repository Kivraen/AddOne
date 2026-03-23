begin;

do $$
begin
  create type public.device_account_removal_state as enum ('active', 'pending_device_reset', 'removed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.device_account_removal_mode as enum ('remote_reset_remove', 'account_only_remove');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.device_account_removal_completion as enum ('device_confirmed', 'timeout', 'account_only');
exception
  when duplicate_object then null;
end
$$;

alter table public.devices
  add column if not exists account_removal_state public.device_account_removal_state not null default 'active',
  add column if not exists account_removal_mode public.device_account_removal_mode,
  add column if not exists account_removal_requested_at timestamptz,
  add column if not exists account_removal_deadline_at timestamptz,
  add column if not exists account_removal_completed_at timestamptz,
  add column if not exists account_removal_completion public.device_account_removal_completion;

update public.devices devices
set
  account_removal_state = 'removed',
  account_removal_mode = coalesce(devices.account_removal_mode, 'account_only_remove'::public.device_account_removal_mode),
  account_removal_completed_at = coalesce(devices.account_removal_completed_at, devices.updated_at, now()),
  account_removal_completion = coalesce(devices.account_removal_completion, 'account_only'::public.device_account_removal_completion)
where devices.board_id is null
  and devices.device_auth_token_hash is null
  and not exists (
    select 1
    from public.device_memberships memberships
    where memberships.device_id = devices.id
      and memberships.role = 'owner'
      and memberships.status = 'approved'
  );

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
    if registered_device.account_removal_state = 'removed' then
      raise exception 'Removed devices must be onboarded again through setup.';
    end if;

    update public.devices devices
    set
      device_auth_token_hash = public.hash_claim_token(normalized_device_auth_token),
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version),
      account_removal_state = 'active',
      account_removal_mode = null,
      account_removal_requested_at = null,
      account_removal_deadline_at = null,
      account_removal_completed_at = null,
      account_removal_completion = null
    where devices.id = registered_device.id
    returning * into registered_device;
  else
    insert into public.devices (
      hardware_uid,
      device_auth_token_hash,
      hardware_profile,
      name,
      firmware_version,
      account_removal_state
    )
    values (
      normalized_hardware_uid,
      public.hash_claim_token(normalized_device_auth_token),
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, 'unknown'),
      'active'
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

  if authenticated_device.account_removal_state = 'removed' then
    raise exception 'Device was removed from its account and must be onboarded again.';
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

create or replace function public.claim_device_for_user(
  p_owner_user_id uuid,
  p_hardware_uid text,
  p_name text default null,
  p_hardware_profile text default null,
  p_firmware_version text default null,
  p_reset_epoch bigint default 0
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
  requested_reset_epoch bigint := greatest(coalesce(p_reset_epoch, 0), 0);
  claimed_device public.devices;
  current_owner_user_id uuid;
  previous_board_id uuid;
  target_board_id uuid;
  target_history_era integer := 1;
  requires_transfer_reassignment boolean := false;
  same_owner_reset_recovery boolean := false;
  has_recovery_backup boolean := false;
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

  if not found then
    raise exception 'Device is not registered for beta setup.';
  end if;

  previous_board_id := claimed_device.board_id;

  select memberships.user_id
  into current_owner_user_id
  from public.device_memberships memberships
  where memberships.device_id = claimed_device.id
    and memberships.role = 'owner'
    and memberships.status = 'approved'
  limit 1;

  if current_owner_user_id is not null
     and current_owner_user_id <> p_owner_user_id
     and requested_reset_epoch <= claimed_device.reset_epoch then
    raise exception 'Device is already claimed by another owner.';
  end if;

  requires_transfer_reassignment :=
    requested_reset_epoch > claimed_device.reset_epoch
    and current_owner_user_id is not null
    and current_owner_user_id <> p_owner_user_id;

  same_owner_reset_recovery :=
    requested_reset_epoch > claimed_device.reset_epoch
    and current_owner_user_id = p_owner_user_id;

  if requires_transfer_reassignment then
    update public.device_memberships memberships
    set
      status = 'revoked',
      approved_at = coalesce(memberships.approved_at, now()),
      approved_by_user_id = coalesce(memberships.approved_by_user_id, p_owner_user_id)
    where memberships.device_id = claimed_device.id
      and memberships.status = 'approved';

    update public.device_share_requests requests
    set
      status = 'cancelled',
      responded_at = coalesce(requests.responded_at, now()),
      approved_by_user_id = coalesce(requests.approved_by_user_id, p_owner_user_id)
    where requests.device_id = claimed_device.id
      and requests.status = 'pending';

    update public.device_share_codes share_codes
    set
      is_active = false,
      expires_at = coalesce(share_codes.expires_at, now())
    where share_codes.device_id = claimed_device.id;

    target_board_id := public.create_board_for_owner(p_owner_user_id);
  elsif current_owner_user_id is null then
    target_board_id := public.create_board_for_owner(p_owner_user_id);
  else
    target_board_id := coalesce(
      claimed_device.board_id,
      public.create_board_for_owner(p_owner_user_id)
    );
  end if;

  select coalesce(boards.active_history_era, 1)
  into target_history_era
  from public.boards boards
  where boards.id = target_board_id;

  has_recovery_backup :=
    same_owner_reset_recovery
    and public.board_has_valid_backup(target_board_id, target_history_era);

  update public.devices devices
  set
    board_id = target_board_id,
    reset_epoch = greatest(devices.reset_epoch, requested_reset_epoch),
    name = coalesce(normalized_name, devices.name),
    hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
    firmware_version = coalesce(normalized_firmware, devices.firmware_version),
    last_seen_at = coalesce(devices.last_seen_at, now()),
    last_factory_reset_at = case
      when requested_reset_epoch > devices.reset_epoch then now()
      else devices.last_factory_reset_at
    end,
    recovery_state = case
      when same_owner_reset_recovery and has_recovery_backup then 'recovering'::public.device_recovery_state
      when requested_reset_epoch > devices.reset_epoch then 'ready'::public.device_recovery_state
      else coalesce(devices.recovery_state, 'ready'::public.device_recovery_state)
    end,
    account_removal_state = 'active',
    account_removal_mode = null,
    account_removal_requested_at = null,
    account_removal_deadline_at = null,
    account_removal_completed_at = null,
    account_removal_completion = null
  where devices.id = claimed_device.id
  returning * into claimed_device;

  if previous_board_id is not null and previous_board_id <> target_board_id then
    perform public.archive_board_if_orphaned(previous_board_id);
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

  insert into public.device_share_codes (device_id, code, created_by_user_id, is_active, expires_at)
  values (claimed_device.id, public.generate_share_code(), p_owner_user_id, true, null)
  on conflict (device_id) do update
  set
    code = public.generate_share_code(),
    is_active = true,
    expires_at = null,
    created_by_user_id = excluded.created_by_user_id;

  return claimed_device;
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

create or replace function public.remove_device_from_account_from_app(
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid(),
  p_remote_reset boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  queued_command public.device_commands;
  removal_deadline timestamptz := now() + interval '30 seconds';
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can remove this device from the app.';
  end if;

  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  if coalesce(p_remote_reset, true) then
    update public.devices devices
    set
      account_removal_state = 'pending_device_reset',
      account_removal_mode = 'remote_reset_remove',
      account_removal_requested_at = now(),
      account_removal_deadline_at = removal_deadline,
      account_removal_completed_at = null,
      account_removal_completion = null
    where devices.id = p_device_id
    returning * into target_device;

    queued_command := public.queue_device_command(
      p_device_id => p_device_id,
      p_kind => 'factory_reset',
      p_payload => jsonb_build_object('remove_from_owner', true),
      p_request_key => coalesce(p_request_id::text, gen_random_uuid()::text)
    );

    return jsonb_build_object(
      'command_id', queued_command.id,
      'mode', 'remote_reset_remove',
      'removal_deadline_at', target_device.account_removal_deadline_at,
      'status', queued_command.status
    );
  end if;

  target_device := public.finalize_device_account_removal(
    p_device_id => p_device_id,
    p_actor_user_id => auth.uid(),
    p_completion => 'account_only'
  );

  return jsonb_build_object(
    'command_id', null,
    'mode', 'account_only_remove',
    'removal_deadline_at', null,
    'status', 'removed'
  );
end;
$$;

create or replace function public.factory_reset_and_remove_device_from_app(
  p_device_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.remove_device_from_account_from_app(
    p_device_id => p_device_id,
    p_request_id => p_request_id,
    p_remote_reset => true
  );
end;
$$;

create or replace function public.finalize_stale_device_account_removals_for_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  stale_device_id uuid;
  finalized_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  for stale_device_id in
    select devices.id
    from public.devices devices
    join public.device_memberships memberships
      on memberships.device_id = devices.id
    where memberships.user_id = auth.uid()
      and memberships.role = 'owner'
      and memberships.status = 'approved'
      and devices.account_removal_state = 'pending_device_reset'
      and devices.account_removal_deadline_at is not null
      and devices.account_removal_deadline_at <= now()
  loop
    perform public.finalize_device_account_removal(
      p_device_id => stale_device_id,
      p_actor_user_id => auth.uid(),
      p_completion => 'timeout'
    );
    finalized_count := finalized_count + 1;
  end loop;

  return finalized_count;
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
  active_history_era integer;
  remove_from_owner boolean := false;
begin
  if p_status not in ('applied', 'failed', 'cancelled') then
    raise exception 'Device command acknowledgements must use applied, failed, or cancelled status.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);
  active_history_era := coalesce(public.device_active_history_era(authenticated_device.id), 1);

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
          history_era,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          active_history_era,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          event_effective_at
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
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
          history_era,
          local_date,
          desired_state,
          source,
          actor_user_id,
          device_event_id,
          effective_at
        )
        values (
          authenticated_device.id,
          active_history_era,
          event_local_date,
          event_is_done,
          'device',
          updated_command.requested_by_user_id,
          event_id,
          coalesce(nullif(update_entry ->> 'effective_at', '')::timestamptz, event_effective_at)
        )
        on conflict (device_id, device_event_id) where device_event_id is not null do nothing;
      end loop;
    elsif updated_command.kind = 'restore_board_backup' then
      update public.devices devices
      set recovery_state = 'ready'
      where devices.id = authenticated_device.id
      returning * into authenticated_device;
    elsif updated_command.kind = 'reset_history' then
      update public.devices devices
      set recovery_state = 'ready'
      where devices.id = authenticated_device.id
      returning * into authenticated_device;
    elsif updated_command.kind = 'factory_reset' then
      remove_from_owner := coalesce((updated_command.payload ->> 'remove_from_owner')::boolean, false);

      if not (remove_from_owner and authenticated_device.account_removal_state = 'pending_device_reset') then
        update public.devices devices
        set
          last_factory_reset_at = now(),
          recovery_state = 'needs_recovery'
        where devices.id = authenticated_device.id
        returning * into authenticated_device;
      end if;
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

revoke all on function public.finalize_device_account_removal(uuid, uuid, public.device_account_removal_completion) from public;
grant execute on function public.finalize_device_account_removal(uuid, uuid, public.device_account_removal_completion) to authenticated;

revoke all on function public.remove_device_from_account_from_app(uuid, uuid, boolean) from public;
grant execute on function public.remove_device_from_account_from_app(uuid, uuid, boolean) to authenticated;

revoke all on function public.finalize_stale_device_account_removals_for_user() from public;
grant execute on function public.finalize_stale_device_account_removals_for_user() to authenticated;

commit;
