create or replace function public.get_teacher_classes_page_group_sessions()
returns table (
  template_id uuid,
  template_title text,
  session_id uuid,
  session_date date,
  start_time_local time,
  end_time_local time,
  status text,
  participant_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    template.id as template_id,
    template.title as template_title,
    session_row.id as session_id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status,
    coalesce(count(participant.id) filter (where participant.is_active = true), 0)::integer as participant_count
  from public.group_class_templates template
  join public.profiles requester_profile
    on requester_profile.id = auth.uid()
   and requester_profile.role = 'teacher'
   and requester_profile.approval_status = 'approved'
  left join public.group_class_sessions session_row
    on session_row.template_id = template.id
   and session_row.is_active = true
   and session_row.status = 'scheduled'
  left join public.group_class_session_participants participant
    on participant.session_id = session_row.id
   and participant.is_active = true
  where template.teacher_id = auth.uid()
    and template.is_active = true
  group by
    template.id,
    template.title,
    session_row.id,
    session_row.session_date,
    session_row.start_time_local,
    session_row.end_time_local,
    session_row.status
  order by
    session_row.session_date asc nulls last,
    session_row.start_time_local asc nulls last,
    template.title asc;
$$;

revoke all on function public.get_teacher_classes_page_group_sessions() from public;
revoke all on function public.get_teacher_classes_page_group_sessions() from anon;
grant execute on function public.get_teacher_classes_page_group_sessions() to authenticated;
