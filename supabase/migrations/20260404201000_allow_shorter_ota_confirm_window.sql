begin;

alter table public.firmware_releases
  drop constraint if exists firmware_releases_confirm_window_seconds_check;

alter table public.firmware_releases
  alter column confirm_window_seconds set default 45;

alter table public.firmware_releases
  add constraint firmware_releases_confirm_window_seconds_check
  check (confirm_window_seconds between 30 and 120);

commit;
