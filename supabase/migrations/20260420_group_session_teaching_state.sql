create table if not exists public.group_class_session_teaching_state (
  session_id uuid primary key references public.group_class_sessions (id) on delete cascade,
  lesson jsonb not null default '{
    "surface": "materials",
    "moduleId": null,
    "page": 1,
    "zoom": 100,
    "scrollTopRatio": 0,
    "scrollLeftRatio": 0
  }'::jsonb,
  whiteboard_snapshot text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists on_group_class_session_teaching_state_updated on public.group_class_session_teaching_state;
create trigger on_group_class_session_teaching_state_updated
before update on public.group_class_session_teaching_state
for each row
execute function public.set_group_tables_updated_at();

alter table public.group_class_session_teaching_state enable row level security;

drop policy if exists "group_class_session_teaching_state_select_participants" on public.group_class_session_teaching_state;
create policy "group_class_session_teaching_state_select_participants"
on public.group_class_session_teaching_state
for select
to authenticated
using (
  exists (
    select 1
    from public.get_group_session_room_access(group_class_session_teaching_state.session_id)
  )
);

create or replace function public.get_group_session_teaching_state(target_session_id uuid)
returns table (
  lesson jsonb,
  whiteboard_snapshot text
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
    state_row.whiteboard_snapshot
  from public.group_class_session_teaching_state state_row
  where state_row.session_id = target_session_id;
end;
$$;

create or replace function public.save_group_session_teaching_state(
  target_session_id uuid,
  next_lesson jsonb,
  next_whiteboard_snapshot text
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
    updated_by
  )
  values (
    target_session_id,
    next_lesson,
    next_whiteboard_snapshot,
    auth.uid()
  )
  on conflict (session_id)
  do update set
    lesson = excluded.lesson,
    whiteboard_snapshot = excluded.whiteboard_snapshot,
    updated_by = excluded.updated_by;
end;
$$;

revoke all on function public.get_group_session_teaching_state(uuid) from public;
revoke all on function public.get_group_session_teaching_state(uuid) from anon;
grant execute on function public.get_group_session_teaching_state(uuid) to authenticated;

revoke all on function public.save_group_session_teaching_state(uuid, jsonb, text) from public;
revoke all on function public.save_group_session_teaching_state(uuid, jsonb, text) from anon;
grant execute on function public.save_group_session_teaching_state(uuid, jsonb, text) to authenticated;
