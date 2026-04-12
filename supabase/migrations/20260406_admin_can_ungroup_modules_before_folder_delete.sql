-- Allow admins to update modules (needed to set folder_id = null during admin folder deletion).

drop policy if exists "modules_admin_update_all" on public.modules;
create policy "modules_admin_update_all"
on public.modules
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);
