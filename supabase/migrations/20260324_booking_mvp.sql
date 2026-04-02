-- Kora Thryve booking MVP
-- Teacher availability slots + student bookings.

create type public.booking_status as enum ('confirmed', 'cancelled', 'completed');

create table public.teacher_availability_slots (
  id uuid primary key,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  teacher_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint teacher_slot_time_check check (ends_at > starts_at),
  constraint teacher_slot_unique unique (teacher_id, starts_at, ends_at)
);

create table public.bookings (
  id uuid primary key,
  slot_id uuid not null unique references public.teacher_availability_slots (id),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  teacher_name text,
  student_id uuid not null references auth.users (id) on delete cascade,
  student_name text,
  student_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint booking_time_check check (ends_at > starts_at)
);

create or replace function public.mark_slot_booked()
returns trigger
language plpgsql
as $$
begin
  update public.teacher_availability_slots
  set is_booked = true
  where id = new.slot_id;

  return new;
end;
$$;

create trigger on_booking_created_mark_slot_booked
after insert on public.bookings
for each row
execute function public.mark_slot_booked();

alter table public.teacher_availability_slots enable row level security;
alter table public.bookings enable row level security;

create policy "availability_teacher_select_own"
on public.teacher_availability_slots
for select
to authenticated
using (teacher_id = auth.uid());

create policy "availability_teacher_insert_own_approved"
on public.teacher_availability_slots
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and approval_status = 'approved'
  )
);

create policy "availability_teacher_delete_own_unbooked"
on public.teacher_availability_slots
for delete
to authenticated
using (
  teacher_id = auth.uid()
  and is_booked = false
);

create policy "availability_student_select_open_slots"
on public.teacher_availability_slots
for select
to authenticated
using (
  is_booked = false
  and exists (
    select 1
    from public.profiles student_profile
    where student_profile.id = auth.uid()
      and student_profile.role = 'student'
      and student_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.profiles teacher_profile
    where teacher_profile.id = teacher_id
      and teacher_profile.role = 'teacher'
      and teacher_profile.approval_status = 'approved'
  )
);

create policy "bookings_teacher_select_own"
on public.bookings
for select
to authenticated
using (teacher_id = auth.uid());

create policy "bookings_student_select_own"
on public.bookings
for select
to authenticated
using (student_id = auth.uid());

create policy "bookings_student_insert_own_approved"
on public.bookings
for insert
to authenticated
with check (
  student_id = auth.uid()
  and status = 'confirmed'
  and exists (
    select 1
    from public.profiles student_profile
    where student_profile.id = auth.uid()
      and student_profile.role = 'student'
      and student_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.teacher_availability_slots slot_row
    join public.profiles teacher_profile
      on teacher_profile.id = slot_row.teacher_id
    where slot_row.id = slot_id
      and slot_row.teacher_id = teacher_id
      and slot_row.starts_at = starts_at
      and slot_row.ends_at = ends_at
      and slot_row.is_booked = false
      and teacher_profile.role = 'teacher'
      and teacher_profile.approval_status = 'approved'
  )
);
