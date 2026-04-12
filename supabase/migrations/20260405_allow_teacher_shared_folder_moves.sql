-- Allow approved teachers to reassign modules across shared folders
-- while keeping metadata edits owner-scoped in app code.

create or replace function public.move_module_to_folder(
  p_module_id uuid,
  p_folder_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_is_approved_teacher boolean;
  folder_exists boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and approval_status = 'approved'
  )
  into requester_is_approved_teacher;

  if not requester_is_approved_teacher then
    raise exception 'Only approved teachers can move modules between folders.';
  end if;

  if p_folder_id is not null then
    select exists (
      select 1
      from public.module_folders
      where id = p_folder_id
    ) into folder_exists;

    if not folder_exists then
      raise exception 'Target folder not found.';
    end if;
  end if;

  update public.modules
  set folder_id = p_folder_id
  where id = p_module_id;

  if not found then
    raise exception 'Module not found.';
  end if;
end;
$$;

grant execute on function public.move_module_to_folder(uuid, uuid) to authenticated;
