-- Kora Thryve teacher modules
-- Secure module metadata + PDF storage access.

create table public.modules (
  id uuid primary key,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  file_name text not null,
  file_type text not null default 'application/pdf',
  file_size bigint not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_module_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_modules_updated
before update on public.modules
for each row
execute function public.set_module_updated_at();

alter table public.modules enable row level security;

create policy "modules_teacher_select_own"
on public.modules
for select
to authenticated
using (teacher_id = auth.uid());

create policy "modules_teacher_insert_own_approved"
on public.modules
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and approval_status = 'approved'
  )
);

create policy "modules_teacher_update_own"
on public.modules
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "modules_teacher_delete_own"
on public.modules
for delete
to authenticated
using (teacher_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-modules',
  'teacher-modules',
  false,
  15728640,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "teacher_modules_select_own_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'teacher-modules'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and approval_status = 'approved'
  )
);

create policy "teacher_modules_insert_own_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'teacher-modules'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and approval_status = 'approved'
  )
);

create policy "teacher_modules_update_own_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'teacher-modules'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'teacher-modules'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "teacher_modules_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'teacher-modules'
  and split_part(name, '/', 1) = auth.uid()::text
);
