begin;

create type public.device_firmware_release_check_decision as enum (
  'none',
  'available',
  'install_ready',
  'blocked'
);

create type public.device_firmware_update_request_source as enum (
  'user',
  'operator',
  'auto_rollout'
);

create type public.device_firmware_update_request_status as enum (
  'requested',
  'cancelled',
  'completed'
);

create type public.device_firmware_ota_state as enum (
  'available',
  'blocked',
  'requested',
  'downloading',
  'downloaded',
  'verifying',
  'staged',
  'rebooting',
  'pending_confirm',
  'succeeded',
  'failed_download',
  'failed_verify',
  'failed_stage',
  'failed_boot',
  'rolled_back',
  'recovery_needed'
);

create type public.firmware_release_install_policy as enum (
  'user_triggered',
  'auto_apply'
);

create type public.firmware_release_rollout_mode as enum (
  'all',
  'allowlist',
  'percentage'
);

create type public.firmware_release_status as enum (
  'draft',
  'active',
  'paused',
  'rolled_back',
  'archived'
);

alter type public.device_command_kind add value if not exists 'begin_firmware_update';

alter table public.devices
  add column if not exists firmware_channel text not null default 'beta';

create table public.firmware_releases (
  release_id text primary key,
  schema_version integer not null default 1
    check (schema_version = 1),
  firmware_version text not null,
  hardware_profile text not null,
  partition_layout text not null
    check (partition_layout = 'addone-dual-ota-v1'),
  channel text not null,
  status public.firmware_release_status not null default 'draft',
  install_policy public.firmware_release_install_policy not null default 'user_triggered',
  rollout_mode public.firmware_release_rollout_mode not null default 'all',
  rollout_value integer null,
  artifact_kind text not null default 'esp32-application-bin'
    check (artifact_kind = 'esp32-application-bin'),
  artifact_url text not null
    check (artifact_url ~ '^https://'),
  artifact_sha256 text not null
    check (artifact_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  artifact_size_bytes bigint not null
    check (artifact_size_bytes > 0 and artifact_size_bytes <= 1310720),
  minimum_partition_layout text not null
    check (minimum_partition_layout = 'addone-dual-ota-v1'),
  minimum_confirmed_firmware_version text null,
  minimum_app_version text null,
  previous_stable_release_id text null references public.firmware_releases (release_id) on delete restrict deferrable initially deferred,
  allow_downgrade_to_previous_stable boolean not null default true,
  confirm_window_seconds integer not null default 120
    check (confirm_window_seconds = 120),
  require_normal_runtime_state boolean not null default true,
  require_cloud_check_in boolean not null default false
    check (require_cloud_check_in = false),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint firmware_releases_rollout_value_check
    check (
      (rollout_mode = 'percentage' and rollout_value between 1 and 100)
      or (rollout_mode <> 'percentage' and rollout_value is null)
    ),
  constraint firmware_releases_previous_stable_check
    check (
      previous_stable_release_id is null
      or previous_stable_release_id <> release_id
    ),
  constraint firmware_releases_active_contract_check
    check (
      status <> 'active'
      or (
        previous_stable_release_id is not null
        and allow_downgrade_to_previous_stable = true
      )
    )
);

create unique index firmware_releases_one_active_per_channel_profile_idx
  on public.firmware_releases (channel, hardware_profile)
  where status = 'active';

create index firmware_releases_status_idx
  on public.firmware_releases (status, channel, hardware_profile, created_at desc);

drop trigger if exists set_firmware_releases_updated_at on public.firmware_releases;
create trigger set_firmware_releases_updated_at
before update on public.firmware_releases
for each row
execute function public.set_updated_at();

create table public.firmware_release_rollout_allowlist (
  release_id text not null references public.firmware_releases (release_id) on delete cascade,
  hardware_uid text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, hardware_uid)
);

create index firmware_release_rollout_allowlist_hardware_uid_idx
  on public.firmware_release_rollout_allowlist (hardware_uid, release_id);

create table public.device_firmware_update_requests (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  release_id text not null references public.firmware_releases (release_id) on delete restrict,
  command_id uuid null references public.device_commands (id) on delete set null,
  status public.device_firmware_update_request_status not null default 'requested',
  request_source public.device_firmware_update_request_source not null default 'user',
  requested_by_user_id uuid null references auth.users (id) on delete set null,
  request_key text not null unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index device_firmware_update_requests_one_active_idx
  on public.device_firmware_update_requests (device_id)
  where status = 'requested';

create index device_firmware_update_requests_release_idx
  on public.device_firmware_update_requests (release_id, status, requested_at desc);

drop trigger if exists set_device_firmware_update_requests_updated_at on public.device_firmware_update_requests;
create trigger set_device_firmware_update_requests_updated_at
before update on public.device_firmware_update_requests
for each row
execute function public.set_updated_at();

create table public.device_firmware_ota_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  release_id text not null references public.firmware_releases (release_id) on delete restrict,
  state public.device_firmware_ota_state not null,
  failure_code text null,
  failure_detail text null,
  firmware_version text not null,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index device_firmware_ota_events_device_idx
  on public.device_firmware_ota_events (device_id, reported_at desc);

create index device_firmware_ota_events_release_idx
  on public.device_firmware_ota_events (release_id, state, reported_at desc);

create table public.device_firmware_ota_statuses (
  device_id uuid primary key references public.devices (id) on delete cascade,
  last_event_id uuid null references public.device_firmware_ota_events (id) on delete set null,
  current_state public.device_firmware_ota_state null,
  target_release_id text null references public.firmware_releases (release_id) on delete set null,
  confirmed_release_id text null references public.firmware_releases (release_id) on delete set null,
  reported_firmware_version text null,
  install_request_id uuid null references public.device_firmware_update_requests (id) on delete set null,
  command_id uuid null references public.device_commands (id) on delete set null,
  last_failure_code text null,
  last_failure_detail text null,
  last_reported_at timestamptz null,
  last_requested_at timestamptz null,
  ota_started_at timestamptz null,
  ota_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_device_firmware_ota_statuses_updated_at on public.device_firmware_ota_statuses;
create trigger set_device_firmware_ota_statuses_updated_at
before update on public.device_firmware_ota_statuses
for each row
execute function public.set_updated_at();

alter table public.firmware_releases enable row level security;
alter table public.firmware_release_rollout_allowlist enable row level security;
alter table public.device_firmware_update_requests enable row level security;
alter table public.device_firmware_ota_events enable row level security;
alter table public.device_firmware_ota_statuses enable row level security;

create or replace function public.compare_firmware_versions(
  p_left text,
  p_right text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized_left text := nullif(trim(coalesce(p_left, '')), '');
  normalized_right text := nullif(trim(coalesce(p_right, '')), '');
  left_match text[];
  right_match text[];
  left_major integer;
  left_minor integer;
  left_patch integer;
  left_label text;
  left_label_number integer;
  right_major integer;
  right_minor integer;
  right_patch integer;
  right_label text;
  right_label_number integer;
begin
  if normalized_left is null or normalized_right is null then
    return null;
  end if;

  left_match := regexp_match(
    normalized_left,
    '^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z]+)(?:\.([0-9]+))?)?$'
  );
  right_match := regexp_match(
    normalized_right,
    '^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z]+)(?:\.([0-9]+))?)?$'
  );

  if left_match is null or right_match is null then
    return null;
  end if;

  left_major := left_match[1]::integer;
  left_minor := left_match[2]::integer;
  left_patch := left_match[3]::integer;
  left_label := nullif(left_match[4], '');
  left_label_number := coalesce(nullif(left_match[5], ''), '0')::integer;

  right_major := right_match[1]::integer;
  right_minor := right_match[2]::integer;
  right_patch := right_match[3]::integer;
  right_label := nullif(right_match[4], '');
  right_label_number := coalesce(nullif(right_match[5], ''), '0')::integer;

  if left_major <> right_major then
    return case when left_major > right_major then 1 else -1 end;
  end if;

  if left_minor <> right_minor then
    return case when left_minor > right_minor then 1 else -1 end;
  end if;

  if left_patch <> right_patch then
    return case when left_patch > right_patch then 1 else -1 end;
  end if;

  if left_label is null and right_label is null then
    return 0;
  end if;

  if left_label is null then
    return 1;
  end if;

  if right_label is null then
    return -1;
  end if;

  if left_label <> right_label then
    return case when left_label > right_label then 1 else -1 end;
  end if;

  if left_label_number <> right_label_number then
    return case when left_label_number > right_label_number then 1 else -1 end;
  end if;

  return 0;
end;
$$;

create or replace function public.device_rollout_bucket(
  p_hardware_uid text,
  p_release_id text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized_hardware_uid text := nullif(trim(coalesce(p_hardware_uid, '')), '');
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  digest_bytes bytea;
begin
  if normalized_hardware_uid is null or normalized_release_id is null then
    return null;
  end if;

  digest_bytes := decode(md5(normalized_hardware_uid || ':' || normalized_release_id), 'hex');

  return ((get_byte(digest_bytes, 0) * 256) + get_byte(digest_bytes, 1)) % 100;
end;
$$;

create or replace function public.build_firmware_release_envelope(
  p_release_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_release public.firmware_releases;
  allowlist jsonb := '[]'::jsonb;
  rollout jsonb;
begin
  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = nullif(trim(coalesce(p_release_id, '')), '');

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(entries.hardware_uid order by entries.hardware_uid), '[]'::jsonb)
  into allowlist
  from public.firmware_release_rollout_allowlist entries
  where entries.release_id = target_release.release_id;

  rollout := case target_release.rollout_mode
    when 'allowlist' then jsonb_build_object(
      'mode', target_release.rollout_mode,
      'allowlist', allowlist
    )
    when 'percentage' then jsonb_build_object(
      'mode', target_release.rollout_mode,
      'value', target_release.rollout_value
    )
    else jsonb_build_object(
      'mode', target_release.rollout_mode
    )
  end;

  return jsonb_build_object(
    'schema_version', target_release.schema_version,
    'release_id', target_release.release_id,
    'firmware_version', target_release.firmware_version,
    'hardware_profile', target_release.hardware_profile,
    'partition_layout', target_release.partition_layout,
    'channel', target_release.channel,
    'status', target_release.status,
    'install_policy', target_release.install_policy,
    'rollout', rollout,
    'artifact', jsonb_build_object(
      'kind', target_release.artifact_kind,
      'url', target_release.artifact_url,
      'sha256', target_release.artifact_sha256,
      'size_bytes', target_release.artifact_size_bytes
    ),
    'compatibility', jsonb_build_object(
      'minimum_partition_layout', target_release.minimum_partition_layout,
      'minimum_confirmed_firmware_version', target_release.minimum_confirmed_firmware_version,
      'minimum_app_version', target_release.minimum_app_version
    ),
    'rollback', jsonb_build_object(
      'previous_stable_release_id', target_release.previous_stable_release_id,
      'allow_downgrade_to_previous_stable', target_release.allow_downgrade_to_previous_stable
    ),
    'boot_confirmation', jsonb_build_object(
      'confirm_window_seconds', target_release.confirm_window_seconds,
      'require_normal_runtime_state', target_release.require_normal_runtime_state,
      'require_cloud_check_in', target_release.require_cloud_check_in
    )
  );
end;
$$;

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
  elsif p_kind = 'begin_firmware_update' then
    update public.device_commands commands
    set
      status = 'cancelled',
      last_error = 'Superseded by a newer firmware update request.'
    where commands.device_id = p_device_id
      and commands.status in ('queued', 'delivered')
      and commands.kind = 'begin_firmware_update';
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

create or replace function public.begin_firmware_update(
  p_device_id uuid,
  p_release_id text,
  p_request_id uuid default gen_random_uuid(),
  p_request_source public.device_firmware_update_request_source default 'user'
)
returns table (
  request_id uuid,
  command_id uuid,
  release_id text,
  request_status public.device_firmware_update_request_status,
  command_status public.device_command_status,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  target_release public.firmware_releases;
  queued_command public.device_commands;
  existing_request public.device_firmware_update_requests;
  created_request public.device_firmware_update_requests;
  current_ota_status public.device_firmware_ota_statuses;
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  normalized_request_key text := format(
    'begin-firmware-update:%s:%s',
    p_device_id,
    coalesce(p_request_id::text, '')
  );
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and p_request_source <> 'user' then
    raise exception 'Only operator flows can set a non-user firmware update request source.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can request firmware updates for this device.';
  end if;

  if normalized_release_id is null then
    raise exception 'Release ID is required.';
  end if;

  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id
  for update;

  if not found then
    raise exception 'Device not found.';
  end if;

  if target_device.account_removal_state <> 'active' then
    raise exception 'Inactive or removed devices cannot start firmware updates.';
  end if;

  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = normalized_release_id
  for update;

  if not found then
    raise exception 'Firmware release not found.';
  end if;

  if target_release.hardware_profile <> target_device.hardware_profile then
    raise exception 'Firmware release hardware profile does not match the device.';
  end if;

  if target_release.channel <> target_device.firmware_channel then
    raise exception 'Firmware release channel does not match the device.';
  end if;

  if p_request_source = 'user' and target_release.status <> 'active' then
    raise exception 'User-triggered firmware updates require an active release.';
  end if;

  if p_request_source = 'auto_rollout' and (
    target_release.status <> 'active'
    or target_release.install_policy <> 'auto_apply'
  ) then
    raise exception 'Auto-rollout requests require an active auto-apply release.';
  end if;

  if p_request_source = 'operator' and target_release.status in ('draft', 'paused', 'rolled_back') then
    raise exception 'Operator-triggered firmware updates cannot target draft, paused, or rolled-back releases.';
  end if;

  select *
  into existing_request
  from public.device_firmware_update_requests requests
  where requests.request_key = normalized_request_key
  limit 1;

  if found then
    return query
    select
      existing_request.id,
      existing_request.command_id,
      existing_request.release_id,
      existing_request.status,
      coalesce((
        select commands.status
        from public.device_commands commands
        where commands.id = existing_request.command_id
      ), 'queued'::public.device_command_status),
      existing_request.requested_at;
    return;
  end if;

  select *
  into current_ota_status
  from public.device_firmware_ota_statuses statuses
  where statuses.device_id = p_device_id;

  if current_ota_status.current_state in (
    'requested',
    'downloading',
    'downloaded',
    'verifying',
    'staged',
    'rebooting',
    'pending_confirm'
  ) and (
    current_ota_status.target_release_id is null
    or current_ota_status.target_release_id <> target_release.release_id
  ) then
    raise exception 'Device already has a different OTA in progress.';
  end if;

  update public.device_firmware_update_requests requests
  set
    status = 'cancelled',
    completed_at = now(),
    last_error = 'Superseded by a newer firmware update request.'
  where requests.device_id = p_device_id
    and requests.status = 'requested';

  queued_command := public.queue_device_command(
    p_device_id => p_device_id,
    p_kind => 'begin_firmware_update',
    p_payload => jsonb_build_object(
      'release_id', target_release.release_id,
      'request_id', p_request_id,
      'request_source', p_request_source,
      'requested_at', to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    p_request_key => normalized_request_key
  );

  insert into public.device_firmware_update_requests (
    device_id,
    release_id,
    command_id,
    status,
    request_source,
    requested_by_user_id,
    request_key
  )
  values (
    p_device_id,
    target_release.release_id,
    queued_command.id,
    'requested',
    p_request_source,
    auth.uid(),
    normalized_request_key
  )
  returning * into created_request;

  insert into public.device_firmware_ota_statuses (
    device_id,
    current_state,
    target_release_id,
    install_request_id,
    command_id,
    last_requested_at,
    ota_completed_at
  )
  values (
    p_device_id,
    'requested',
    target_release.release_id,
    created_request.id,
    queued_command.id,
    created_request.requested_at,
    null
  )
  on conflict (device_id) do update
  set
    current_state = 'requested',
    target_release_id = excluded.target_release_id,
    install_request_id = excluded.install_request_id,
    command_id = excluded.command_id,
    last_requested_at = excluded.last_requested_at,
    ota_completed_at = null,
    last_failure_code = null,
    last_failure_detail = null;

  return query
  select
    created_request.id,
    queued_command.id,
    created_request.release_id,
    created_request.status,
    queued_command.status,
    created_request.requested_at;
end;
$$;

create or replace function public.check_device_firmware_release(
  p_hardware_uid text,
  p_device_auth_token text,
  p_current_firmware_version text,
  p_current_confirmed_release_id text default null,
  p_current_partition_layout text default null
)
returns table (
  decision public.device_firmware_release_check_decision,
  reason text,
  release jsonb,
  target_release_id text,
  install_authorized boolean,
  request_id uuid,
  command_id uuid,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  normalized_current_firmware_version text := nullif(trim(coalesce(p_current_firmware_version, '')), '');
  normalized_current_release_id text := nullif(trim(coalesce(p_current_confirmed_release_id, '')), '');
  normalized_partition_layout text := nullif(trim(coalesce(p_current_partition_layout, '')), '');
  owner_membership_exists boolean := false;
  candidate_release public.firmware_releases;
  current_release public.firmware_releases;
  current_ota_status public.device_firmware_ota_statuses;
  active_request public.device_firmware_update_requests;
  version_compare integer;
  minimum_compare integer;
  rollout_eligible boolean := false;
  ota_in_progress boolean := false;
  recheck_existing_target boolean := false;
  result_decision public.device_firmware_release_check_decision := 'none';
  result_reason text := 'no_active_release';
  result_release jsonb := null;
  result_target_release_id text := null;
  result_install_authorized boolean := false;
  result_request_id uuid := null;
  result_command_id uuid := null;
  result_requested_at timestamptz := null;
begin
  if normalized_current_firmware_version is null then
    raise exception 'Current firmware version is required.';
  end if;

  if normalized_partition_layout is null then
    raise exception 'Current partition layout is required.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  update public.devices devices
  set
    firmware_version = normalized_current_firmware_version,
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id
  returning * into authenticated_device;

  select exists (
    select 1
    from public.device_memberships memberships
    where memberships.device_id = authenticated_device.id
      and memberships.role = 'owner'
      and memberships.status = 'approved'
  )
  into owner_membership_exists;

  if normalized_current_release_id is not null then
    select *
    into current_release
    from public.firmware_releases releases
    where releases.release_id = normalized_current_release_id;
  end if;

  select *
  into current_ota_status
  from public.device_firmware_ota_statuses statuses
  where statuses.device_id = authenticated_device.id;

  ota_in_progress := current_ota_status.current_state in (
    'requested',
    'downloading',
    'downloaded',
    'verifying',
    'staged',
    'rebooting',
    'pending_confirm'
  );
  recheck_existing_target := ota_in_progress and current_ota_status.target_release_id is not null;

  select *
  into active_request
  from public.device_firmware_update_requests requests
  where requests.device_id = authenticated_device.id
    and requests.status = 'requested'
  order by requests.requested_at desc
  limit 1
  for update;

  if not owner_membership_exists or authenticated_device.account_removal_state <> 'active' then
    result_decision := 'blocked';
    result_reason := 'not_provisioned';
  elsif active_request.id is not null then
    result_request_id := active_request.id;
    result_command_id := active_request.command_id;
    result_requested_at := active_request.requested_at;

    select *
    into candidate_release
    from public.firmware_releases releases
    where releases.release_id = active_request.release_id;

    if not found then
      result_decision := 'blocked';
      result_reason := 'release_not_found';
    elsif ota_in_progress and (
      current_ota_status.target_release_id is null
      or current_ota_status.target_release_id <> candidate_release.release_id
    ) then
      result_decision := 'blocked';
      result_reason := 'ota_already_in_progress';
    elsif candidate_release.hardware_profile <> authenticated_device.hardware_profile then
      result_decision := 'blocked';
      result_reason := 'hardware_profile_mismatch';
    elsif candidate_release.channel <> authenticated_device.firmware_channel then
      result_decision := 'blocked';
      result_reason := 'channel_mismatch';
    elsif normalized_partition_layout <> candidate_release.minimum_partition_layout then
      result_decision := 'blocked';
      result_reason := 'partition_layout_mismatch';
    elsif active_request.request_source = 'operator'
      and current_release.release_id is not null
      and current_release.status = 'rolled_back'
      and current_release.allow_downgrade_to_previous_stable = true
      and current_release.previous_stable_release_id = candidate_release.release_id then
      result_decision := 'install_ready';
      result_reason := 'operator_rollback';
      result_release := public.build_firmware_release_envelope(candidate_release.release_id);
      result_target_release_id := candidate_release.release_id;
      result_install_authorized := true;
    else
      if candidate_release.status = 'paused' then
        result_decision := 'blocked';
        result_reason := 'release_paused';
      elsif candidate_release.status = 'rolled_back' then
        result_decision := 'blocked';
        result_reason := 'release_rolled_back';
      elsif candidate_release.status <> 'active' then
        result_decision := 'blocked';
        result_reason := 'release_not_active';
      else
        rollout_eligible := case candidate_release.rollout_mode
          when 'all' then true
          when 'allowlist' then exists (
            select 1
            from public.firmware_release_rollout_allowlist allowlist
            where allowlist.release_id = candidate_release.release_id
              and allowlist.hardware_uid = authenticated_device.hardware_uid
          )
          when 'percentage' then public.device_rollout_bucket(authenticated_device.hardware_uid, candidate_release.release_id) < candidate_release.rollout_value
          else false
        end;

        if not rollout_eligible then
          result_decision := 'blocked';
          result_reason := 'not_in_rollout';
        else
          if normalized_current_release_id = candidate_release.release_id then
            result_decision := 'blocked';
            result_reason := 'version_not_allowed';
          else
            version_compare := public.compare_firmware_versions(
              candidate_release.firmware_version,
              normalized_current_firmware_version
            );

            if version_compare is not null and version_compare <= 0 then
              result_decision := 'blocked';
              result_reason := 'version_not_allowed';
            elsif candidate_release.minimum_confirmed_firmware_version is not null then
              minimum_compare := public.compare_firmware_versions(
                normalized_current_firmware_version,
                candidate_release.minimum_confirmed_firmware_version
              );

              if minimum_compare is not null and minimum_compare < 0 then
                result_decision := 'blocked';
                result_reason := 'minimum_version_not_met';
              else
                result_decision := 'install_ready';
              end if;
            else
              result_decision := 'install_ready';
            end if;
          end if;

          if result_decision = 'install_ready' then
            result_reason := case
              when active_request.request_source = 'auto_rollout' then 'auto_apply'
              else 'user_request'
            end;
            result_release := public.build_firmware_release_envelope(candidate_release.release_id);
            result_target_release_id := candidate_release.release_id;
            result_install_authorized := true;
          end if;
        end if;
      end if;
    end if;

    if result_decision = 'blocked' then
      update public.device_firmware_update_requests requests
      set
        status = 'cancelled',
        completed_at = now(),
        last_error = result_reason
      where requests.id = active_request.id
        and requests.status = 'requested';
    end if;
  else
    if recheck_existing_target then
      select *
      into candidate_release
      from public.firmware_releases releases
      where releases.release_id = current_ota_status.target_release_id;
    else
      select *
      into candidate_release
      from public.firmware_releases releases
      where releases.status = 'active'
        and releases.hardware_profile = authenticated_device.hardware_profile
        and releases.channel = authenticated_device.firmware_channel
      limit 1;
    end if;

    if not found then
      if recheck_existing_target then
        result_decision := 'blocked';
        result_reason := 'release_not_found';
      else
        result_decision := 'none';
        result_reason := 'no_active_release';
      end if;
    elsif recheck_existing_target and (
      current_ota_status.target_release_id is null
      or current_ota_status.target_release_id <> candidate_release.release_id
    ) then
      result_decision := 'blocked';
      result_reason := 'ota_already_in_progress';
    elsif recheck_existing_target and candidate_release.status = 'paused' then
      result_decision := 'blocked';
      result_reason := 'release_paused';
    elsif recheck_existing_target and candidate_release.status = 'rolled_back' then
      result_decision := 'blocked';
      result_reason := 'release_rolled_back';
    elsif recheck_existing_target and candidate_release.status <> 'active' then
      result_decision := 'blocked';
      result_reason := 'release_not_active';
    elsif normalized_partition_layout <> candidate_release.minimum_partition_layout then
      result_decision := 'blocked';
      result_reason := 'partition_layout_mismatch';
      result_release := public.build_firmware_release_envelope(candidate_release.release_id);
      result_target_release_id := candidate_release.release_id;
    else
      rollout_eligible := case candidate_release.rollout_mode
        when 'all' then true
        when 'allowlist' then exists (
          select 1
          from public.firmware_release_rollout_allowlist allowlist
          where allowlist.release_id = candidate_release.release_id
            and allowlist.hardware_uid = authenticated_device.hardware_uid
        )
        when 'percentage' then public.device_rollout_bucket(authenticated_device.hardware_uid, candidate_release.release_id) < candidate_release.rollout_value
        else false
      end;

      if not rollout_eligible then
        result_decision := case
          when recheck_existing_target then 'blocked'
          else 'none'
        end;
        result_reason := 'not_in_rollout';
      elsif normalized_current_release_id = candidate_release.release_id then
        result_decision := case
          when recheck_existing_target then 'blocked'
          else 'none'
        end;
        result_reason := case
          when recheck_existing_target then 'version_not_allowed'
          else 'up_to_date'
        end;
      else
        version_compare := public.compare_firmware_versions(
          candidate_release.firmware_version,
          normalized_current_firmware_version
        );

        if version_compare is not null and version_compare <= 0 then
          result_decision := case
            when recheck_existing_target then 'blocked'
            else 'none'
          end;
          result_reason := case
            when recheck_existing_target then 'version_not_allowed'
            else 'up_to_date'
          end;
        elsif candidate_release.minimum_confirmed_firmware_version is not null then
          minimum_compare := public.compare_firmware_versions(
            normalized_current_firmware_version,
            candidate_release.minimum_confirmed_firmware_version
          );

          if minimum_compare is not null and minimum_compare < 0 then
            result_decision := 'blocked';
            result_reason := 'minimum_version_not_met';
          else
            result_release := public.build_firmware_release_envelope(candidate_release.release_id);
            result_target_release_id := candidate_release.release_id;
            result_decision := case
              when recheck_existing_target then 'install_ready'
              when candidate_release.install_policy = 'auto_apply' then 'install_ready'
              else 'available'
            end;
            result_reason := case
              when recheck_existing_target then 'in_progress_recheck'
              when candidate_release.install_policy = 'auto_apply' then 'auto_apply'
              else 'user_confirmation_required'
            end;
            result_install_authorized := recheck_existing_target or candidate_release.install_policy = 'auto_apply';
          end if;
        else
          result_release := public.build_firmware_release_envelope(candidate_release.release_id);
          result_target_release_id := candidate_release.release_id;
          result_decision := case
            when recheck_existing_target then 'install_ready'
            when candidate_release.install_policy = 'auto_apply' then 'install_ready'
            else 'available'
          end;
          result_reason := case
            when recheck_existing_target then 'in_progress_recheck'
            when candidate_release.install_policy = 'auto_apply' then 'auto_apply'
            else 'user_confirmation_required'
          end;
          result_install_authorized := recheck_existing_target or candidate_release.install_policy = 'auto_apply';
        end if;
      end if;
    end if;
  end if;

  return query
  select
    result_decision,
    result_reason,
    result_release,
    result_target_release_id,
    result_install_authorized,
    result_request_id,
    result_command_id,
    result_requested_at;
end;
$$;

create or replace function public.report_device_ota_progress(
  p_hardware_uid text,
  p_device_auth_token text,
  p_release_id text,
  p_state public.device_firmware_ota_state,
  p_failure_code text default null,
  p_failure_detail text default null,
  p_firmware_version text default null
)
returns public.device_firmware_ota_statuses
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  target_release public.firmware_releases;
  created_event public.device_firmware_ota_events;
  updated_status public.device_firmware_ota_statuses;
  active_request public.device_firmware_update_requests;
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  normalized_failure_code text := nullif(trim(coalesce(p_failure_code, '')), '');
  normalized_failure_detail text := nullif(trim(coalesce(p_failure_detail, '')), '');
  normalized_firmware_version text := nullif(trim(coalesce(p_firmware_version, '')), '');
  is_terminal boolean := false;
begin
  if normalized_release_id is null then
    raise exception 'Release ID is required.';
  end if;

  if normalized_firmware_version is null then
    raise exception 'Current firmware version is required.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = normalized_release_id
  for update;

  if not found then
    raise exception 'Firmware release not found.';
  end if;

  insert into public.device_firmware_ota_events (
    device_id,
    release_id,
    state,
    failure_code,
    failure_detail,
    firmware_version
  )
  values (
    authenticated_device.id,
    normalized_release_id,
    p_state,
    normalized_failure_code,
    normalized_failure_detail,
    normalized_firmware_version
  )
  returning * into created_event;

  select *
  into active_request
  from public.device_firmware_update_requests requests
  where requests.device_id = authenticated_device.id
    and requests.release_id = normalized_release_id
    and requests.status = 'requested'
  order by requests.requested_at desc
  limit 1
  for update;

  is_terminal := p_state in (
    'succeeded',
    'failed_download',
    'failed_verify',
    'failed_stage',
    'failed_boot',
    'rolled_back',
    'recovery_needed',
    'blocked'
  );

  insert into public.device_firmware_ota_statuses (
    device_id,
    last_event_id,
    current_state,
    target_release_id,
    confirmed_release_id,
    reported_firmware_version,
    install_request_id,
    command_id,
    last_failure_code,
    last_failure_detail,
    last_reported_at,
    last_requested_at,
    ota_started_at,
    ota_completed_at
  )
  values (
    authenticated_device.id,
    created_event.id,
    p_state,
    normalized_release_id,
    case when p_state = 'succeeded' then normalized_release_id else null end,
    normalized_firmware_version,
    active_request.id,
    active_request.command_id,
    normalized_failure_code,
    normalized_failure_detail,
    created_event.reported_at,
    active_request.requested_at,
    case
      when p_state in ('requested', 'downloading', 'downloaded', 'verifying', 'staged', 'rebooting', 'pending_confirm', 'succeeded') then created_event.reported_at
      else null
    end,
    case when is_terminal then created_event.reported_at else null end
  )
  on conflict (device_id) do update
  set
    last_event_id = excluded.last_event_id,
    current_state = excluded.current_state,
    target_release_id = excluded.target_release_id,
    confirmed_release_id = case
      when excluded.confirmed_release_id is not null then excluded.confirmed_release_id
      else public.device_firmware_ota_statuses.confirmed_release_id
    end,
    reported_firmware_version = excluded.reported_firmware_version,
    install_request_id = coalesce(excluded.install_request_id, public.device_firmware_ota_statuses.install_request_id),
    command_id = coalesce(excluded.command_id, public.device_firmware_ota_statuses.command_id),
    last_failure_code = excluded.last_failure_code,
    last_failure_detail = excluded.last_failure_detail,
    last_reported_at = excluded.last_reported_at,
    last_requested_at = coalesce(excluded.last_requested_at, public.device_firmware_ota_statuses.last_requested_at),
    ota_started_at = case
      when excluded.current_state in ('requested', 'downloading', 'downloaded', 'verifying', 'staged', 'rebooting', 'pending_confirm', 'succeeded')
        then coalesce(public.device_firmware_ota_statuses.ota_started_at, excluded.last_reported_at)
      else public.device_firmware_ota_statuses.ota_started_at
    end,
    ota_completed_at = case
      when is_terminal then excluded.ota_completed_at
      else null
    end
  returning * into updated_status;

  if active_request.id is not null and is_terminal then
    update public.device_firmware_update_requests requests
    set
      status = 'completed',
      completed_at = created_event.reported_at,
      last_error = normalized_failure_detail
    where requests.id = active_request.id
      and requests.status = 'requested';
  end if;

  update public.devices devices
  set
    firmware_version = normalized_firmware_version,
    last_seen_at = now(),
    last_sync_at = now()
  where devices.id = authenticated_device.id;

  return updated_status;
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

  if updated_command.kind = 'begin_firmware_update' and p_status in ('failed', 'cancelled') then
    update public.device_firmware_update_requests requests
    set
      status = 'cancelled',
      completed_at = now(),
      last_error = coalesce(p_last_error, 'Device rejected the firmware update request.')
    where requests.command_id = updated_command.id
      and requests.status = 'requested';

    insert into public.device_firmware_ota_statuses (
      device_id,
      current_state,
      target_release_id,
      command_id,
      last_failure_code,
      last_failure_detail,
      last_reported_at,
      ota_completed_at
    )
    values (
      authenticated_device.id,
      'blocked',
      nullif(updated_command.payload ->> 'release_id', ''),
      updated_command.id,
      'command_rejected',
      coalesce(p_last_error, 'Device rejected the firmware update request.'),
      now(),
      now()
    )
    on conflict (device_id) do update
    set
      current_state = 'blocked',
      target_release_id = excluded.target_release_id,
      command_id = excluded.command_id,
      last_failure_code = excluded.last_failure_code,
      last_failure_detail = excluded.last_failure_detail,
      last_reported_at = excluded.last_reported_at,
      ota_completed_at = excluded.ota_completed_at;
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

revoke all on table public.firmware_releases from public;
revoke all on table public.firmware_release_rollout_allowlist from public;
revoke all on table public.device_firmware_update_requests from public;
revoke all on table public.device_firmware_ota_events from public;
revoke all on table public.device_firmware_ota_statuses from public;

revoke all on function public.compare_firmware_versions(text, text) from public;
revoke all on function public.device_rollout_bucket(text, text) from public;
revoke all on function public.build_firmware_release_envelope(text) from public;
revoke all on function public.begin_firmware_update(uuid, text, uuid, public.device_firmware_update_request_source) from public;
revoke all on function public.check_device_firmware_release(text, text, text, text, text) from public;
revoke all on function public.report_device_ota_progress(text, text, text, public.device_firmware_ota_state, text, text, text) from public;

grant select, insert, update, delete on table public.firmware_releases to service_role;
grant select, insert, update, delete on table public.firmware_release_rollout_allowlist to service_role;
grant select on table public.device_firmware_update_requests to service_role;
grant select on table public.device_firmware_ota_events to service_role;
grant select on table public.device_firmware_ota_statuses to service_role;

grant execute on function public.build_firmware_release_envelope(text) to service_role;
grant execute on function public.begin_firmware_update(uuid, text, uuid, public.device_firmware_update_request_source) to authenticated, service_role;
grant execute on function public.check_device_firmware_release(text, text, text, text, text) to anon, authenticated;
grant execute on function public.report_device_ota_progress(text, text, text, public.device_firmware_ota_state, text, text, text) to anon, authenticated;

commit;
