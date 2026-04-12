-- Shared teacher module library permissions + admin-only deletion.
-- Adds folder primitives for future UI without changing existing module UI flows.

-- 1) Folder schema primitives (no UI wiring yet)
create table if not exists public.module_folders (
  id uuid primary key,
  created_by uuid not null references auth.users (id) on delete restrict,
  name text not null,
  parent_folder_id uuid references public.module_folders (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modules
add column if not exists folder_id uuid references public.module_folders (id) on delete set null;

create or replace function public.set_module_folder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_module_folders_updated on public.module_folders;
create trigger on_module_folders_updated
before update on public.module_folders
for each row
execute function public.set_module_folder_updated_at();

alter table public.module_folders enable row level security;

-- 2) modules table RLS: shared teacher read, student read-only, admin-only delete

drop policy if exists "modules_teacher_select_own" on public.modules;
create policy "modules_teacher_select_shared_approved"
on public.modules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.profiles owner_profile
    where owner_profile.id = teacher_id
      and owner_profile.role = 'teacher'
      and owner_profile.approval_status = 'approved'
  )
);

drop policy if exists "modules_teacher_delete_own" on public.modules;

create policy "modules_admin_select_all"
on public.modules
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "modules_admin_delete_all"
on public.modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

-- 3) module_folders table RLS: teachers can create/read shared, admin deletes
create policy "module_folders_teacher_select_shared_approved"
on public.module_folders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

create policy "module_folders_teacher_insert_approved"
on public.module_folders
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

create policy "module_folders_teacher_update_own"
on public.module_folders
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "module_folders_admin_select_all"
on public.module_folders
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "module_folders_admin_delete_all"
on public.module_folders
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

-- 4) storage.objects RLS for teacher-modules bucket:
--    teachers can read shared library objects, students keep read-only,
--    deletion restricted to admins.

drop policy if exists "teacher_modules_select_own_objects" on storage.objects;
create policy "teacher_modules_select_shared_approved_teachers"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'teacher-modules'
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.modules module_row
    join public.profiles owner_profile
      on owner_profile.id = module_row.teacher_id
    where module_row.storage_path = storage.objects.name
      and owner_profile.role = 'teacher'
      and owner_profile.approval_status = 'approved'
  )
);

drop policy if exists "teacher_modules_delete_own_objects" on storage.objects;
create policy "teacher_modules_delete_admin_only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'teacher-modules'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "module_folders_student_select_approved" on public.module_folders;

create policy "module_folders_student_select_approved"
on public.module_folders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);