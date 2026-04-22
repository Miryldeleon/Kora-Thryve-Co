-- Keep student template reads aligned with the current enrollment access model.
-- Recurring group session access uses enrollment.is_active as the source of truth
-- because some environments can have status drift on otherwise active rows.

drop policy if exists "group_class_templates_student_select_enrolled" on public.group_class_templates;
create policy "group_class_templates_student_select_enrolled"
on public.group_class_templates
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
  and exists (
    select 1
    from public.group_class_enrollments enrollment
    where enrollment.template_id = group_class_templates.id
      and enrollment.student_id = auth.uid()
      and enrollment.is_active = true
  )
);
