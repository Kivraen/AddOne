begin;

create or replace function public.get_device_firmware_update_summary(
  p_device_id uuid,
  p_app_version text default null
)
returns table (
  device_id uuid,
  current_firmware_version text,
  current_firmware_channel text,
  current_state public.device_firmware_ota_state,
  target_release_id text,
  confirmed_release_id text,
  reported_firmware_version text,
  last_failure_code text,
  last_failure_detail text,
  last_requested_at timestamptz,
  last_reported_at timestamptz,
  ota_started_at timestamptz,
  ota_completed_at timestamptz,
  available_release_id text,
  available_firmware_version text,
  available_install_policy public.firmware_release_install_policy,
  minimum_app_version text,
  minimum_confirmed_firmware_version text,
  availability_reason text,
  update_available boolean,
  can_request_update boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.devices;
  current_ota_status public.device_firmware_ota_statuses;
  candidate_release public.firmware_releases;
  normalized_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  version_compare integer := null;
  minimum_compare integer := null;
  app_compare integer := null;
  rollout_eligible boolean := false;
  ota_in_progress boolean := false;
  assumed_partition_layout constant text := 'addone-dual-ota-v1';
  result_available_release_id text := null;
  result_available_firmware_version text := null;
  result_available_install_policy public.firmware_release_install_policy := null;
  result_minimum_app_version text := null;
  result_minimum_confirmed_firmware_version text := null;
  result_reason text := 'no_active_release';
  computed_update_available boolean := false;
  computed_can_request_update boolean := false;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can view firmware update status for this device.';
  end if;

  select *
  into target_device
  from public.devices devices
  where devices.id = p_device_id;

  if not found then
    raise exception 'Device not found.';
  end if;

  select *
  into current_ota_status
  from public.device_firmware_ota_statuses statuses
  where statuses.device_id = p_device_id;

  ota_in_progress := coalesce(current_ota_status.current_state in (
    'requested',
    'downloading',
    'downloaded',
    'verifying',
    'staged',
    'rebooting',
    'pending_confirm'
  ), false);

  if ota_in_progress and current_ota_status.target_release_id is not null then
    select *
    into candidate_release
    from public.firmware_releases releases
    where releases.release_id = current_ota_status.target_release_id;
  else
    select *
    into candidate_release
    from public.firmware_releases releases
    where releases.status = 'active'
      and releases.hardware_profile = target_device.hardware_profile
      and releases.channel = target_device.firmware_channel
    limit 1;
  end if;

  if target_device.account_removal_state <> 'active' then
    result_reason := 'device_not_active';
  elsif candidate_release.release_id is null then
    result_reason := 'no_active_release';
  else
    result_available_release_id := candidate_release.release_id;
    result_available_firmware_version := candidate_release.firmware_version;
    result_available_install_policy := candidate_release.install_policy;
    result_minimum_app_version := candidate_release.minimum_app_version;
    result_minimum_confirmed_firmware_version := candidate_release.minimum_confirmed_firmware_version;

    if ota_in_progress and (
      current_ota_status.target_release_id is null
      or current_ota_status.target_release_id <> candidate_release.release_id
    ) then
      result_reason := 'ota_already_in_progress';
    elsif candidate_release.status = 'paused' then
      result_reason := 'release_paused';
    elsif candidate_release.status = 'rolled_back' then
      result_reason := 'release_rolled_back';
    elsif candidate_release.status <> 'active' then
      result_reason := 'release_not_active';
    elsif candidate_release.minimum_partition_layout <> assumed_partition_layout then
      result_reason := 'partition_layout_unknown';
    else
      rollout_eligible := case candidate_release.rollout_mode
        when 'all' then true
        when 'allowlist' then exists (
          select 1
          from public.firmware_release_rollout_allowlist allowlist
          where allowlist.release_id = candidate_release.release_id
            and allowlist.hardware_uid = target_device.hardware_uid
        )
        when 'percentage' then public.device_rollout_bucket(target_device.hardware_uid, candidate_release.release_id) < candidate_release.rollout_value
        else false
      end;

      if not rollout_eligible then
        result_reason := 'not_in_rollout';
      else
        version_compare := public.compare_firmware_versions(
          candidate_release.firmware_version,
          target_device.firmware_version
        );

        if version_compare is not null and version_compare <= 0 then
          result_reason := 'up_to_date';
        else
          if candidate_release.minimum_confirmed_firmware_version is not null then
            minimum_compare := public.compare_firmware_versions(
              target_device.firmware_version,
              candidate_release.minimum_confirmed_firmware_version
            );
          end if;

          if candidate_release.minimum_confirmed_firmware_version is not null
            and minimum_compare is not null
            and minimum_compare < 0 then
            result_reason := 'minimum_version_not_met';
          elsif candidate_release.minimum_app_version is not null then
            if normalized_app_version is null then
              result_reason := 'minimum_app_version_unknown';
            else
              app_compare := public.compare_firmware_versions(
                normalized_app_version,
                candidate_release.minimum_app_version
              );

              if app_compare is null then
                result_reason := 'minimum_app_version_unknown';
              elsif app_compare < 0 then
                result_reason := 'minimum_app_version_not_met';
              else
                result_reason := case
                  when ota_in_progress then 'in_progress_recheck'
                  when candidate_release.install_policy = 'auto_apply' then 'auto_apply'
                  else 'user_confirmation_required'
                end;
                computed_update_available := not ota_in_progress;
                computed_can_request_update := not ota_in_progress;
              end if;
            end if;
          else
            result_reason := case
              when ota_in_progress then 'in_progress_recheck'
              when candidate_release.install_policy = 'auto_apply' then 'auto_apply'
              else 'user_confirmation_required'
            end;
            computed_update_available := not ota_in_progress;
            computed_can_request_update := not ota_in_progress;
          end if;
        end if;
      end if;
    end if;
  end if;

  return query
  select
    p_device_id,
    target_device.firmware_version,
    target_device.firmware_channel,
    current_ota_status.current_state,
    current_ota_status.target_release_id,
    current_ota_status.confirmed_release_id,
    current_ota_status.reported_firmware_version,
    current_ota_status.last_failure_code,
    current_ota_status.last_failure_detail,
    current_ota_status.last_requested_at,
    current_ota_status.last_reported_at,
    current_ota_status.ota_started_at,
    current_ota_status.ota_completed_at,
    result_available_release_id,
    result_available_firmware_version,
    result_available_install_policy,
    result_minimum_app_version,
    result_minimum_confirmed_firmware_version,
    result_reason,
    computed_update_available,
    computed_can_request_update;
end;
$$;

commit;
