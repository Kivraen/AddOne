begin;

create or replace function public.revoke_device_viewer_membership(
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
    raise exception 'Viewer membership not found.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can remove viewer access.';
  end if;

  if viewer_membership.role <> 'viewer' then
    raise exception 'Only viewer memberships can be revoked.';
  end if;

  if viewer_membership.status <> 'approved' then
    raise exception 'Only approved viewers can be revoked.';
  end if;

  update public.device_memberships memberships
  set status = 'revoked'
  where memberships.id = viewer_membership.id
  returning * into viewer_membership;

  return viewer_membership;
end;
$$;

revoke all on function public.revoke_device_viewer_membership(uuid, uuid) from public;
grant execute on function public.revoke_device_viewer_membership(uuid, uuid) to authenticated;

commit;
