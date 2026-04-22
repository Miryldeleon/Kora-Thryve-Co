-- Break the template/enrollment RLS recursion introduced by checking enrollments
-- directly inside the group_class_templates student select policy.

create or replace function public.can_student_read_group_class_template(target_template_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
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
      where enrollment.template_id = target_template_id
        and enrollment.student_id = auth.uid()
        and enrollment.is_active = true
    );
$$;

revoke all on function public.can_student_read_group_class_template(uuid) from public;
revoke all on function public.can_student_read_group_class_template(uuid) from anon;
grant execute on function public.can_student_read_group_class_template(uuid) to authenticated;

drop policy if exists "group_class_templates_student_select_enrolled" on public.group_class_templates;
create policy "group_class_templates_student_select_enrolled"
on public.group_class_templates
for select
to authenticated
using (
  public.can_student_read_group_class_template(group_class_templates.id)
);
