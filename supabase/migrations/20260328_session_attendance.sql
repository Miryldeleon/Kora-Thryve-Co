-- Session attendance / activity tracking per booking participant.
-- Keeps one row per booking and user and refreshes joined_at on revisit.

create table if not exists public.session_attendance (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

create or replace function public.set_session_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_session_attendance_updated on public.session_attendance;

create trigger on_session_attendance_updated
before update on public.session_attendance
for each row
execute function public.set_session_attendance_updated_at();

alter table public.session_attendance enable row level security;

drop policy if exists "session_attendance_select_participants" on public.session_attendance;
create policy "session_attendance_select_participants"
on public.session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and (
        booking_row.teacher_id = auth.uid()
        or (
          booking_row.student_id = auth.uid()
          and (
            session_attendance.user_id = auth.uid()
            or session_attendance.role = 'teacher'
          )
        )
      )
  )
);

drop policy if exists "session_attendance_insert_own_participant_row" on public.session_attendance;
create policy "session_attendance_insert_own_participant_row"
on public.session_attendance
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and (
        (booking_row.teacher_id = auth.uid() and role = 'teacher')
        or (booking_row.student_id = auth.uid() and role = 'student')
      )
  )
);

drop policy if exists "session_attendance_update_own_participant_row" on public.session_attendance;
create policy "session_attendance_update_own_participant_row"
on public.session_attendance
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and (
        (booking_row.teacher_id = auth.uid() and role = 'teacher')
        or (booking_row.student_id = auth.uid() and role = 'student')
      )
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and (
        (booking_row.teacher_id = auth.uid() and role = 'teacher')
        or (booking_row.student_id = auth.uid() and role = 'student')
      )
  )
);
