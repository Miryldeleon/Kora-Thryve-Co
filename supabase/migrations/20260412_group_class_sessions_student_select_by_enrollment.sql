-- Ensure students can read scheduled group sessions for templates they are actively enrolled in.
-- This avoids visibility gaps when participant snapshots are missing or delayed.

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
      and enrollment.status = 'active'
  )
);
