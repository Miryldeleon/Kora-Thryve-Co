-- Enforce valid booking status transitions at the database layer.
-- Allowed transitions:
-- confirmed -> completed
-- confirmed -> cancelled
-- unchanged status

create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status = 'confirmed' and new.status in ('completed', 'cancelled') then
    return new;
  end if;

  raise exception 'Invalid booking status transition from % to %', old.status, new.status;
end;
$$;

drop trigger if exists on_booking_status_transition_guard on public.bookings;

create trigger on_booking_status_transition_guard
before update of status on public.bookings
for each row
execute function public.enforce_booking_status_transition();
