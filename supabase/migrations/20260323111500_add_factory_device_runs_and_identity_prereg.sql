begin;

create table if not exists public.factory_device_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  hardware_uid text null,
  device_id uuid null references public.devices(id) on delete set null,
  firmware_release_id text not null,
  firmware_version text null,
  hardware_profile text null,
  order_number text null,
  recipient text null,
  build_notes text null,
  status text not null default 'draft'
    check (status in ('draft', 'flashed', 'qa_failed', 'qa_passed', 'preregistered', 'ship_ready')),
  ready_to_ship boolean not null default false,
  ready_to_ship_at timestamptz null,
  preregistered_at timestamptz null,
  ship_block_reason text null,
  qa_results jsonb not null default '{}'::jsonb
);

create index if not exists factory_device_runs_hardware_uid_idx
  on public.factory_device_runs (hardware_uid);

create index if not exists factory_device_runs_status_idx
  on public.factory_device_runs (status, created_at desc);

alter table public.factory_device_runs enable row level security;

drop trigger if exists set_factory_device_runs_updated_at on public.factory_device_runs;
create trigger set_factory_device_runs_updated_at
before update on public.factory_device_runs
for each row
execute function public.set_updated_at();

create or replace function public.preregister_factory_device_identity(
  p_hardware_uid text,
  p_firmware_version text default null,
  p_hardware_profile text default null,
  p_name text default null
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
  normalized_firmware text := nullif(trim(coalesce(p_firmware_version, '')), '');
  preregistered_device public.devices;
begin
  if normalized_hardware_uid is null then
    raise exception 'Hardware UID is required.';
  end if;

  select *
  into preregistered_device
  from public.devices devices
  where devices.hardware_uid = normalized_hardware_uid
  for update;

  if found then
    if preregistered_device.account_removal_state = 'removed' then
      raise exception 'Removed devices must be onboarded again through setup.';
    end if;

    update public.devices devices
    set
      name = coalesce(normalized_name, devices.name),
      hardware_profile = coalesce(normalized_profile, devices.hardware_profile),
      firmware_version = coalesce(normalized_firmware, devices.firmware_version),
      account_removal_state = 'active',
      account_removal_mode = null,
      account_removal_requested_at = null,
      account_removal_deadline_at = null,
      account_removal_completed_at = null,
      account_removal_completion = null
    where devices.id = preregistered_device.id
    returning * into preregistered_device;
  else
    insert into public.devices (
      hardware_uid,
      hardware_profile,
      name,
      firmware_version,
      account_removal_state
    )
    values (
      normalized_hardware_uid,
      coalesce(normalized_profile, 'addone-v1'),
      coalesce(normalized_name, 'AddOne'),
      coalesce(normalized_firmware, ''),
      'active'
    )
    returning * into preregistered_device;
  end if;

  return preregistered_device;
end;
$$;

revoke all on table public.factory_device_runs from public;
grant select, insert, update on table public.factory_device_runs to service_role;

revoke all on function public.preregister_factory_device_identity(text, text, text, text) from public;
grant execute on function public.preregister_factory_device_identity(text, text, text, text) to service_role;

commit;
