begin;

create or replace function public.list_device_share_requests(p_device_id uuid)
returns table (
  id uuid,
  requester_user_id uuid,
  requester_display_name text,
  requester_avatar_url text,
  created_at timestamptz,
  status public.device_share_request_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    requests.id,
    requests.requester_user_id,
    profiles.display_name as requester_display_name,
    profiles.avatar_url as requester_avatar_url,
    requests.created_at,
    requests.status
  from public.device_share_requests requests
  join public.profiles profiles
    on profiles.user_id = requests.requester_user_id
  where requests.device_id = p_device_id
    and requests.status = 'pending'
    and public.is_device_owner(p_device_id)
  order by requests.created_at asc;
$$;

create or replace function public.list_device_viewers(p_device_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    memberships.id as membership_id,
    memberships.user_id,
    profiles.display_name,
    profiles.avatar_url,
    memberships.approved_at
  from public.device_memberships memberships
  join public.profiles profiles
    on profiles.user_id = memberships.user_id
  where memberships.device_id = p_device_id
    and memberships.role = 'viewer'
    and memberships.status = 'approved'
    and public.is_device_owner(p_device_id)
  order by profiles.display_name asc;
$$;

revoke all on function public.list_device_share_requests(uuid) from public;
revoke all on function public.list_device_viewers(uuid) from public;

grant execute on function public.list_device_share_requests(uuid) to authenticated;
grant execute on function public.list_device_viewers(uuid) to authenticated;

commit;
