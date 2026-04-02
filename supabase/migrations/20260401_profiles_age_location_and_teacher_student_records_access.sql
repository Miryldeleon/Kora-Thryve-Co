-- Extend profiles with optional personal details for portal profile pages.
-- Also allow approved teachers to read profile rows for students they have bookings with.

alter table public.profiles
add column if not exists age integer check (age is null or (age >= 1 and age <= 120)),
add column if not exists location text;

drop policy if exists "profiles_teacher_select_booked_students" on public.profiles;

create policy "profiles_teacher_select_booked_students"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles teacher_profile
    where teacher_profile.id = auth.uid()
      and teacher_profile.role = 'teacher'
      and teacher_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.bookings booking_row
    where booking_row.teacher_id = auth.uid()
      and booking_row.student_id = public.profiles.id
  )
);
