begin;

create or replace function public.operator_activate_firmware_release(
  p_release_id text
)
returns table (
  release_id text,
  status public.firmware_release_status,
  firmware_version text,
  previous_stable_release_id text,
  archived_release_id text,
  archived_release_status public.firmware_release_status,
  rollout_mode public.firmware_release_rollout_mode,
  rollout_value integer,
  allowlist_count bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  target_release public.firmware_releases;
  current_active public.firmware_releases;
  result_allowlist_count bigint := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operator activation requires service role.';
  end if;

  if normalized_release_id is null then
    raise exception 'Release ID is required.';
  end if;

  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = normalized_release_id
  for update;

  if not found then
    raise exception 'Firmware release not found.';
  end if;

  if target_release.status = 'rolled_back' then
    raise exception 'Rolled-back releases cannot be reactivated.';
  elsif target_release.status = 'archived' then
    raise exception 'Archived releases cannot be activated directly. Use rollback to restore the previous stable release.';
  end if;

  if target_release.status = 'active' then
    select count(*)
    into result_allowlist_count
    from public.firmware_release_rollout_allowlist entries
    where entries.release_id = target_release.release_id;

    return query
    select
      target_release.release_id,
      target_release.status,
      target_release.firmware_version,
      target_release.previous_stable_release_id,
      null::text,
      null::public.firmware_release_status,
      target_release.rollout_mode,
      target_release.rollout_value,
      result_allowlist_count,
      target_release.updated_at;
    return;
  end if;

  if target_release.previous_stable_release_id is null then
    raise exception 'Target release must declare previous_stable_release_id before activation.';
  end if;

  select *
  into current_active
  from public.firmware_releases releases
  where releases.channel = target_release.channel
    and releases.hardware_profile = target_release.hardware_profile
    and releases.status = 'active'
  for update;

  if not found then
    raise exception 'No active release exists for this channel and hardware profile.';
  end if;

  if current_active.release_id = target_release.release_id then
    raise exception 'Target release is already active.';
  end if;

  if target_release.previous_stable_release_id <> current_active.release_id then
    raise exception 'Target release previous_stable_release_id must match the current active release.';
  end if;

  update public.firmware_releases releases
  set status = 'archived'
  where releases.release_id = current_active.release_id
  returning * into current_active;

  update public.firmware_releases releases
  set status = 'active'
  where releases.release_id = target_release.release_id
  returning * into target_release;

  select count(*)
  into result_allowlist_count
  from public.firmware_release_rollout_allowlist entries
  where entries.release_id = target_release.release_id;

  return query
  select
    target_release.release_id,
    target_release.status,
    target_release.firmware_version,
    target_release.previous_stable_release_id,
    current_active.release_id,
    current_active.status,
    target_release.rollout_mode,
    target_release.rollout_value,
    result_allowlist_count,
    target_release.updated_at;
end;
$$;

create or replace function public.operator_set_firmware_release_rollout(
  p_release_id text,
  p_rollout_mode public.firmware_release_rollout_mode default 'allowlist',
  p_rollout_value integer default null,
  p_hardware_uids text[] default null
)
returns table (
  release_id text,
  status public.firmware_release_status,
  rollout_mode public.firmware_release_rollout_mode,
  rollout_value integer,
  allowlist_count bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  normalized_hardware_uids text[] := array(
    select distinct trimmed.hardware_uid
    from (
      select nullif(trim(entry), '') as hardware_uid
      from unnest(coalesce(p_hardware_uids, array[]::text[])) entry
    ) trimmed
    where trimmed.hardware_uid is not null
    order by trimmed.hardware_uid
  );
  target_release public.firmware_releases;
  result_allowlist_count bigint := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operator rollout targeting requires service role.';
  end if;

  if normalized_release_id is null then
    raise exception 'Release ID is required.';
  end if;

  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = normalized_release_id
  for update;

  if not found then
    raise exception 'Firmware release not found.';
  end if;

  if target_release.status in ('rolled_back', 'archived') then
    raise exception 'Rolled-back or archived releases cannot be retargeted.';
  end if;

  if p_rollout_mode = 'percentage' and (p_rollout_value is null or p_rollout_value < 1 or p_rollout_value > 100) then
    raise exception 'Percentage rollout requires rollout_value between 1 and 100.';
  end if;

  update public.firmware_releases releases
  set
    rollout_mode = p_rollout_mode,
    rollout_value = case
      when p_rollout_mode = 'percentage' then p_rollout_value
      else null
    end
  where releases.release_id = target_release.release_id
  returning * into target_release;

  delete from public.firmware_release_rollout_allowlist entries
  where entries.release_id = target_release.release_id;

  if p_rollout_mode = 'allowlist' and coalesce(array_length(normalized_hardware_uids, 1), 0) > 0 then
    insert into public.firmware_release_rollout_allowlist (release_id, hardware_uid)
    select target_release.release_id, entry
    from unnest(normalized_hardware_uids) entry;
  end if;

  select count(*)
  into result_allowlist_count
  from public.firmware_release_rollout_allowlist entries
  where entries.release_id = target_release.release_id;

  return query
  select
    target_release.release_id,
    target_release.status,
    target_release.rollout_mode,
    target_release.rollout_value,
    result_allowlist_count,
    target_release.updated_at;
end;
$$;

create or replace function public.operator_rollback_firmware_release(
  p_release_id text
)
returns table (
  rolled_back_release_id text,
  rolled_back_status public.firmware_release_status,
  rollback_target_release_id text,
  rollback_target_status public.firmware_release_status,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_release_id text := nullif(trim(coalesce(p_release_id, '')), '');
  target_release public.firmware_releases;
  rollback_target public.firmware_releases;
  current_active public.firmware_releases;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operator rollback requires service role.';
  end if;

  if normalized_release_id is null then
    raise exception 'Release ID is required.';
  end if;

  select *
  into target_release
  from public.firmware_releases releases
  where releases.release_id = normalized_release_id
  for update;

  if not found then
    raise exception 'Firmware release not found.';
  end if;

  if target_release.status = 'draft' then
    raise exception 'Draft releases cannot be rolled back.';
  end if;

  if target_release.previous_stable_release_id is null or target_release.allow_downgrade_to_previous_stable <> true then
    raise exception 'Release does not declare a previous stable rollback target.';
  end if;

  select *
  into rollback_target
  from public.firmware_releases releases
  where releases.release_id = target_release.previous_stable_release_id
  for update;

  if not found then
    raise exception 'Previous stable release not found.';
  end if;

  if rollback_target.status = 'rolled_back' then
    raise exception 'Previous stable release is already rolled back and cannot be restored.';
  elsif rollback_target.status = 'draft' then
    raise exception 'Previous stable release is still draft and cannot be restored.';
  end if;

  select *
  into current_active
  from public.firmware_releases releases
  where releases.channel = target_release.channel
    and releases.hardware_profile = target_release.hardware_profile
    and releases.status = 'active'
  for update;

  if found and current_active.release_id not in (target_release.release_id, rollback_target.release_id) then
    raise exception 'Another release is currently active for this channel and hardware profile.';
  end if;

  if target_release.status <> 'rolled_back' then
    update public.firmware_releases releases
    set status = 'rolled_back'
    where releases.release_id = target_release.release_id
    returning * into target_release;
  end if;

  if rollback_target.status <> 'active' then
    update public.firmware_releases releases
    set status = 'active'
    where releases.release_id = rollback_target.release_id
    returning * into rollback_target;
  end if;

  return query
  select
    target_release.release_id,
    target_release.status,
    rollback_target.release_id,
    rollback_target.status,
    greatest(target_release.updated_at, rollback_target.updated_at);
end;
$$;

revoke all on function public.operator_activate_firmware_release(text) from public;
revoke all on function public.operator_set_firmware_release_rollout(text, public.firmware_release_rollout_mode, integer, text[]) from public;
revoke all on function public.operator_rollback_firmware_release(text) from public;

grant execute on function public.operator_activate_firmware_release(text) to service_role;
grant execute on function public.operator_set_firmware_release_rollout(text, public.firmware_release_rollout_mode, integer, text[]) to service_role;
grant execute on function public.operator_rollback_firmware_release(text) to service_role;

commit;
