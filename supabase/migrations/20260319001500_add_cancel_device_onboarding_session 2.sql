begin;

create or replace function public.cancel_device_onboarding_session(
  p_session_id uuid,
  p_reason text default null
)
returns public.device_onboarding_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_session public.device_onboarding_sessions;
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
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

  if current_session.status in ('claimed', 'cancelled', 'failed', 'expired') then
    return current_session;
  end if;

  update public.device_onboarding_sessions sessions
  set
    status = 'cancelled',
    cancelled_at = coalesce(sessions.cancelled_at, now()),
    last_error = coalesce(normalized_reason, sessions.last_error, 'Cancelled from the app.')
  where sessions.id = current_session.id
  returning * into current_session;

  return current_session;
end;
$$;

revoke all on function public.cancel_device_onboarding_session(uuid, text) from public;
grant execute on function public.cancel_device_onboarding_session(uuid, text) to authenticated;

commit;
