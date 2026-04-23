create or replace function public.get_teacher_attendance_classes()
returns table (
  template_id uuid,
  template_title text,
  template_description text,
  template_timezone text,
  schedule_summary text,
  enrolled_student_names text[],
  active_student_count integer,
  session_id uuid,
  session_date date,
  start_time_local time,
  end_time_local time,
  status text,
  meeting_room_name text,
  participant_count integer
)
language sql
security definer
set search_path = public
as $$
  with assigned_templates as (
    select
      template.id,
      template.title,
      template.description,
      template.timezone
    from public.group_class_templates template
    join public.profiles requester_profile
      on requester_profile.id = auth.uid()
     and requester_profile.role = 'teacher'
     and requester_profile.approval_status = 'approved'
    where template.teacher_id = auth.uid()
      and template.is_active = true
  ),
  enrollment_details as (
    select
      enrollment.template_id,
      coalesce(
        array_agg(
          coalesce(nullif(btrim(student_profile.full_name), ''), student_profile.email, enrollment.student_id::text)
          order by coalesce(nullif(btrim(student_profile.full_name), ''), student_profile.email, enrollment.student_id::text)
        ) filter (where enrollment.is_active = true),
        array[]::text[]
      ) as enrolled_student_names,
      (count(enrollment.id) filter (where enrollment.is_active = true))::integer as active_student_count
    from public.group_class_enrollments enrollment
    left join public.profiles student_profile
      on student_profile.id = enrollment.student_id
    join assigned_templates template
      on template.id = enrollment.template_id
    group by enrollment.template_id
  ),
  participant_counts as (
    select
      participant.session_id,
      (count(participant.id) filter (where participant.is_active = true))::integer as participant_count
    from public.group_class_session_participants participant
    group by participant.session_id
  )
  select
    template.id as template_id,
    template.title as template_title,
    template.description as template_description,
    template.timezone as template_timezone,
    public.format_group_class_schedule_summary(template.id) as schedule_summary,
    coalesce(enrollment.enrolled_student_names, array[]::text[]) as enrolled_student_names,
    coalesce(enrollment.active_student_count, 0)::integer as active_student_count,
    session_row.id as session_id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status,
    session_row.meeting_room_name,
    coalesce(participant_counts.participant_count, 0)::integer as participant_count
  from assigned_templates template
  left join enrollment_details enrollment
    on enrollment.template_id = template.id
  left join public.group_class_sessions session_row
    on session_row.template_id = template.id
   and session_row.is_active = true
   and session_row.status = 'scheduled'
  left join participant_counts
    on participant_counts.session_id = session_row.id
  order by
    session_row.session_date asc nulls last,
    session_row.start_time_local asc nulls last,
    template.title asc;
$$;

revoke all on function public.get_teacher_attendance_classes() from public;
revoke all on function public.get_teacher_attendance_classes() from anon;
grant execute on function public.get_teacher_attendance_classes() to authenticated;

notify pgrst, 'reload schema';
