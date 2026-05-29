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

revoke all on function public.save_group_session_notes(uuid, text) from public;
revoke all on function public.save_group_session_notes(uuid, text) from anon;
grant execute on function public.save_group_session_notes(uuid, text) to authenticated;
