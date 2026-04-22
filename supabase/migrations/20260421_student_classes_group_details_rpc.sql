create or replace function public.get_student_classes_page_group_sessions()
returns table (
  template_id uuid,
  template_title text,
  template_description text,
  template_timezone text,
  teacher_name text,
  schedule_summary text,
  session_id uuid,
  session_date date,
  start_time_local time,
  end_time_local time,
  status text,
  meeting_room_name text
)
language sql
security definer
set search_path = public
as $$
  with enrolled_templates as (
    select
      template.id,
      template.title,
      template.description,
      template.timezone,
      coalesce(nullif(btrim(teacher_profile.full_name), ''), teacher_profile.email, template.teacher_id::text) as teacher_name
    from public.group_class_templates template
    join public.profiles requester_profile
      on requester_profile.id = auth.uid()
     and requester_profile.role = 'student'
     and requester_profile.approval_status = 'approved'
    join public.group_class_enrollments enrollment
      on enrollment.template_id = template.id
     and enrollment.student_id = auth.uid()
     and enrollment.is_active = true
    left join public.profiles teacher_profile
      on teacher_profile.id = template.teacher_id
    where template.is_active = true
  )
  select
    template.id as template_id,
    template.title as template_title,
    template.description as template_description,
    template.timezone as template_timezone,
    template.teacher_name,
    public.format_group_class_schedule_summary(template.id) as schedule_summary,
    session_row.id as session_id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status,
    session_row.meeting_room_name
  from enrolled_templates template
  left join public.group_class_sessions session_row
    on session_row.template_id = template.id
   and session_row.is_active = true
   and session_row.status = 'scheduled'
  order by
    session_row.session_date asc nulls last,
    session_row.start_time_local asc nulls last,
    template.title asc;
$$;

revoke all on function public.get_student_classes_page_group_sessions() from public;
revoke all on function public.get_student_classes_page_group_sessions() from anon;
grant execute on function public.get_student_classes_page_group_sessions() to authenticated;
