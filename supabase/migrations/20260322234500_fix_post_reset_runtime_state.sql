begin;

create or replace function public.next_device_history_era(
  p_device_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with eras as (
    select max(states.history_era) as value
    from public.device_day_states states
    where states.device_id = p_device_id

    union all

    select max(events.history_era) as value
    from public.device_day_events events
    where events.device_id = p_device_id

    union all

    select max(snapshots.history_era) as value
    from public.device_runtime_snapshots snapshots
    where snapshots.device_id = p_device_id
  )
  select greatest(coalesce(max(eras.value), 0) + 1, 1)
  from eras
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

  update public.devices devices
  set
    board_id = null,
    device_auth_token_hash = null,
    last_runtime_revision = 0,
    last_seen_at = null,
    last_snapshot_at = null,
    last_snapshot_hash = null,
    last_sync_at = null,
    recovery_state = 'ready',
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
  should_reset_runtime_state boolean := false;
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

  should_reset_runtime_state :=
    previous_board_id is distinct from target_board_id
    or requested_reset_epoch > claimed_device.reset_epoch;

  if previous_board_id is distinct from target_board_id then
    target_history_era := public.next_device_history_era(claimed_device.id);

    update public.boards boards
    set
      active_history_era = target_history_era,
      history_era_started_at = now()
    where boards.id = target_board_id
    returning coalesce(boards.active_history_era, 1) into target_history_era;
  else
    select coalesce(boards.active_history_era, 1)
    into target_history_era
    from public.boards boards
    where boards.id = target_board_id;
  end if;

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
    last_runtime_revision = case
      when should_reset_runtime_state then 0
      else coalesce(devices.last_runtime_revision, 0)
    end,
    last_seen_at = now(),
    last_factory_reset_at = case
      when requested_reset_epoch > devices.reset_epoch then now()
      else devices.last_factory_reset_at
    end,
    last_snapshot_at = case
      when should_reset_runtime_state then null
      else devices.last_snapshot_at
    end,
    last_snapshot_hash = case
      when should_reset_runtime_state then null
      else devices.last_snapshot_hash
    end,
    last_sync_at = now(),
    recovery_state = case
      when same_owner_reset_recovery and has_recovery_backup then 'recovering'::public.device_recovery_state
      when previous_board_id is distinct from target_board_id then 'ready'::public.device_recovery_state
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
    last_runtime_revision = 0,
    last_seen_at = now(),
    last_snapshot_at = null,
    last_snapshot_hash = null,
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

commit;
