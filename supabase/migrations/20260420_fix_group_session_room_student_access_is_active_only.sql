create or replace function public.get_group_session_room_access(target_session_id uuid)
returns table (
  session_id uuid,
  template_id uuid,
  teacher_id uuid,
  session_date date,
  start_time_local time,
  end_time_local time,
  status text,
  meeting_room_name text,
  is_active boolean,
  template_title text,
  template_description text,
  access_role text
)
language sql
security definer
set search_path = public
as $$
  select
    session_row.id as session_id,
    session_row.template_id,
    template.teacher_id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status,
    session_row.meeting_room_name,
    session_row.is_active,
    template.title as template_title,
    template.description as template_description,
    case
      when exists (
        select 1
        from public.profiles requester_profile
        where requester_profile.id = auth.uid()
          and requester_profile.role = 'teacher'
          and requester_profile.approval_status = 'approved'
          and template.teacher_id = auth.uid()
      ) then 'teacher'
      when exists (
        select 1
        from public.profiles requester_profile
        where requester_profile.id = auth.uid()
          and requester_profile.role = 'student'
          and requester_profile.approval_status = 'approved'
      )
      and exists (
        select 1
        from public.group_class_enrollments enrollment
        where enrollment.template_id = session_row.template_id
          and enrollment.student_id = auth.uid()
          and enrollment.is_active = true
      ) then 'student'
      else null
    end as access_role
  from public.group_class_sessions session_row
  join public.group_class_templates template
    on template.id = session_row.template_id
   and template.is_active = true
  where session_row.id = target_session_id
    and session_row.is_active = true
    and (
      exists (
        select 1
        from public.profiles requester_profile
        where requester_profile.id = auth.uid()
          and requester_profile.role = 'teacher'
          and requester_profile.approval_status = 'approved'
          and template.teacher_id = auth.uid()
      )
      or (
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
          where enrollment.template_id = session_row.template_id
            and enrollment.student_id = auth.uid()
            and enrollment.is_active = true
        )
      )
    );
$$;

revoke all on function public.get_group_session_room_access(uuid) from public;
revoke all on function public.get_group_session_room_access(uuid) from anon;
grant execute on function public.get_group_session_room_access(uuid) to authenticated;
