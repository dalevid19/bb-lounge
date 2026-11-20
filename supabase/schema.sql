-- B&B Lounge database. Run once on a new Supabase project.
-- Every record lives in one table ("docs"), grouped by collection, the same way the app stores them today.
-- Who can read and change each collection is decided here, in the database, so it can't be bypassed from a phone.

create extension if not exists pgcrypto;

-- Staff accounts: one row per person who can sign in.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  name       text not null,
  role       text not null check (role in ('owner', 'hr', 'staff')),
  staff_id   text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- All app records (bookings, payroll, inventory, …).
create table if not exists public.docs (
  col        text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
create index if not exists docs_col_idx on public.docs (col);

alter table public.profiles enable row level security;
alter table public.docs enable row level security;

-- The signed-in person's role, or null if they have no active account.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid() and active
$$;

create or replace function public.can_read(c text, i text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.my_role() is null then false
    when c = 'audit' then public.my_role() = 'owner' or i = auth.uid()::text
    when c in ('payroll', 'staffpay', 'expenses') then public.my_role() in ('owner', 'hr')
    else true
  end
$$;

create or replace function public.can_write(c text, i text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.my_role() is null then false
    when c = 'settings' then public.my_role() = 'owner'
    when c = 'audit' then i = auth.uid()::text or public.my_role() = 'owner'
    when c in ('bookings', 'inventory', 'kits', 'kitchecks', 'backjobs') then true
    else public.my_role() in ('owner', 'hr')
  end
$$;

drop policy if exists docs_read on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
drop policy if exists docs_delete on public.docs;
create policy docs_read   on public.docs for select using (public.can_read(col, id));
create policy docs_insert on public.docs for insert with check (public.can_write(col, id));
create policy docs_update on public.docs for update using (public.can_write(col, id)) with check (public.can_write(col, id));
create policy docs_delete on public.docs for delete using (public.can_write(col, id));

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_owner_write on public.profiles;
create policy profiles_read on public.profiles for select using (user_id = auth.uid() or public.my_role() in ('owner', 'hr'));
create policy profiles_owner_write on public.profiles for all using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

-- Owner adds a staff account: the auth user is created by the app, this links it to a name and role.
create or replace function public.owner_add_profile(p_user uuid, p_username text, p_name text, p_role text, p_staff text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'owner' then raise exception 'Only the owner can add accounts'; end if;
  insert into public.profiles (user_id, username, name, role, staff_id) values (p_user, lower(p_username), p_name, p_role, coalesce(p_staff, ''));
end $$;

-- Owner gives someone a new password (for a forgotten password).
create or replace function public.owner_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if public.my_role() is distinct from 'owner' then raise exception 'Only the owner can change other people''s passwords'; end if;
  if length(p_password) < 8 then raise exception 'Use at least 8 characters'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
end $$;

-- Turn a username into the hidden sign-in email (usernames are what staff type).
create or replace function public.login_email(p_username text) returns text
language sql immutable as $$ select lower(p_username) || '@staff.bblounge.app' $$;

-- Live updates to every open phone.
alter table public.docs replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- Logo and other uploaded images.
insert into storage.buckets (id, name, public) values ('assets', 'assets', true) on conflict (id) do nothing;
drop policy if exists assets_owner_write on storage.objects;
drop policy if exists assets_owner_update on storage.objects;
drop policy if exists assets_owner_delete on storage.objects;
create policy assets_owner_write  on storage.objects for insert with check (bucket_id = 'assets' and public.my_role() = 'owner');
create policy assets_owner_update on storage.objects for update using (bucket_id = 'assets' and public.my_role() = 'owner');
create policy assets_owner_delete on storage.objects for delete using (bucket_id = 'assets' and public.my_role() = 'owner');

-- Signed-in staff may use the tables (row rules above still decide which rows); visitors who are not signed in get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.docs, public.profiles to authenticated;
revoke all on public.docs, public.profiles from anon;
grant execute on function public.my_role(), public.can_read(text,text), public.can_write(text,text), public.owner_add_profile(uuid,text,text,text,text), public.owner_set_password(uuid,text) to authenticated;
revoke execute on function public.owner_add_profile(uuid,text,text,text,text), public.owner_set_password(uuid,text) from anon, public;

-- Only the owner may change PINs: HR and staff cannot change their own (the owner sets them with owner_set_password).
create or replace function public.guard_pin_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and session_user = 'supabase_auth_admin'
     and coalesce((select role from public.profiles where user_id = new.id), '') <> 'owner' then
    raise exception 'Only the owner can change PINs';
  end if;
  return new;
end $$;
drop trigger if exists guard_pin_change on auth.users;
create trigger guard_pin_change before update on auth.users for each row execute function public.guard_pin_change();
