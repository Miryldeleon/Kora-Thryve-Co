-- Session notes tied to booking id.
-- Teacher can edit; teacher and student participants can read.

create table public.session_notes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  notes text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_session_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_session_notes_updated
before update on public.session_notes
for each row
execute function public.set_session_notes_updated_at();

alter table public.session_notes enable row level security;

create policy "session_notes_select_participants"
on public.session_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and (booking_row.teacher_id = auth.uid() or booking_row.student_id = auth.uid())
  )
);

create policy "session_notes_insert_teacher"
on public.session_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and booking_row.teacher_id = auth.uid()
  )
);

create policy "session_notes_update_teacher"
on public.session_notes
for update
to authenticated
using (
  exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and booking_row.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.bookings booking_row
    where booking_row.id = booking_id
      and booking_row.teacher_id = auth.uid()
  )
);
