-- Attendance/presence tracking for generated group class sessions.
-- Mirrors booking session_attendance behavior for teacher-presence gating.

create table if not exists public.group_class_session_attendance (
  session_id uuid not null references public.group_class_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists group_class_session_attendance_user_idx
  on public.group_class_session_attendance (user_id, joined_at desc);

drop trigger if exists on_group_class_session_attendance_updated on public.group_class_session_attendance;
create trigger on_group_class_session_attendance_updated
before update on public.group_class_session_attendance
for each row
execute function public.set_group_tables_updated_at();

alter table public.group_class_session_attendance enable row level security;

drop policy if exists "group_class_session_attendance_select_participants" on public.group_class_session_attendance;
create policy "group_class_session_attendance_select_participants"
on public.group_class_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_sessions session_row
    where session_row.id = group_class_session_attendance.session_id
      and session_row.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_enrollments enrollment on enrollment.template_id = session_row.template_id
    where session_row.id = group_class_session_attendance.session_id
      and enrollment.student_id = auth.uid()
      and enrollment.is_active = true
      and enrollment.status = 'active'
      and (
        group_class_session_attendance.user_id = auth.uid()
        or group_class_session_attendance.role = 'teacher'
      )
  )
);

drop policy if exists "group_class_session_attendance_insert_own_participant_row" on public.group_class_session_attendance;
create policy "group_class_session_attendance_insert_own_participant_row"
on public.group_class_session_attendance
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (
      role = 'teacher'
      and exists (
        select 1
        from public.group_class_sessions session_row
        where session_row.id = group_class_session_attendance.session_id
          and session_row.teacher_id = auth.uid()
          and session_row.is_active = true
      )
    )
    or (
      role = 'student'
      and exists (
        select 1
        from public.group_class_sessions session_row
        join public.group_class_enrollments enrollment on enrollment.template_id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and enrollment.student_id = auth.uid()
          and enrollment.is_active = true
          and enrollment.status = 'active'
      )
    )
  )
);

drop policy if exists "group_class_session_attendance_update_own_participant_row" on public.group_class_session_attendance;
create policy "group_class_session_attendance_update_own_participant_row"
on public.group_class_session_attendance
for update
to authenticated
using (
  user_id = auth.uid()
  and (
    (
      role = 'teacher'
      and exists (
        select 1
        from public.group_class_sessions session_row
        where session_row.id = group_class_session_attendance.session_id
          and session_row.teacher_id = auth.uid()
          and session_row.is_active = true
      )
    )
    or (
      role = 'student'
      and exists (
        select 1
        from public.group_class_sessions session_row
        join public.group_class_enrollments enrollment on enrollment.template_id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and enrollment.student_id = auth.uid()
          and enrollment.is_active = true
          and enrollment.status = 'active'
      )
    )
  )
)
with check (
  user_id = auth.uid()
  and (
    (
      role = 'teacher'
      and exists (
        select 1
        from public.group_class_sessions session_row
        where session_row.id = group_class_session_attendance.session_id
          and session_row.teacher_id = auth.uid()
          and session_row.is_active = true
      )
    )
    or (
      role = 'student'
      and exists (
        select 1
        from public.group_class_sessions session_row
        join public.group_class_enrollments enrollment on enrollment.template_id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and enrollment.student_id = auth.uid()
          and enrollment.is_active = true
          and enrollment.status = 'active'
      )
    )
  )
);
