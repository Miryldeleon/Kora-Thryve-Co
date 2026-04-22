create table if not exists public.group_class_session_notes (
  session_id uuid primary key references public.group_class_sessions (id) on delete cascade,
  notes text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists on_group_class_session_notes_updated on public.group_class_session_notes;
create trigger on_group_class_session_notes_updated
before update on public.group_class_session_notes
for each row
execute function public.set_group_tables_updated_at();

alter table public.group_class_session_notes enable row level security;

drop policy if exists "group_class_session_notes_select_participants" on public.group_class_session_notes;
create policy "group_class_session_notes_select_participants"
on public.group_class_session_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_notes.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
      and template.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.group_class_enrollments enrollment on enrollment.template_id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_notes.session_id
      and session_row.is_active = true
      and template.is_active = true
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
      and enrollment.student_id = auth.uid()
      and enrollment.is_active = true
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
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_notes.session_id
      and session_row.is_active = true
      and session_row.status = 'scheduled'
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
      and template.teacher_id = auth.uid()
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
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_notes.session_id
      and session_row.is_active = true
      and session_row.status = 'scheduled'
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
      and template.teacher_id = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_notes.session_id
      and session_row.is_active = true
      and session_row.status = 'scheduled'
      and template.is_active = true
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
      and template.teacher_id = auth.uid()
  )
);

create or replace function public.get_group_session_notes(target_session_id uuid)
returns table (
  notes text
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
  select coalesce(note_row.notes, '') as notes
  from (select 1) seed
  left join public.group_class_session_notes note_row
    on note_row.session_id = target_session_id;
end;
$$;

create or replace function public.save_group_session_notes(
  target_session_id uuid,
  next_notes text
)
returns table (
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row record;
  normalized_notes text := coalesce(next_notes, '');
begin
  if length(normalized_notes) > 20000 then
    raise exception 'Notes are too long' using errcode = '22000';
  end if;

  select *
  into access_row
  from public.get_group_session_room_access(target_session_id)
  limit 1;

  if not found or access_row.access_role <> 'teacher' then
    raise exception 'Only the teacher can edit notes' using errcode = '42501';
  end if;

  if access_row.status <> 'scheduled' then
    raise exception 'Notes can only be edited for scheduled group sessions' using errcode = '22000';
  end if;

  insert into public.group_class_session_notes (
    session_id,
    notes,
    updated_by
  )
  values (
    target_session_id,
    normalized_notes,
    auth.uid()
  )
  on conflict (session_id)
  do update set
    notes = excluded.notes,
    updated_by = excluded.updated_by;

  return query select normalized_notes as notes;
end;
$$;

revoke all on function public.get_group_session_notes(uuid) from public;
revoke all on function public.get_group_session_notes(uuid) from anon;
grant execute on function public.get_group_session_notes(uuid) to authenticated;

revoke all on function public.save_group_session_notes(uuid, text) from public;
revoke all on function public.save_group_session_notes(uuid, text) from anon;
grant execute on function public.save_group_session_notes(uuid, text) to authenticated;
