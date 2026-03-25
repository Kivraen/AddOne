begin;

create or replace function public.list_shared_board_owners(p_device_ids uuid[])
returns table (
  device_id uuid,
  owner_user_id uuid,
  owner_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    memberships.device_id,
    memberships.user_id as owner_user_id,
    coalesce(profiles.display_name, 'AddOne User') as owner_display_name
  from public.device_memberships memberships
  left join public.profiles profiles
    on profiles.user_id = memberships.user_id
  where memberships.device_id = any (coalesce(p_device_ids, array[]::uuid[]))
    and memberships.role = 'owner'
    and memberships.status = 'approved'
    and public.is_device_member(
      memberships.device_id,
      array['viewer', 'owner']::public.device_membership_role[],
      array['approved']::public.device_membership_status[]
    );
$$;

revoke all on function public.list_shared_board_owners(uuid[]) from public;
grant execute on function public.list_shared_board_owners(uuid[]) to authenticated;

commit;
