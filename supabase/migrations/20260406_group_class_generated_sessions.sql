-- Generated group class sessions + participant snapshots.
-- Keeps recurring-template setup and adds idempotent occurrence generation support.

-- 1) Align enrollments with is_active filtering without removing existing status semantics.
alter table public.group_class_enrollments
add column if not exists is_active boolean not null default true;

update public.group_class_enrollments
set is_active = (status = 'active')
where is_active is distinct from (status = 'active');

create index if not exists group_class_enrollments_active_template_idx
  on public.group_class_enrollments (is_active, template_id);

-- 2) Generated session rows (future occurrences built from recurrence rules).
create table if not exists public.group_class_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.group_class_templates (id) on delete restrict,
  recurrence_rule_id uuid not null references public.group_class_recurrence_rules (id) on delete restrict,
  teacher_id uuid not null references auth.users (id) on delete restrict,
  session_date date not null,
  start_time_local time not null,
  end_time_local time not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  meeting_room_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_sessions_time_check check (end_time_local > start_time_local),
  constraint group_class_sessions_unique_generated_occurrence unique (
    template_id,
    recurrence_rule_id,
    session_date,
    start_time_local
  )
);

create index if not exists group_class_sessions_template_date_idx
  on public.group_class_sessions (template_id, session_date);

create index if not exists group_class_sessions_active_date_idx
  on public.group_class_sessions (is_active, session_date);

create unique index if not exists group_class_sessions_room_name_idx
  on public.group_class_sessions (meeting_room_name);

-- 3) Per-session participant snapshots.
create table if not exists public.group_class_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.group_class_sessions (id) on delete restrict,
  student_profile_id uuid not null references auth.users (id) on delete restrict,
  enrollment_id uuid references public.group_class_enrollments (id) on delete set null,
  attendance_status text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_session_participants_unique_student_per_session unique (
    session_id,
    student_profile_id
  )
);

create index if not exists group_class_session_participants_session_active_idx
  on public.group_class_session_participants (session_id, is_active);

create index if not exists group_class_session_participants_student_active_idx
  on public.group_class_session_participants (student_profile_id, is_active);

-- 4) updated_at triggers
drop trigger if exists on_group_class_sessions_updated on public.group_class_sessions;
create trigger on_group_class_sessions_updated
before update on public.group_class_sessions
for each row
execute function public.set_group_tables_updated_at();

drop trigger if exists on_group_class_session_participants_updated on public.group_class_session_participants;
create trigger on_group_class_session_participants_updated
before update on public.group_class_session_participants
for each row
execute function public.set_group_tables_updated_at();

-- 5) RLS
alter table public.group_class_sessions enable row level security;
alter table public.group_class_session_participants enable row level security;

drop policy if exists "group_class_sessions_admin_select_all" on public.group_class_sessions;
create policy "group_class_sessions_admin_select_all"
on public.group_class_sessions
for select
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_sessions_admin_insert_all" on public.group_class_sessions;
create policy "group_class_sessions_admin_insert_all"
on public.group_class_sessions
for insert
to authenticated
with check (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_sessions_admin_update_all" on public.group_class_sessions;
create policy "group_class_sessions_admin_update_all"
on public.group_class_sessions
for update
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
)
with check (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_sessions_admin_delete_all" on public.group_class_sessions;
create policy "group_class_sessions_admin_delete_all"
on public.group_class_sessions
for delete
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_sessions_teacher_select_assigned" on public.group_class_sessions;
create policy "group_class_sessions_teacher_select_assigned"
on public.group_class_sessions
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_sessions.template_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_sessions_student_select_assigned" on public.group_class_sessions;
create policy "group_class_sessions_student_select_assigned"
on public.group_class_sessions
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_session_participants participant
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where participant.session_id = group_class_sessions.id
      and participant.student_profile_id = auth.uid()
      and participant.is_active = true
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_participants_admin_select_all" on public.group_class_session_participants;
create policy "group_class_session_participants_admin_select_all"
on public.group_class_session_participants
for select
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_session_participants_admin_insert_all" on public.group_class_session_participants;
create policy "group_class_session_participants_admin_insert_all"
on public.group_class_session_participants
for insert
to authenticated
with check (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_session_participants_admin_update_all" on public.group_class_session_participants;
create policy "group_class_session_participants_admin_update_all"
on public.group_class_session_participants
for update
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
)
with check (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_session_participants_admin_delete_all" on public.group_class_session_participants;
create policy "group_class_session_participants_admin_delete_all"
on public.group_class_session_participants
for delete
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);

drop policy if exists "group_class_session_participants_teacher_select_assigned" on public.group_class_session_participants;
create policy "group_class_session_participants_teacher_select_assigned"
on public.group_class_session_participants
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.group_class_sessions session_row
    join public.group_class_templates template on template.id = session_row.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where session_row.id = group_class_session_participants.session_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_session_participants_student_select_own" on public.group_class_session_participants;
create policy "group_class_session_participants_student_select_own"
on public.group_class_session_participants
for select
to authenticated
using (
  is_active = true
  and student_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);
