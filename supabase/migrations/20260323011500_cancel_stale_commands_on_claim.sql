begin;

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

  if should_reset_runtime_state then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Invalidated by a fresh device claim.'
    where commands.device_id = claimed_device.id
      and commands.status in ('queued', 'delivered');
  end if;

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

commit;
