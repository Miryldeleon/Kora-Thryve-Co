alter table public.group_class_session_teaching_state
add column if not exists annotations jsonb not null default '{}'::jsonb;

drop function if exists public.get_group_session_teaching_state(uuid);

create or replace function public.get_group_session_teaching_state(target_session_id uuid)
returns table (
  lesson jsonb,
  whiteboard_snapshot text,
  annotations jsonb
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
    state_row.lesson,
    state_row.whiteboard_snapshot,
    state_row.annotations
  from public.group_class_session_teaching_state state_row
  where state_row.session_id = target_session_id;
end;
$$;

create or replace function public.save_group_session_teaching_state(
  target_session_id uuid,
  next_lesson jsonb,
  next_whiteboard_snapshot text,
  next_annotations jsonb
)
returns void
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

  if not found or access_row.access_role <> 'teacher' then
    raise exception 'Only the teacher can control teaching tools' using errcode = '42501';
  end if;

  if access_row.status <> 'scheduled' then
    raise exception 'Teaching tools can only be controlled for scheduled group sessions' using errcode = '22000';
  end if;

  insert into public.group_class_session_teaching_state (
    session_id,
    lesson,
    whiteboard_snapshot,
    annotations,
    updated_by
  )
  values (
    target_session_id,
    next_lesson,
    next_whiteboard_snapshot,
    next_annotations,
    auth.uid()
  )
  on conflict (session_id)
  do update set
    lesson = excluded.lesson,
    whiteboard_snapshot = excluded.whiteboard_snapshot,
    annotations = excluded.annotations,
    updated_by = excluded.updated_by;
end;
$$;

revoke all on function public.get_group_session_teaching_state(uuid) from public;
revoke all on function public.get_group_session_teaching_state(uuid) from anon;
grant execute on function public.get_group_session_teaching_state(uuid) to authenticated;

revoke all on function public.save_group_session_teaching_state(uuid, jsonb, text, jsonb) from public;
revoke all on function public.save_group_session_teaching_state(uuid, jsonb, text, jsonb) from anon;
grant execute on function public.save_group_session_teaching_state(uuid, jsonb, text, jsonb) to authenticated;
