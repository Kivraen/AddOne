begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.profiles
set
  avatar_url = nullif(trim(coalesce(avatar_url, '')), ''),
  display_name = coalesce(nullif(trim(display_name), ''), 'AddOne User'),
  first_name = nullif(trim(coalesce(first_name, '')), ''),
  last_name = nullif(trim(coalesce(last_name, '')), ''),
  username = nullif(lower(trim(coalesce(username, ''))), '');

alter table public.profiles
  drop constraint if exists profiles_display_name_not_blank,
  add constraint profiles_display_name_not_blank
    check (nullif(btrim(display_name), '') is not null),
  drop constraint if exists profiles_names_required_with_username,
  add constraint profiles_names_required_with_username
    check (
      username is null
      or (
        nullif(btrim(first_name), '') is not null
        and nullif(btrim(last_name), '') is not null
      )
    ),
  drop constraint if exists profiles_display_name_matches_names,
  add constraint profiles_display_name_matches_names
    check (
      username is null
      or display_name = btrim(concat_ws(' ', first_name, last_name))
    ),
  drop constraint if exists profiles_username_format,
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username))
  where username is not null;

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile avatars are public" on storage.objects;
create policy "profile avatars are public"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

drop policy if exists "users insert own profile avatars" on storage.objects;
create policy "users insert own profile avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own profile avatars" on storage.objects;
create policy "users update own profile avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own profile avatars" on storage.objects;
create policy "users delete own profile avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
