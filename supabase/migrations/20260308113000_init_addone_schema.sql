begin;

create extension if not exists pgcrypto;

create type public.device_membership_role as enum ('owner', 'viewer');
create type public.device_membership_status as enum ('pending', 'approved', 'revoked', 'rejected');
create type public.device_share_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.device_reward_type as enum ('clock', 'paint');
create type public.device_reward_trigger as enum ('daily', 'weekly');
create type public.device_week_start as enum ('locale', 'monday', 'sunday');
create type public.device_event_source as enum ('device', 'cloud', 'recovery', 'migration');
create type public.reward_art_source as enum ('preset', 'custom', 'ai');
create type public.device_command_kind as enum ('set_day_state', 'sync_settings');
create type public.device_command_status as enum ('queued', 'delivered', 'applied', 'failed', 'cancelled');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  hardware_uid text not null unique,
  hardware_profile text not null default 'addone-v1',
  name text not null default 'AddOne',
  timezone text not null default 'UTC',
  day_reset_time time not null default '00:00:00',
  week_start public.device_week_start not null default 'locale',
  weekly_target smallint not null default 5 check (weekly_target between 1 and 7),
  palette_preset text not null default 'classic',
  palette_custom jsonb not null default '{}'::jsonb,
  reward_enabled boolean not null default false,
  reward_type public.device_reward_type not null default 'paint',
  reward_trigger public.device_reward_trigger not null default 'daily',
  reward_artwork_id uuid,
  brightness smallint not null default 70 check (brightness between 0 and 100),
  ambient_auto boolean not null default true,
  firmware_version text not null default 'unknown',
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_artworks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  name text not null,
  source public.reward_art_source not null,
  pixel_data jsonb not null default '[]'::jsonb check (jsonb_typeof(pixel_data) = 'array'),
  prompt text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.devices
  add constraint devices_reward_artwork_id_fkey
  foreign key (reward_artwork_id)
  references public.reward_artworks (id)
  on delete set null
  deferrable initially deferred;

create table public.device_memberships (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.device_membership_role not null,
  status public.device_membership_status not null,
  approved_by_user_id uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  reminder_enabled boolean not null default false,
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, user_id)
);

create unique index device_memberships_one_owner_per_device_idx
  on public.device_memberships (device_id)
  where role = 'owner' and status = 'approved';

create index device_memberships_user_status_idx
  on public.device_memberships (user_id, status, role);

create index device_memberships_device_status_idx
  on public.device_memberships (device_id, status, role);

create table public.device_share_codes (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references public.devices (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6,12}$'),
  created_by_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.device_share_requests (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  share_code_id uuid references public.device_share_codes (id) on delete set null,
  requester_user_id uuid not null references auth.users (id) on delete cascade,
  status public.device_share_request_status not null default 'pending',
  approved_by_user_id uuid references auth.users (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index device_share_requests_pending_idx
  on public.device_share_requests (device_id, requester_user_id)
  where status = 'pending';

create index device_share_requests_device_status_idx
  on public.device_share_requests (device_id, status);

create index device_share_requests_requester_status_idx
  on public.device_share_requests (requester_user_id, status);

create table public.device_day_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  local_date date not null,
  desired_state boolean not null,
  source public.device_event_source not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  client_event_id uuid unique,
  device_event_id text,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index device_day_events_device_event_id_idx
  on public.device_day_events (device_id, device_event_id)
  where device_event_id is not null;

create index device_day_events_device_date_idx
  on public.device_day_events (device_id, local_date desc, effective_at desc);

create table public.device_day_states (
  device_id uuid not null references public.devices (id) on delete cascade,
  local_date date not null,
  is_done boolean not null,
  effective_at timestamptz not null,
  updated_from public.device_event_source not null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, local_date)
);

create table public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  kind public.device_command_kind not null,
  payload jsonb not null default '{}'::jsonb,
  requested_by_user_id uuid references auth.users (id) on delete set null,
  status public.device_command_status not null default 'queued',
  request_key text unique,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  applied_at timestamptz,
  failed_at timestamptz,
  last_error text
);

create index device_commands_device_status_idx
  on public.device_commands (device_id, status, requested_at desc);

create index reward_artworks_owner_idx
  on public.reward_artworks (owner_user_id, created_at desc);

create index reward_artworks_device_idx
  on public.reward_artworks (device_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'AddOne User'
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.generate_share_code(p_length integer default 6)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  char_index integer;
begin
  if p_length < 6 or p_length > 12 then
    raise exception 'Share code length must be between 6 and 12 characters.';
  end if;

  loop
    candidate := '';

    for char_index in 1..p_length loop
      candidate := candidate || substr(alphabet, floor(random() * char_length(alphabet) + 1)::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.device_share_codes share_codes
      where share_codes.code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.is_device_member(
  p_device_id uuid,
  p_roles public.device_membership_role[] default array['owner', 'viewer']::public.device_membership_role[],
  p_statuses public.device_membership_status[] default array['approved']::public.device_membership_status[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.device_memberships memberships
    where memberships.device_id = p_device_id
      and memberships.user_id = auth.uid()
      and memberships.role = any (p_roles)
      and memberships.status = any (p_statuses)
  );
$$;

create or replace function public.is_device_owner(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_device_member(
    p_device_id,
    array['owner']::public.device_membership_role[],
    array['approved']::public.device_membership_status[]
  );
$$;

create or replace function public.can_access_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid()
    or exists (
      select 1
      from public.device_memberships mine
      join public.device_memberships theirs
        on theirs.device_id = mine.device_id
      where mine.user_id = auth.uid()
        and mine.status = 'approved'
        and theirs.user_id = p_user_id
        and theirs.status = 'approved'
    );
$$;

create or replace function public.claim_device(
  p_hardware_uid text,
  p_name text default null,
  p_hardware_profile text default null
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_hardware_uid text := nullif(trim(p_hardware_uid), '');
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  normalized_profile text := nullif(trim(coalesce(p_hardware_profile, '')), '');
  claimed_device public.devices;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  select *
  into claimed_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if found then
    if exists (
      select 1
      from public.device_memberships memberships
      where memberships.device_id = claimed_device.id
        and memberships.role = 'owner'
        and memberships.status = 'approved'
        and memberships.user_id <> auth.uid()
    ) then
      raise exception 'Device is already claimed by another owner.';
    end if;

    update public.devices devices
    set
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile)
    where devices.id = claimed_device.id
    returning * into claimed_device;
  else
    insert into public.devices (hardware_uid, hardware_profile, name)
    values (
      normalized_hardware_uid,
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne')
    )
    returning * into claimed_device;
  end if;

  insert into public.device_memberships (
    device_id,
    user_id,
    role,
    status,
    approved_by_user_id,
    approved_at
  )
  values (
    claimed_device.id,
    auth.uid(),
    'owner',
    'approved',
    auth.uid(),
    now()
  )
  on conflict (device_id, user_id) do update
  set
    role = 'owner',
    status = 'approved',
    approved_by_user_id = auth.uid(),
    approved_at = coalesce(device_memberships.approved_at, now());

  insert into public.device_share_codes (device_id, code, created_by_user_id)
  select claimed_device.id, public.generate_share_code(), auth.uid()
  where not exists (
    select 1
    from public.device_share_codes share_codes
    where share_codes.device_id = claimed_device.id
  );

  return claimed_device;
end;
$$;

create or replace function public.rotate_device_share_code(p_device_id uuid)
returns public.device_share_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  rotated_code public.device_share_codes;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_device_owner(p_device_id) then
    raise exception 'Only the device owner can rotate the share code.';
  end if;

  update public.device_share_codes share_codes
  set
    code = public.generate_share_code(),
    created_by_user_id = auth.uid(),
    is_active = true,
    expires_at = null
  where share_codes.device_id = p_device_id
  returning * into rotated_code;

  if not found then
    insert into public.device_share_codes (device_id, code, created_by_user_id)
    values (p_device_id, public.generate_share_code(), auth.uid())
    returning * into rotated_code;
  end if;

  return rotated_code;
end;
$$;

create or replace function public.request_device_view_access(p_code text)
returns public.device_share_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(nullif(trim(p_code), ''));
  share_code public.device_share_codes;
  pending_request public.device_share_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if normalized_code is null then
    raise exception 'Share code is required.';
  end if;

  select *
  into share_code
  from public.device_share_codes share_codes
  where share_codes.code = normalized_code
    and share_codes.is_active = true
    and (share_codes.expires_at is null or share_codes.expires_at > now());

  if not found then
    raise exception 'Share code is invalid or expired.';
  end if;

  if exists (
    select 1
    from public.device_memberships memberships
    where memberships.device_id = share_code.device_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'approved'
  ) then
    raise exception 'This device is already linked to your account.';
  end if;

  select *
  into pending_request
  from public.device_share_requests requests
  where requests.device_id = share_code.device_id
    and requests.requester_user_id = auth.uid()
    and requests.status = 'pending';

  if found then
    return pending_request;
  end if;

  insert into public.device_share_requests (device_id, share_code_id, requester_user_id)
  values (share_code.device_id, share_code.id, auth.uid())
  returning * into pending_request;

  return pending_request;
end;
$$;

create or replace function public.approve_device_view_request(p_request_id uuid)
returns public.device_share_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_access public.device_share_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into requested_access
  from public.device_share_requests requests
  where requests.id = p_request_id
  for update;

  if not found then
    raise exception 'Share request not found.';
  end if;

  if not public.is_device_owner(requested_access.device_id) then
    raise exception 'Only the owner can approve this request.';
  end if;

  if requested_access.status <> 'pending' then
    raise exception 'Only pending share requests can be approved.';
  end if;

  update public.device_share_requests requests
  set
    status = 'approved',
    approved_by_user_id = auth.uid(),
    responded_at = now()
  where requests.id = requested_access.id
  returning * into requested_access;

  insert into public.device_memberships (
    device_id,
    user_id,
    role,
    status,
    approved_by_user_id,
    approved_at
  )
  values (
    requested_access.device_id,
    requested_access.requester_user_id,
    'viewer',
    'approved',
    auth.uid(),
    now()
  )
  on conflict (device_id, user_id) do update
  set
    role = 'viewer',
    status = 'approved',
    approved_by_user_id = auth.uid(),
    approved_at = now();

  return requested_access;
end;
$$;

create or replace function public.reject_device_view_request(p_request_id uuid)
returns public.device_share_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_access public.device_share_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into requested_access
  from public.device_share_requests requests
  where requests.id = p_request_id
  for update;

  if not found then
    raise exception 'Share request not found.';
  end if;

  if not public.is_device_owner(requested_access.device_id) then
    raise exception 'Only the owner can reject this request.';
  end if;

  if requested_access.status <> 'pending' then
    raise exception 'Only pending share requests can be rejected.';
  end if;

  update public.device_share_requests requests
  set
    status = 'rejected',
    approved_by_user_id = auth.uid(),
    responded_at = now()
  where requests.id = requested_access.id
  returning * into requested_access;

  return requested_access;
end;
$$;

create or replace function public.record_day_state_event(
  p_device_id uuid,
  p_local_date date,
  p_is_done boolean,
  p_source public.device_event_source default 'cloud',
  p_client_event_id uuid default null,
  p_device_event_id text default null,
  p_effective_at timestamptz default now()
)
returns public.device_day_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recorded_event public.device_day_events;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication required.';
  end if;

  if auth.role() <> 'service_role' and not public.is_device_owner(p_device_id) then
    raise exception 'Only the owner can create cloud history events.';
  end if;

  insert into public.device_day_events (
    device_id,
    local_date,
    desired_state,
    source,
    actor_user_id,
    client_event_id,
    device_event_id,
    effective_at
  )
  values (
    p_device_id,
    p_local_date,
    p_is_done,
    p_source,
    auth.uid(),
    p_client_event_id,
    p_device_event_id,
    p_effective_at
  )
  returning * into recorded_event;

  return recorded_event;
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
    coalesce(p_payload, '{}'::jsonb),
    auth.uid(),
    p_request_key
  )
  returning * into queued_command;

  return queued_command;
end;
$$;

create or replace function public.apply_day_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.device_day_states as current_states (
    device_id,
    local_date,
    is_done,
    effective_at,
    updated_from,
    updated_by_user_id
  )
  values (
    new.device_id,
    new.local_date,
    new.desired_state,
    new.effective_at,
    new.source,
    new.actor_user_id
  )
  on conflict (device_id, local_date) do update
  set
    is_done = excluded.is_done,
    effective_at = excluded.effective_at,
    updated_from = excluded.updated_from,
    updated_by_user_id = excluded.updated_by_user_id,
    updated_at = now()
  where excluded.effective_at >= current_states.effective_at;

  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_devices_updated_at
before update on public.devices
for each row
execute function public.set_updated_at();

create trigger set_reward_artworks_updated_at
before update on public.reward_artworks
for each row
execute function public.set_updated_at();

create trigger set_device_memberships_updated_at
before update on public.device_memberships
for each row
execute function public.set_updated_at();

create trigger set_device_share_codes_updated_at
before update on public.device_share_codes
for each row
execute function public.set_updated_at();

create trigger set_device_share_requests_updated_at
before update on public.device_share_requests
for each row
execute function public.set_updated_at();

create trigger set_device_day_states_updated_at
before update on public.device_day_states
for each row
execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create trigger apply_device_day_event
after insert on public.device_day_events
for each row
execute function public.apply_day_event();

insert into public.profiles (user_id, display_name)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'AddOne User'
  )
from auth.users users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.reward_artworks enable row level security;
alter table public.device_memberships enable row level security;
alter table public.device_share_codes enable row level security;
alter table public.device_share_requests enable row level security;
alter table public.device_day_events enable row level security;
alter table public.device_day_states enable row level security;
alter table public.device_commands enable row level security;

create policy "profiles_select_self_or_shared"
on public.profiles
for select
to authenticated
using (public.can_access_profile(user_id));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "devices_select_for_members"
on public.devices
for select
to authenticated
using (public.is_device_member(id));

create policy "devices_update_for_owner"
on public.devices
for update
to authenticated
using (public.is_device_owner(id))
with check (public.is_device_owner(id));

create policy "devices_delete_for_owner"
on public.devices
for delete
to authenticated
using (public.is_device_owner(id));

create policy "reward_artworks_select_for_owner_or_members"
on public.reward_artworks
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or (device_id is not null and public.is_device_member(device_id))
);

create policy "reward_artworks_insert_for_owner"
on public.reward_artworks
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "reward_artworks_update_for_owner"
on public.reward_artworks
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "reward_artworks_delete_for_owner"
on public.reward_artworks
for delete
to authenticated
using (owner_user_id = auth.uid());

create policy "device_memberships_select_self_or_owner"
on public.device_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_device_owner(device_id)
);

create policy "device_share_codes_select_for_owner"
on public.device_share_codes
for select
to authenticated
using (public.is_device_owner(device_id));

create policy "device_share_requests_select_for_requester_or_owner"
on public.device_share_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or public.is_device_owner(device_id)
);

create policy "device_day_events_select_for_members"
on public.device_day_events
for select
to authenticated
using (public.is_device_member(device_id));

create policy "device_day_events_insert_for_owner"
on public.device_day_events
for insert
to authenticated
with check (public.is_device_owner(device_id));

create policy "device_day_states_select_for_members"
on public.device_day_states
for select
to authenticated
using (public.is_device_member(device_id));

create policy "device_commands_select_for_owner"
on public.device_commands
for select
to authenticated
using (public.is_device_owner(device_id));

create policy "device_commands_insert_for_owner"
on public.device_commands
for insert
to authenticated
with check (public.is_device_owner(device_id));

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.generate_share_code(integer) from public;
revoke all on function public.is_device_member(uuid, public.device_membership_role[], public.device_membership_status[]) from public;
revoke all on function public.is_device_owner(uuid) from public;
revoke all on function public.can_access_profile(uuid) from public;
revoke all on function public.apply_day_event() from public;
revoke all on function public.claim_device(text, text, text) from public;
revoke all on function public.rotate_device_share_code(uuid) from public;
revoke all on function public.request_device_view_access(text) from public;
revoke all on function public.approve_device_view_request(uuid) from public;
revoke all on function public.reject_device_view_request(uuid) from public;
revoke all on function public.record_day_state_event(uuid, date, boolean, public.device_event_source, uuid, text, timestamptz) from public;
revoke all on function public.queue_device_command(uuid, public.device_command_kind, jsonb, text) from public;

grant execute on function public.is_device_member(uuid, public.device_membership_role[], public.device_membership_status[]) to authenticated;
grant execute on function public.is_device_owner(uuid) to authenticated;
grant execute on function public.can_access_profile(uuid) to authenticated;
grant execute on function public.claim_device(text, text, text) to authenticated;
grant execute on function public.rotate_device_share_code(uuid) to authenticated;
grant execute on function public.request_device_view_access(text) to authenticated;
grant execute on function public.approve_device_view_request(uuid) to authenticated;
grant execute on function public.reject_device_view_request(uuid) to authenticated;
grant execute on function public.record_day_state_event(uuid, date, boolean, public.device_event_source, uuid, text, timestamptz) to authenticated;
grant execute on function public.queue_device_command(uuid, public.device_command_kind, jsonb, text) to authenticated;

commit;
