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
      'AddOne User'
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

update public.profiles
set display_name = 'AddOne User',
    updated_at = timezone('utc', now())
where nullif(btrim(coalesce(first_name, '')), '') is null
  and nullif(btrim(coalesce(last_name, '')), '') is null
  and username is null;
