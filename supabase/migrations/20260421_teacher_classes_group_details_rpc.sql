drop function if exists public.get_teacher_classes_page_group_sessions();

create or replace function public.format_group_class_schedule_summary(target_template_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with grouped_rules as (
    select
      rule.weekday,
      rule.start_time_local,
      rule.end_time_local,
      array_agg(distinct rule.week_of_month order by rule.week_of_month) as weeks
    from public.group_class_recurrence_rules rule
    where rule.template_id = target_template_id
      and rule.is_active = true
    group by
      rule.weekday,
      rule.start_time_local,
      rule.end_time_local
  ),
  week_labels as (
    select
      grouped_rules.weekday,
      grouped_rules.start_time_local,
      grouped_rules.end_time_local,
      array_agg(
        case week_value
          when 1 then '1st'
          when 2 then '2nd'
          when 3 then '3rd'
          when 4 then '4th'
          when 5 then '5th'
          else week_value::text
        end
        order by week_ordinality
      ) as labels
    from grouped_rules
    cross join unnest(grouped_rules.weeks) with ordinality as week_item(week_value, week_ordinality)
    group by
      grouped_rules.weekday,
      grouped_rules.start_time_local,
      grouped_rules.end_time_local
  ),
  schedule_lines as (
    select
      week_labels.weekday,
      week_labels.start_time_local,
      concat(
        'Every ',
        case
          when cardinality(week_labels.labels) = 5 then ''
          when cardinality(week_labels.labels) = 1 then week_labels.labels[1] || ' '
          when cardinality(week_labels.labels) = 2 then week_labels.labels[1] || ' and ' || week_labels.labels[2] || ' '
          else array_to_string(week_labels.labels[1:cardinality(week_labels.labels) - 1], ', ') || ', and ' || week_labels.labels[cardinality(week_labels.labels)] || ' '
        end,
        case week_labels.weekday
          when 0 then 'Sunday'
          when 1 then 'Monday'
          when 2 then 'Tuesday'
          when 3 then 'Wednesday'
          when 4 then 'Thursday'
          when 5 then 'Friday'
          when 6 then 'Saturday'
          else 'Unknown day'
        end,
        ', ',
        to_char(week_labels.start_time_local, 'FMHH12:MI AM'),
        ' - ',
        to_char(week_labels.end_time_local, 'FMHH12:MI AM')
      ) as line
    from week_labels
  )
  select coalesce(
    string_agg(schedule_lines.line, ' | ' order by schedule_lines.weekday, schedule_lines.start_time_local),
    'No schedule yet'
  )
  from schedule_lines;
$$;

revoke all on function public.format_group_class_schedule_summary(uuid) from public;
revoke all on function public.format_group_class_schedule_summary(uuid) from anon;
revoke all on function public.format_group_class_schedule_summary(uuid) from authenticated;

create or replace function public.get_teacher_classes_page_group_sessions()
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
  schedule_details as (
    select
      template.id as template_id,
      public.format_group_class_schedule_summary(template.id) as schedule_summary
    from assigned_templates template
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
    coalesce(schedule.schedule_summary, 'No schedule yet') as schedule_summary,
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
  left join schedule_details schedule
    on schedule.template_id = template.id
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

revoke all on function public.get_teacher_classes_page_group_sessions() from public;
revoke all on function public.get_teacher_classes_page_group_sessions() from anon;
grant execute on function public.get_teacher_classes_page_group_sessions() to authenticated;
