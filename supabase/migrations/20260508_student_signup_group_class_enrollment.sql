-- Student signup class selection and enrollment source tracking.

alter table public.group_class_enrollments
add column if not exists enrollment_source text not null default 'admin_manual'
  check (enrollment_source in ('admin_manual', 'student_signup'));

alter table public.group_class_enrollments
add column if not exists selected_during_signup boolean not null default false;

create index if not exists group_class_enrollments_source_idx
  on public.group_class_enrollments (enrollment_source, selected_during_signup);

drop function if exists public.get_active_group_class_signup_options();

create or replace function public.get_active_group_class_signup_options()
returns table (
  template_id uuid,
  class_title text,
  schedule_summary text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    template.id as template_id,
    template.title as class_title,
    public.format_group_class_schedule_summary(template.id) as schedule_summary
  from public.group_class_templates template
  where template.is_active = true
  order by template.title asc;
$$;

revoke all on function public.get_active_group_class_signup_options() from public;
grant execute on function public.get_active_group_class_signup_options() to anon;
grant execute on function public.get_active_group_class_signup_options() to authenticated;

notify pgrst, 'reload schema';
