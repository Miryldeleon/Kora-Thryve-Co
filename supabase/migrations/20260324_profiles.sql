-- Kora Thryve auth profiles
-- Run this in Supabase SQL editor or via migration tooling.

create type public.user_role as enum ('teacher', 'student');
create type public.approval_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  role public.user_role not null,
  approval_status public.approval_status not null default 'pending',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_updated
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_admin_select_all"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "profiles_admin_update_all"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "admin_users_select_own"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
    'student'::public.user_role
  );

  insert into public.profiles (id, email, role, approval_status)
  values (new.id, new.email, requested_role, 'pending'::public.approval_status)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
