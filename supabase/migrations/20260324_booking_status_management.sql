-- Booking/session status management
-- Allows teacher-side status updates and safe slot reopening on cancellation.

alter table public.bookings
drop constraint if exists bookings_slot_id_key;

create unique index if not exists bookings_one_confirmed_per_slot_idx
on public.bookings (slot_id)
where status = 'confirmed';

create policy "bookings_teacher_update_own_status"
on public.bookings
for update
to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and status in ('confirmed', 'completed', 'cancelled')
);

create or replace function public.sync_slot_after_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    update public.teacher_availability_slots
    set is_booked = false
    where id = new.slot_id;
  end if;

  if old.status = 'cancelled' and new.status = 'confirmed' then
    update public.teacher_availability_slots
    set is_booked = true
    where id = new.slot_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_booking_status_changed_sync_slot on public.bookings;

create trigger on_booking_status_changed_sync_slot
after update of status on public.bookings
for each row
execute function public.sync_slot_after_booking_status_change();
