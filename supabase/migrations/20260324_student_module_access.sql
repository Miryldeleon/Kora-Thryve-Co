-- Student module access + teacher display metadata.

alter table public.modules
add column if not exists teacher_name text;

create policy "modules_student_select_approved"
on public.modules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles student_profile
    where student_profile.id = auth.uid()
      and student_profile.role = 'student'
      and student_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.profiles teacher_profile
    where teacher_profile.id = teacher_id
      and teacher_profile.role = 'teacher'
      and teacher_profile.approval_status = 'approved'
  )
);

create policy "teacher_modules_select_approved_students"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'teacher-modules'
  and exists (
    select 1
    from public.profiles student_profile
    where student_profile.id = auth.uid()
      and student_profile.role = 'student'
      and student_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.modules module_row
    join public.profiles teacher_profile
      on teacher_profile.id = module_row.teacher_id
    where module_row.storage_path = storage.objects.name
      and teacher_profile.role = 'teacher'
      and teacher_profile.approval_status = 'approved'
  )
);
