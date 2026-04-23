create or replace function public.record_group_session_attendance(target_session_id uuid)
returns table (
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row record;
begin
  select *
  into access_row
  from public.get_group_session_room_access(target_session_id)
  limit 1;

  if not found or access_row.access_role not in ('teacher', 'student') then
    raise exception 'Group session not found or unauthorized' using errcode = '42501';
  end if;

  if access_row.status = 'cancelled' then
    raise exception 'This group session was cancelled. Live access is unavailable.' using errcode = '22000';
  end if;

  if access_row.status = 'completed' then
    raise exception 'This group session has already been completed.' using errcode = '22000';
  end if;

  insert into public.group_class_session_attendance (
    session_id,
    user_id,
    role,
    joined_at
  )
  values (
    target_session_id,
    auth.uid(),
    access_row.access_role,
    now()
  )
  on conflict (session_id, user_id) do nothing;

  return query
  select
    attendance.role,
    attendance.joined_at
  from public.group_class_session_attendance attendance
  where attendance.session_id = target_session_id
    and attendance.user_id = auth.uid()
  limit 1;
end;
$$;

create or replace function public.get_teacher_group_class_attendance_sheet(target_template_id uuid)
returns table (
  template_id uuid,
  template_title text,
  template_description text,
  template_timezone text,
  teacher_id uuid,
  teacher_name text,
  schedule_summary text,
  session_id uuid,
  session_date date,
  start_time_local time,
  end_time_local time,
  session_status text,
  scheduled_start_at timestamptz,
  participant_user_id uuid,
  participant_role text,
  participant_name text,
  first_joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with authorized_template as (
    select
      template.id,
      template.title,
      template.description,
      template.timezone,
      template.teacher_id,
      coalesce(nullif(btrim(teacher_profile.full_name), ''), teacher_profile.email, template.teacher_id::text) as teacher_name
    from public.group_class_templates template
    join public.profiles requester_profile
      on requester_profile.id = auth.uid()
     and requester_profile.role = 'teacher'
     and requester_profile.approval_status = 'approved'
    left join public.profiles teacher_profile
      on teacher_profile.id = template.teacher_id
    where template.id = target_template_id
      and template.teacher_id = auth.uid()
      and template.is_active = true
  ),
  class_sessions as (
    select
      session_row.id,
      session_row.template_id,
      session_row.session_date,
      session_row.start_time_local,
      session_row.end_time_local,
      session_row.status,
      (
        (session_row.session_date::text || ' ' || session_row.start_time_local::text)::timestamp
        at time zone template.timezone
      ) as scheduled_start_at
    from public.group_class_sessions session_row
    join authorized_template template
      on template.id = session_row.template_id
    where session_row.is_active = true
    order by session_row.session_date asc, session_row.start_time_local asc
  ),
  class_participants as (
    select
      template.teacher_id as user_id,
      'teacher'::text as role,
      template.teacher_name as participant_name
    from authorized_template template

    union all

    select
      enrollment.student_id as user_id,
      'student'::text as role,
      coalesce(nullif(btrim(student_profile.full_name), ''), student_profile.email, enrollment.student_id::text) as participant_name
    from public.group_class_enrollments enrollment
    join authorized_template template
      on template.id = enrollment.template_id
    left join public.profiles student_profile
      on student_profile.id = enrollment.student_id
    where enrollment.is_active = true
      and enrollment.status = 'active'
  )
  select
    template.id as template_id,
    template.title as template_title,
    template.description as template_description,
    template.timezone as template_timezone,
    template.teacher_id,
    template.teacher_name,
    public.format_group_class_schedule_summary(template.id) as schedule_summary,
    session_row.id as session_id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status as session_status,
    session_row.scheduled_start_at,
    participant.user_id as participant_user_id,
    participant.role as participant_role,
    participant.participant_name,
    attendance.joined_at as first_joined_at
  from authorized_template template
  join class_sessions session_row
    on session_row.template_id = template.id
  join class_participants participant
    on true
  left join public.group_class_session_attendance attendance
    on attendance.session_id = session_row.id
   and attendance.user_id = participant.user_id
  order by
    case when participant.role = 'teacher' then 0 else 1 end,
    participant.participant_name asc,
    session_row.session_date asc,
    session_row.start_time_local asc;
$$;

revoke all on function public.get_teacher_group_class_attendance_sheet(uuid) from public;
revoke all on function public.get_teacher_group_class_attendance_sheet(uuid) from anon;
grant execute on function public.get_teacher_group_class_attendance_sheet(uuid) to authenticated;

notify pgrst, 'reload schema';
