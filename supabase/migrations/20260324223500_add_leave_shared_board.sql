begin;

create or replace function public.leave_shared_board(
  p_device_id uuid,
  p_membership_id uuid
)
returns public.device_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_membership public.device_memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
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
    raise exception 'You can only remove shared boards from your own account.';
  end if;

  if viewer_membership.role <> 'viewer' then
    raise exception 'Only viewer memberships can leave shared boards.';
  end if;

  if viewer_membership.status <> 'approved' then
    raise exception 'Only approved shared boards can be removed.';
  end if;

  update public.device_memberships memberships
  set status = 'revoked'
  where memberships.id = viewer_membership.id
  returning * into viewer_membership;

  return viewer_membership;
end;
$$;

revoke all on function public.leave_shared_board(uuid, uuid) from public;
grant execute on function public.leave_shared_board(uuid, uuid) to authenticated;

commit;
