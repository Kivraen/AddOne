begin;

alter table public.device_memberships
  add column if not exists celebration_transition_speed text not null default 'balanced',
  add column if not exists celebration_dwell_seconds integer not null default 15;

alter table public.device_memberships
  drop constraint if exists device_memberships_celebration_transition_speed_check;

alter table public.device_memberships
  add constraint device_memberships_celebration_transition_speed_check
  check (celebration_transition_speed in ('fast', 'balanced', 'slow'));

alter table public.device_memberships
  drop constraint if exists device_memberships_celebration_dwell_seconds_check;

alter table public.device_memberships
  add constraint device_memberships_celebration_dwell_seconds_check
  check (celebration_dwell_seconds between 1 and 30);

create or replace function public.set_shared_board_celebration_preferences(
  p_device_id uuid,
  p_membership_id uuid,
  p_enabled boolean default null,
  p_transition text default null,
  p_transition_speed text default null,
  p_dwell_seconds integer default null
)
returns public.device_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  next_transition text := nullif(trim(coalesce(p_transition, '')), '');
  next_transition_speed text := nullif(trim(coalesce(p_transition_speed, '')), '');
  next_dwell_seconds integer := p_dwell_seconds;
  viewer_membership public.device_memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if next_transition is not null and next_transition not in (
    'column_wipe',
    'reverse_wipe',
    'center_split',
    'top_drop',
    'diagonal_wave',
    'constellation'
  ) then
    raise exception 'Unsupported celebration transition.';
  end if;

  if next_transition_speed is not null and next_transition_speed not in ('fast', 'balanced', 'slow') then
    raise exception 'Unsupported celebration speed.';
  end if;

  if next_dwell_seconds is not null and (next_dwell_seconds < 1 or next_dwell_seconds > 30) then
    raise exception 'Celebration dwell seconds must be between 1 and 30.';
  end if;

  select *
  into viewer_membership
  from public.device_memberships memberships
  where memberships.id = p_membership_id
    and memberships.device_id = p_device_id
  for update;

  if not found then
    raise exception 'Shared board membership not found.';
  end if;

  if viewer_membership.user_id <> auth.uid() then
    raise exception 'You can only update your own shared-board preferences.';
  end if;

  if viewer_membership.role <> 'viewer' then
    raise exception 'Only viewer memberships can change celebration preferences.';
  end if;

  if viewer_membership.status <> 'approved' then
    raise exception 'Only approved shared boards can change celebration preferences.';
  end if;

  update public.device_memberships memberships
  set
    celebration_enabled = coalesce(p_enabled, memberships.celebration_enabled),
    celebration_transition = coalesce(next_transition, memberships.celebration_transition),
    celebration_transition_speed = coalesce(next_transition_speed, memberships.celebration_transition_speed),
    celebration_dwell_seconds = coalesce(next_dwell_seconds, memberships.celebration_dwell_seconds)
  where memberships.id = viewer_membership.id
  returning * into viewer_membership;

  return viewer_membership;
end;
$$;

revoke all on function public.set_shared_board_celebration_preferences(uuid, uuid, boolean, text, text, integer) from public;
grant execute on function public.set_shared_board_celebration_preferences(uuid, uuid, boolean, text, text, integer) to authenticated;

create or replace function public.queue_friend_celebration_from_device(
  p_hardware_uid text,
  p_device_auth_token text,
  p_source_local_date date,
  p_current_week_start date,
  p_today_row integer,
  p_weekly_target integer,
  p_board_days jsonb,
  p_palette_preset text,
  p_palette_custom jsonb default '{}'::jsonb,
  p_emitted_at text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_device public.devices;
  recipient record;
  expires_at timestamptz := now() + interval '60 seconds';
  emitted_at_text text := nullif(trim(coalesce(p_emitted_at, '')), '');
  expires_at_text text := to_char(timezone('UTC', expires_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  queued_count integer := 0;
  request_key text;
begin
  if p_source_local_date is null then
    raise exception 'Source local date is required.';
  end if;

  if p_today_row is null or p_today_row < 0 or p_today_row > 6 then
    raise exception 'today_row must be between 0 and 6.';
  end if;

  if p_weekly_target is null or p_weekly_target < 1 or p_weekly_target > 7 then
    raise exception 'weekly_target must be between 1 and 7.';
  end if;

  if p_board_days is null or jsonb_typeof(p_board_days) <> 'array' then
    raise exception 'board_days must be a JSON array.';
  end if;

  authenticated_device := public.authenticate_device(p_hardware_uid, p_device_auth_token);

  for recipient in
    select distinct
      recipient_devices.id as recipient_device_id,
      coalesce(viewers.celebration_transition, 'column_wipe') as celebration_transition,
      coalesce(viewers.celebration_transition_speed, 'balanced') as celebration_transition_speed,
      coalesce(viewers.celebration_dwell_seconds, 15) as celebration_dwell_seconds
    from public.device_memberships viewers
    join public.device_memberships recipient_owners
      on recipient_owners.user_id = viewers.user_id
     and recipient_owners.role = 'owner'
     and recipient_owners.status = 'approved'
    join public.devices recipient_devices
      on recipient_devices.id = recipient_owners.device_id
    where viewers.device_id = authenticated_device.id
      and viewers.role = 'viewer'
      and viewers.status = 'approved'
      and viewers.celebration_enabled = true
      and recipient_devices.id <> authenticated_device.id
      and recipient_devices.last_seen_at >= now() - interval '2 minutes'
  loop
    request_key := format(
      'friend-celebration:%s:%s:%s',
      recipient.recipient_device_id,
      authenticated_device.id,
      p_source_local_date::text
    );

    perform public.queue_device_command(
      p_device_id => recipient.recipient_device_id,
      p_kind => 'play_friend_celebration',
      p_payload => jsonb_build_object(
        'source_device_id', authenticated_device.id::text,
        'source_local_date', p_source_local_date::text,
        'current_week_start', p_current_week_start::text,
        'today_row', p_today_row,
        'weekly_target', p_weekly_target,
        'board_days', p_board_days,
        'palette_preset', nullif(trim(coalesce(p_palette_preset, '')), ''),
        'palette_custom', coalesce(p_palette_custom, '{}'::jsonb),
        'emitted_at', emitted_at_text,
        'expires_at', expires_at_text,
        'transition_style', recipient.celebration_transition,
        'transition_speed', recipient.celebration_transition_speed,
        'dwell_seconds', recipient.celebration_dwell_seconds
      ),
      p_request_key => request_key
    );

    queued_count := queued_count + 1;
  end loop;

  return jsonb_build_object(
    'queued_count', queued_count,
    'expires_at', expires_at_text
  );
end;
$$;

revoke all on function public.queue_friend_celebration_from_device(text, text, date, date, integer, integer, jsonb, text, jsonb, text) from public;
grant execute on function public.queue_friend_celebration_from_device(text, text, date, date, integer, integer, jsonb, text, jsonb, text) to anon, authenticated;

commit;
