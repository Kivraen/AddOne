begin;

alter table public.device_memberships
  drop constraint if exists device_memberships_celebration_transition_speed_check;

alter table public.device_memberships
  add constraint device_memberships_celebration_transition_speed_check
  check (celebration_transition_speed in ('fast', 'balanced', 'slow', 'even_slower'));

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
    'constellation',
    'bottom_rise',
    'edge_close',
    'reverse_diagonal',
    'matrix_rain',
    'venetian',
    'pulse_ring'
  ) then
    raise exception 'Unsupported celebration transition.';
  end if;

  if next_transition_speed is not null and next_transition_speed not in ('fast', 'balanced', 'slow', 'even_slower') then
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

commit;
