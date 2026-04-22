drop policy if exists "group_class_session_attendance_select_participants" on public.group_class_session_attendance;
create policy "group_class_session_attendance_select_participants"
on public.group_class_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    where session_row.id = group_class_session_attendance.session_id
      and template.teacher_id = auth.uid()
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
        join public.group_class_templates template on template.id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and template.teacher_id = auth.uid()
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
        join public.group_class_templates template on template.id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and template.teacher_id = auth.uid()
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
        join public.group_class_templates template on template.id = session_row.template_id
        where session_row.id = group_class_session_attendance.session_id
          and session_row.is_active = true
          and template.teacher_id = auth.uid()
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
