-- Recurring group classes MVP foundation (separate from 1-on-1 bookings).
-- This migration intentionally does not modify bookings, availability slots,
-- booking triggers, or existing session tables.

-- 1) Group class templates (admin-managed class definitions)
create table if not exists public.group_class_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid not null references auth.users (id) on delete restrict,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 240),
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_by_admin uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_class_templates_teacher_idx
  on public.group_class_templates (teacher_id);

create index if not exists group_class_templates_active_idx
  on public.group_class_templates (is_active, created_at desc);

-- 2) Recurrence rules (how a template repeats)
create table if not exists public.group_class_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.group_class_templates (id) on delete cascade,
  rule_type text not null check (rule_type in ('monthly_nth_weekday')),
  weekday smallint not null check (weekday between 0 and 6),
  week_of_month smallint not null check (week_of_month between 1 and 5),
  start_time_local time not null,
  end_time_local time not null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_recurrence_rules_time_check check (end_time_local > start_time_local),
  constraint group_class_recurrence_rules_effective_window_check
    check (effective_to is null or effective_to >= effective_from),
  constraint group_class_recurrence_rules_unique_rule unique (
    template_id,
    rule_type,
    weekday,
    week_of_month,
    start_time_local,
    end_time_local,
    effective_from
  )
);

create index if not exists group_class_recurrence_rules_template_idx
  on public.group_class_recurrence_rules (template_id);

create index if not exists group_class_recurrence_rules_active_idx
  on public.group_class_recurrence_rules (is_active, effective_from);

-- 3) Concrete generated occurrences
create table if not exists public.group_class_occurrences (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.group_class_templates (id) on delete cascade,
  recurrence_rule_id uuid references public.group_class_recurrence_rules (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  meeting_room_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_occurrences_time_check check (ends_at > starts_at),
  constraint group_class_occurrences_unique_slot unique (template_id, starts_at, ends_at)
);

create index if not exists group_class_occurrences_template_starts_idx
  on public.group_class_occurrences (template_id, starts_at);

create index if not exists group_class_occurrences_status_starts_idx
  on public.group_class_occurrences (status, starts_at);

-- 4) Admin-managed student enrollments
create table if not exists public.group_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.group_class_templates (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  assigned_by_admin uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_enrollments_unique_student_per_template unique (template_id, student_id)
);

create index if not exists group_class_enrollments_student_idx
  on public.group_class_enrollments (student_id, status);

create index if not exists group_class_enrollments_template_idx
  on public.group_class_enrollments (template_id, status);

-- 5) Group session attendance per occurrence participant
create table if not exists public.group_session_attendance (
  occurrence_id uuid not null references public.group_class_occurrences (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (occurrence_id, user_id)
);

create index if not exists group_session_attendance_user_idx
  on public.group_session_attendance (user_id, joined_at desc);

-- shared updated_at trigger function for new group tables
create or replace function public.set_group_tables_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_group_class_templates_updated on public.group_class_templates;
create trigger on_group_class_templates_updated
before update on public.group_class_templates
for each row
execute function public.set_group_tables_updated_at();

drop trigger if exists on_group_class_recurrence_rules_updated on public.group_class_recurrence_rules;
create trigger on_group_class_recurrence_rules_updated
before update on public.group_class_recurrence_rules
for each row
execute function public.set_group_tables_updated_at();

drop trigger if exists on_group_class_occurrences_updated on public.group_class_occurrences;
create trigger on_group_class_occurrences_updated
before update on public.group_class_occurrences
for each row
execute function public.set_group_tables_updated_at();

drop trigger if exists on_group_class_enrollments_updated on public.group_class_enrollments;
create trigger on_group_class_enrollments_updated
before update on public.group_class_enrollments
for each row
execute function public.set_group_tables_updated_at();

drop trigger if exists on_group_session_attendance_updated on public.group_session_attendance;
create trigger on_group_session_attendance_updated
before update on public.group_session_attendance
for each row
execute function public.set_group_tables_updated_at();

-- Enable RLS on all new tables
alter table public.group_class_templates enable row level security;
alter table public.group_class_recurrence_rules enable row level security;
alter table public.group_class_occurrences enable row level security;
alter table public.group_class_enrollments enable row level security;
alter table public.group_session_attendance enable row level security;

-- Helper predicate fragments are repeated inline to keep migration self-contained.

-- -----------------------------
-- group_class_templates policies
-- -----------------------------
drop policy if exists "group_class_templates_admin_select_all" on public.group_class_templates;
create policy "group_class_templates_admin_select_all"
on public.group_class_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_templates_admin_insert_all" on public.group_class_templates;
create policy "group_class_templates_admin_insert_all"
on public.group_class_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_templates_admin_update_all" on public.group_class_templates;
create policy "group_class_templates_admin_update_all"
on public.group_class_templates
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

drop policy if exists "group_class_templates_admin_delete_all" on public.group_class_templates;
create policy "group_class_templates_admin_delete_all"
on public.group_class_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_templates_teacher_select_assigned" on public.group_class_templates;
create policy "group_class_templates_teacher_select_assigned"
on public.group_class_templates
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_templates_student_select_enrolled" on public.group_class_templates;
create policy "group_class_templates_student_select_enrolled"
on public.group_class_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.group_class_enrollments enrollment
    where enrollment.template_id = group_class_templates.id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
  )
);

-- -------------------------------------
-- group_class_recurrence_rules policies
-- -------------------------------------
drop policy if exists "group_class_recurrence_rules_admin_select_all" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_admin_select_all"
on public.group_class_recurrence_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_recurrence_rules_admin_insert_all" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_admin_insert_all"
on public.group_class_recurrence_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_recurrence_rules_admin_update_all" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_admin_update_all"
on public.group_class_recurrence_rules
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

drop policy if exists "group_class_recurrence_rules_admin_delete_all" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_admin_delete_all"
on public.group_class_recurrence_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_recurrence_rules_teacher_select_assigned" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_teacher_select_assigned"
on public.group_class_recurrence_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_recurrence_rules.template_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_recurrence_rules_student_select_enrolled" on public.group_class_recurrence_rules;
create policy "group_class_recurrence_rules_student_select_enrolled"
on public.group_class_recurrence_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.group_class_enrollments enrollment
    where enrollment.template_id = group_class_recurrence_rules.template_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
  )
);

-- --------------------------------
-- group_class_occurrences policies
-- --------------------------------
drop policy if exists "group_class_occurrences_admin_select_all" on public.group_class_occurrences;
create policy "group_class_occurrences_admin_select_all"
on public.group_class_occurrences
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_occurrences_admin_insert_all" on public.group_class_occurrences;
create policy "group_class_occurrences_admin_insert_all"
on public.group_class_occurrences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_occurrences_admin_update_all" on public.group_class_occurrences;
create policy "group_class_occurrences_admin_update_all"
on public.group_class_occurrences
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

drop policy if exists "group_class_occurrences_admin_delete_all" on public.group_class_occurrences;
create policy "group_class_occurrences_admin_delete_all"
on public.group_class_occurrences
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_occurrences_teacher_select_assigned" on public.group_class_occurrences;
create policy "group_class_occurrences_teacher_select_assigned"
on public.group_class_occurrences
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_occurrences.template_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_occurrences_student_select_enrolled" on public.group_class_occurrences;
create policy "group_class_occurrences_student_select_enrolled"
on public.group_class_occurrences
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
  and exists (
    select 1
    from public.group_class_enrollments enrollment
    where enrollment.template_id = group_class_occurrences.template_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
  )
);

-- --------------------------------
-- group_class_enrollments policies
-- --------------------------------
drop policy if exists "group_class_enrollments_admin_select_all" on public.group_class_enrollments;
create policy "group_class_enrollments_admin_select_all"
on public.group_class_enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_enrollments_admin_insert_all" on public.group_class_enrollments;
create policy "group_class_enrollments_admin_insert_all"
on public.group_class_enrollments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_enrollments_admin_update_all" on public.group_class_enrollments;
create policy "group_class_enrollments_admin_update_all"
on public.group_class_enrollments
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

drop policy if exists "group_class_enrollments_admin_delete_all" on public.group_class_enrollments;
create policy "group_class_enrollments_admin_delete_all"
on public.group_class_enrollments
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_class_enrollments_teacher_select_assigned_classes" on public.group_class_enrollments;
create policy "group_class_enrollments_teacher_select_assigned_classes"
on public.group_class_enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_templates template
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where template.id = group_class_enrollments.template_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_class_enrollments_student_select_own" on public.group_class_enrollments;
create policy "group_class_enrollments_student_select_own"
on public.group_class_enrollments
for select
to authenticated
using (
  student_id = auth.uid()
  and exists (
    select 1
    from public.profiles requester_profile
    where requester_profile.id = auth.uid()
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);

-- --------------------------------
-- group_session_attendance policies
-- --------------------------------
drop policy if exists "group_session_attendance_admin_select_all" on public.group_session_attendance;
create policy "group_session_attendance_admin_select_all"
on public.group_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_session_attendance_admin_insert_all" on public.group_session_attendance;
create policy "group_session_attendance_admin_insert_all"
on public.group_session_attendance
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_session_attendance_admin_update_all" on public.group_session_attendance;
create policy "group_session_attendance_admin_update_all"
on public.group_session_attendance
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

drop policy if exists "group_session_attendance_admin_delete_all" on public.group_session_attendance;
create policy "group_session_attendance_admin_delete_all"
on public.group_session_attendance
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "group_session_attendance_teacher_select_assigned_occurrences" on public.group_session_attendance;
create policy "group_session_attendance_teacher_select_assigned_occurrences"
on public.group_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_templates template on template.id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_session_attendance_student_select_enrolled_teacher_or_self" on public.group_session_attendance;
create policy "group_session_attendance_student_select_enrolled_teacher_or_self"
on public.group_session_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_enrollments enrollment on enrollment.template_id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
  and (
    group_session_attendance.user_id = auth.uid()
    or group_session_attendance.role = 'teacher'
  )
);

drop policy if exists "group_session_attendance_teacher_insert_own" on public.group_session_attendance;
create policy "group_session_attendance_teacher_insert_own"
on public.group_session_attendance
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_templates template on template.id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_session_attendance_teacher_update_own" on public.group_session_attendance;
create policy "group_session_attendance_teacher_update_own"
on public.group_session_attendance
for update
to authenticated
using (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_templates template on template.id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
)
with check (
  user_id = auth.uid()
  and role = 'teacher'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_templates template on template.id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and template.teacher_id = auth.uid()
      and requester_profile.role = 'teacher'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_session_attendance_student_insert_own" on public.group_session_attendance;
create policy "group_session_attendance_student_insert_own"
on public.group_session_attendance
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'student'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_enrollments enrollment on enrollment.template_id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);

drop policy if exists "group_session_attendance_student_update_own" on public.group_session_attendance;
create policy "group_session_attendance_student_update_own"
on public.group_session_attendance
for update
to authenticated
using (
  user_id = auth.uid()
  and role = 'student'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_enrollments enrollment on enrollment.template_id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
)
with check (
  user_id = auth.uid()
  and role = 'student'
  and exists (
    select 1
    from public.group_class_occurrences occurrence
    join public.group_class_enrollments enrollment on enrollment.template_id = occurrence.template_id
    join public.profiles requester_profile on requester_profile.id = auth.uid()
    where occurrence.id = group_session_attendance.occurrence_id
      and enrollment.student_id = auth.uid()
      and enrollment.status = 'active'
      and requester_profile.role = 'student'
      and requester_profile.approval_status = 'approved'
  )
);
