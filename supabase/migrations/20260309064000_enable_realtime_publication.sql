do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'devices',
    'device_memberships',
    'device_day_states',
    'device_commands',
    'device_share_codes',
    'device_share_requests',
    'device_onboarding_sessions'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
