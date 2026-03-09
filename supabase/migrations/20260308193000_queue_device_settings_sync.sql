begin;

create or replace function public.queue_device_settings_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.device_commands commands
  where commands.device_id = new.id
    and commands.kind = 'sync_settings'
    and commands.status in ('queued', 'delivered');

  perform public.queue_device_command(
    p_device_id => new.id,
    p_kind => 'sync_settings',
    p_payload => jsonb_build_object(
      'timezone', new.timezone,
      'day_reset_time', new.day_reset_time,
      'weekly_target', new.weekly_target,
      'palette_preset', new.palette_preset,
      'reward_enabled', new.reward_enabled,
      'reward_type', new.reward_type,
      'reward_trigger', new.reward_trigger,
      'brightness', new.brightness,
      'ambient_auto', new.ambient_auto
    )
  );

  return new;
end;
$$;

drop trigger if exists device_settings_sync_trigger on public.devices;

create trigger device_settings_sync_trigger
after update of timezone, day_reset_time, weekly_target, palette_preset, reward_enabled, reward_type, reward_trigger, brightness, ambient_auto
on public.devices
for each row
when (
  old.timezone is distinct from new.timezone
  or old.day_reset_time is distinct from new.day_reset_time
  or old.weekly_target is distinct from new.weekly_target
  or old.palette_preset is distinct from new.palette_preset
  or old.reward_enabled is distinct from new.reward_enabled
  or old.reward_type is distinct from new.reward_type
  or old.reward_trigger is distinct from new.reward_trigger
  or old.brightness is distinct from new.brightness
  or old.ambient_auto is distinct from new.ambient_auto
)
execute function public.queue_device_settings_sync();

commit;
