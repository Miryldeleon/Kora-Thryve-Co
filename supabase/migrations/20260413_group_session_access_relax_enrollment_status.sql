-- Align student group-session access to enrollment.is_active as source of truth.
-- Some environments may have status drift while is_active remains authoritative.

drop policy if exists "group_class_sessions_student_select_assigned" on public.group_class_sessions;
create policy "group_class_sessions_student_select_assigned"
on public.group_class_sessions
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.group_class_enrollments enrollment
    where enrollment.template_id = group_class_sessions.template_id
      and enrollment.student_id = auth.uid()
      and enrollment.is_active = true
  )
);

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
      )
    )
  )
);
