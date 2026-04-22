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
  joined_at_value timestamptz := now();
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
    joined_at_value
  )
  on conflict (session_id, user_id)
  do update set
    role = excluded.role,
    joined_at = excluded.joined_at;

  return query select access_row.access_role::text, joined_at_value;
end;
$$;

create or replace function public.get_group_session_teacher_presence(target_session_id uuid)
returns table (
  teacher_has_joined boolean,
  teacher_joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row record;
  joined_at_value timestamptz;
begin
  select *
  into access_row
  from public.get_group_session_room_access(target_session_id)
  limit 1;

  if not found or access_row.access_role not in ('teacher', 'student') then
    raise exception 'Group session not found or unauthorized' using errcode = '42501';
  end if;

  select max(attendance.joined_at)
  into joined_at_value
  from public.group_class_session_attendance attendance
  where attendance.session_id = target_session_id
    and attendance.role = 'teacher';

  return query select joined_at_value is not null, joined_at_value;
end;
$$;

create or replace function public.get_group_session_attendance_snapshot(target_session_id uuid)
returns table (
  session_id uuid,
  user_id uuid,
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

  return query
  select
    attendance.session_id,
    attendance.user_id,
    attendance.role,
    attendance.joined_at
  from public.group_class_session_attendance attendance
  where attendance.session_id = target_session_id
  order by
    case when attendance.role = 'teacher' then 0 else 1 end,
    attendance.joined_at desc;
end;
$$;

revoke all on function public.record_group_session_attendance(uuid) from public;
revoke all on function public.record_group_session_attendance(uuid) from anon;
grant execute on function public.record_group_session_attendance(uuid) to authenticated;

revoke all on function public.get_group_session_teacher_presence(uuid) from public;
revoke all on function public.get_group_session_teacher_presence(uuid) from anon;
grant execute on function public.get_group_session_teacher_presence(uuid) to authenticated;

revoke all on function public.get_group_session_attendance_snapshot(uuid) from public;
revoke all on function public.get_group_session_attendance_snapshot(uuid) from anon;
grant execute on function public.get_group_session_attendance_snapshot(uuid) to authenticated;
