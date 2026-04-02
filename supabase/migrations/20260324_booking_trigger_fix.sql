-- Fix booking -> slot sync without service-role key in app code.
-- Make trigger function run with definer privileges so RLS on
-- teacher_availability_slots does not block the update.

create or replace function public.mark_slot_booked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teacher_availability_slots
  set is_booked = true
  where id = new.slot_id;

  return new;
end;
$$;

drop trigger if exists on_booking_created_mark_slot_booked on public.bookings;

create trigger on_booking_created_mark_slot_booked
after insert on public.bookings
for each row
execute function public.mark_slot_booked();
