create table if not exists public.session_teaching_state (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  lesson jsonb not null default '{
    "surface": "materials",
    "moduleId": null,
    "page": 1,
    "zoom": 100,
    "scrollTopRatio": 0,
    "scrollLeftRatio": 0
  }'::jsonb,
  annotations jsonb not null default '{}'::jsonb,
  whiteboard_snapshot text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_session_teaching_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_session_teaching_state_updated on public.session_teaching_state;
create trigger on_session_teaching_state_updated
before update on public.session_teaching_state
for each row
execute function public.set_session_teaching_state_updated_at();

alter table public.session_teaching_state enable row level security;

create policy "session_teaching_state_select_participants"
on public.session_teaching_state
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

create policy "session_teaching_state_insert_teacher"
on public.session_teaching_state
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

create policy "session_teaching_state_update_teacher"
on public.session_teaching_state
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
