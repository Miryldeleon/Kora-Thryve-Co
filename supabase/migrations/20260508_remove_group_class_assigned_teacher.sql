-- Remove assigned-teacher ownership from group classes.
-- Classes stay admin-managed; approved teachers can access all active group classes.

alter table public.group_class_templates
alter column teacher_id drop not null;

alter table public.group_class_sessions
alter column teacher_id drop not null;

drop policy if exists "group_class_templates_teacher_select_all_approved" on public.group_class_templates;
create policy "group_class_templates_teacher_select_all_approved"
on public.group_class_templates
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_recurrence_rules_teacher_select_all_approved" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_teacher_select_all_approved"
on public.group_class_recurrence_rules
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_recurrence_rules.template_id
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_enrollments_teacher_select_all_approved" on public.group_class_enrollments;
create policy "group_class_enrollments_teacher_select_all_approved"
on public.group_class_enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_enrollments.template_id
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_sessions_teacher_select_all_approved" on public.group_class_sessions;
create policy "group_class_sessions_teacher_select_all_approved"
on public.group_class_sessions
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_sessions.template_id
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_participants_teacher_select_all_approved" on public.group_class_session_participants;
create policy "group_class_session_participants_teacher_select_all_approved"
on public.group_class_session_participants
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_participants.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_attendance_select_all_approved_teachers" on public.group_class_session_attendance;
create policy "group_class_session_attendance_select_all_approved_teachers"
on public.group_class_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_attendance.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_attendance_insert_all_approved_teachers" on public.group_class_session_attendance;
create policy "group_class_session_attendance_insert_all_approved_teachers"
on public.group_class_session_attendance
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_attendance.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_attendance_update_all_approved_teachers" on public.group_class_session_attendance;
create policy "group_class_session_attendance_update_all_approved_teachers"
on public.group_class_session_attendance
for update
to authenticated
using (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_attendance.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
)
with check (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_attendance.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_notes_select_participants" on public.group_class_session_notes;
create policy "group_class_session_notes_select_participants"
on public.group_class_session_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.get_group_session_room_access(group_class_session_notes.session_id) access_row
    where access_row.access_role in ('teacher', 'student')
  )
);

drop policy if exists "group_class_session_notes_insert_teacher" on public.group_class_session_notes;
create policy "group_class_session_notes_insert_teacher"
on public.group_class_session_notes
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.get_group_session_room_access(group_class_session_notes.session_id) access_row
    where access_row.access_role = 'teacher'
      and access_row.status = 'scheduled'
  )
);

drop policy if exists "group_class_session_notes_update_teacher" on public.group_class_session_notes;
create policy "group_class_session_notes_update_teacher"
on public.group_class_session_notes
for update
to authenticated
using (
  exists (
    select 1
    from public.get_group_session_room_access(group_class_session_notes.session_id) access_row
    where access_row.access_role = 'teacher'
      and access_row.status = 'scheduled'
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.get_group_session_room_access(group_class_session_notes.session_id) access_row
    where access_row.access_role = 'teacher'
      and access_row.status = 'scheduled'
  )
);

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
  with teacher_access as (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  ),
  accessible_templates as (
    select
      template.id,
      template.title,
      template.description,
      template.timezone
    from public.group_class_templates template
    where template.is_active = true
      and exists (select 1 from teacher_access)
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
    join accessible_templates template
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
  from accessible_templates template
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

create or replace function public.get_teacher_group_class_details(target_template_id uuid)
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
  with authorized_template as (
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
    where template.id = target_template_id
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
    join authorized_template template
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
  from authorized_template template
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
    session_row.start_time_local asc nulls last;
$$;

revoke all on function public.get_teacher_group_class_details(uuid) from public;
revoke all on function public.get_teacher_group_class_details(uuid) from anon;
grant execute on function public.get_teacher_group_class_details(uuid) to authenticated;

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
  select *
  from public.get_teacher_classes_page_group_sessions();
$$;

revoke all on function public.get_teacher_attendance_classes() from public;
revoke all on function public.get_teacher_attendance_classes() from anon;
grant execute on function public.get_teacher_attendance_classes() to authenticated;

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
      auth.uid() as teacher_id,
      coalesce(nullif(btrim(requester_profile.full_name), ''), requester_profile.email, auth.uid()::text) as teacher_name
    from public.group_class_templates template
    join public.profiles requester_profile
      on requester_profile.id = auth.uid()
     and requester_profile.role = 'teacher'
     and requester_profile.approval_status = 'approved'
    where template.id = target_template_id
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
