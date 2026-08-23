-- HR module expansion: departments, profiles, attendance, leave, lifecycle

-- ---------------------------------------------------------------------------
-- Departments & designations
-- ---------------------------------------------------------------------------

create table if not exists public.hr_departments (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  manager_id uuid references public.employees(id) on delete set null,
  parent_id uuid references public.hr_departments(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists hr_departments_workspace_name_lower_idx
  on public.hr_departments (workspace_id, lower(name));

create table if not exists public.hr_designations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  level text,
  description text,
  created_at timestamptz default now() not null
);

create unique index if not exists hr_designations_workspace_title_lower_idx
  on public.hr_designations (workspace_id, lower(title));

-- Seed departments from legacy workspace JSON array
insert into public.hr_departments (workspace_id, name)
select w.id, trim(dept.value)
from public.workspaces w
cross join lateral jsonb_array_elements_text(coalesce(w.departments, '[]'::jsonb)) as dept(value)
where trim(dept.value) <> ''
  and not exists (
    select 1 from public.hr_departments d
    where d.workspace_id = w.id and lower(d.name) = lower(trim(dept.value))
  );

-- ---------------------------------------------------------------------------
-- Employee profile extensions
-- ---------------------------------------------------------------------------

alter table public.employees
  add column if not exists employee_code text,
  add column if not exists department_id uuid references public.hr_departments(id) on delete set null,
  add column if not exists designation_id uuid references public.hr_designations(id) on delete set null,
  add column if not exists manager_id uuid references public.employees(id) on delete set null,
  add column if not exists job_title text,
  add column if not exists employment_type text default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  add column if not exists work_location text,
  add column if not exists date_of_birth date,
  add column if not exists address text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists lifecycle_stage text not null default 'active'
    check (lifecycle_stage in ('onboarding', 'active', 'on_leave', 'offboarding', 'inactive')),
  add column if not exists offboarding_date date,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now() not null;

-- Link department_id from legacy text department name
update public.employees e
set department_id = d.id
from public.hr_departments d
where e.workspace_id = d.workspace_id
  and lower(trim(e.department)) = lower(trim(d.name))
  and e.department_id is null;

alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees add constraint employees_status_check
  check (status in ('active', 'inactive', 'on_leave', 'invited', 'onboarding', 'offboarding'));

create unique index if not exists employees_workspace_code_idx
  on public.employees (workspace_id, lower(employee_code))
  where employee_code is not null;

-- Documents & history
create table if not exists public.employee_documents (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  employee_id uuid references public.employees(id) on delete cascade not null,
  name text not null,
  document_type text not null default 'other'
    check (document_type in ('contract', 'id_proof', 'certificate', 'offer_letter', 'other')),
  file_url text,
  notes text,
  uploaded_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create table if not exists public.employee_history (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  employee_id uuid references public.employees(id) on delete cascade not null,
  event_type text not null
    check (event_type in (
      'hired', 'onboarding_started', 'onboarding_completed', 'promoted', 'transferred',
      'manager_changed', 'department_changed', 'leave_started', 'leave_ended',
      'offboarding_started', 'offboarding_completed', 'deactivated', 'reactivated', 'note'
    )),
  title text not null,
  description text,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists employee_history_employee_idx on public.employee_history (employee_id, created_at desc);
create index if not exists employee_documents_employee_idx on public.employee_documents (employee_id);

-- ---------------------------------------------------------------------------
-- Attendance extensions
-- ---------------------------------------------------------------------------

alter table public.attendance
  add column if not exists work_hours_minutes integer,
  add column if not exists notes text,
  add column if not exists marked_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz default now() not null;

create unique index if not exists attendance_employee_date_idx
  on public.attendance (employee_id, date);

-- ---------------------------------------------------------------------------
-- Leave types, balances, request extensions
-- ---------------------------------------------------------------------------

create table if not exists public.hr_leave_types (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  code text not null,
  default_days_per_year numeric(6,2) not null default 0,
  is_paid boolean not null default true,
  requires_approval boolean not null default true,
  color text default '#6366f1',
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

create unique index if not exists hr_leave_types_workspace_code_lower_idx
  on public.hr_leave_types (workspace_id, lower(code));

create table if not exists public.hr_leave_balances (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  employee_id uuid references public.employees(id) on delete cascade not null,
  leave_type_id uuid references public.hr_leave_types(id) on delete cascade not null,
  year integer not null default extract(year from current_date)::integer,
  allocated_days numeric(6,2) not null default 0,
  used_days numeric(6,2) not null default 0,
  updated_at timestamptz default now() not null,
  unique (employee_id, leave_type_id, year)
);

alter table public.leave_requests
  add column if not exists leave_type_id uuid references public.hr_leave_types(id) on delete set null,
  add column if not exists days_count numeric(6,2),
  add column if not exists approved_by uuid references public.employees(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz default now() not null;

-- Default leave types per workspace
insert into public.hr_leave_types (workspace_id, name, code, default_days_per_year, color)
select w.id, t.name, t.code, t.days, t.color
from public.workspaces w
cross join (
  values
    ('Annual Leave', 'annual', 18::numeric, '#22c55e'),
    ('Sick Leave', 'sick', 10::numeric, '#ef4444'),
    ('Personal Leave', 'personal', 5::numeric, '#3b82f6'),
    ('Unpaid Leave', 'unpaid', 0::numeric, '#94a3b8')
) as t(name, code, days, color)
where not exists (
  select 1 from public.hr_leave_types lt
  where lt.workspace_id = w.id and lower(lt.code) = lower(t.code)
);

-- Map legacy leave type text to leave_type_id
update public.leave_requests lr
set leave_type_id = lt.id
from public.hr_leave_types lt
where lr.workspace_id = lt.workspace_id
  and lr.leave_type_id is null
  and lower(lr.type) = lower(lt.code);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.hr_departments enable row level security;
alter table public.hr_designations enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_history enable row level security;
alter table public.hr_leave_types enable row level security;
alter table public.hr_leave_balances enable row level security;

-- Departments
create policy "HR view departments" on public.hr_departments for select
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'view'));
create policy "HR manage departments" on public.hr_departments for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'));

-- Designations
create policy "HR view designations" on public.hr_designations for select
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'view'));
create policy "HR manage designations" on public.hr_designations for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'));

-- Documents
create policy "HR view documents" on public.employee_documents for select
  using (
    public.is_workspace_owner(workspace_id)
    or public.current_user_can(workspace_id, 'hr', 'view')
    or employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = employee_documents.workspace_id)
  );
create policy "HR manage documents" on public.employee_documents for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'));

-- History
create policy "HR view history" on public.employee_history for select
  using (
    public.is_workspace_owner(workspace_id)
    or public.current_user_can(workspace_id, 'hr', 'view')
    or employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = employee_history.workspace_id)
  );
create policy "HR manage history" on public.employee_history for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'));

-- Leave types
create policy "HR view leave types" on public.hr_leave_types for select
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'view'));
create policy "HR manage leave types" on public.hr_leave_types for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'manage'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'manage'));

-- Leave balances
create policy "HR view leave balances" on public.hr_leave_balances for select
  using (
    public.is_workspace_owner(workspace_id)
    or public.current_user_can(workspace_id, 'hr', 'view')
    or employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = hr_leave_balances.workspace_id)
  );
create policy "HR manage leave balances" on public.hr_leave_balances for all
  using (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'))
  with check (public.is_workspace_owner(workspace_id) or public.current_user_can(workspace_id, 'hr', 'edit'));

-- Employee self attendance check-in
create policy "Employee view own attendance" on public.attendance for select
  using (
    employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = attendance.workspace_id)
  );

create policy "Employee create own attendance" on public.attendance for insert
  with check (
    employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = attendance.workspace_id)
  );

create policy "Employee update own attendance" on public.attendance for update
  using (
    employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = attendance.workspace_id)
  );

-- Employee self leave
create policy "Employee view own leave" on public.leave_requests for select
  using (
    employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = leave_requests.workspace_id)
  );

create policy "Employee create own leave" on public.leave_requests for insert
  with check (
    employee_id in (select id from public.employees where user_id = auth.uid() and workspace_id = leave_requests.workspace_id)
  );

-- ---------------------------------------------------------------------------
-- Helpers & RPCs
-- ---------------------------------------------------------------------------

create or replace function public.record_employee_history(
  p_workspace_id uuid,
  p_employee_id uuid,
  p_event_type text,
  p_title text,
  p_description text default null,
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'hr', 'edit')
  ) then
    raise exception 'Permission denied';
  end if;

  insert into public.employee_history (
    workspace_id, employee_id, event_type, title, description, metadata, created_by
  ) values (
    p_workspace_id, p_employee_id, p_event_type, p_title, p_description, coalesce(p_metadata, '{}'), auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_hr_dashboard_stats(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'hr', 'view')
  ) then
    raise exception 'Permission denied';
  end if;

  select jsonb_build_object(
    'employees', jsonb_build_object(
      'total', (select count(*) from public.employees where workspace_id = p_workspace_id),
      'active', (select count(*) from public.employees where workspace_id = p_workspace_id and status = 'active'),
      'onboarding', (select count(*) from public.employees where workspace_id = p_workspace_id and lifecycle_stage = 'onboarding'),
      'on_leave', (select count(*) from public.employees where workspace_id = p_workspace_id and status = 'on_leave'),
      'inactive', (select count(*) from public.employees where workspace_id = p_workspace_id and status = 'inactive'),
      'invited', (select count(*) from public.employees where workspace_id = p_workspace_id and status = 'invited')
    ),
    'departments', (select count(*) from public.hr_departments where workspace_id = p_workspace_id),
    'attendance_today', jsonb_build_object(
      'present', (select count(*) from public.attendance a join public.employees e on e.id = a.employee_id where a.workspace_id = p_workspace_id and a.date = current_date and a.status = 'present'),
      'absent', (select count(*) from public.attendance a where a.workspace_id = p_workspace_id and a.date = current_date and a.status = 'absent'),
      'late', (select count(*) from public.attendance a where a.workspace_id = p_workspace_id and a.date = current_date and a.status = 'late'),
      'half_day', (select count(*) from public.attendance a where a.workspace_id = p_workspace_id and a.date = current_date and a.status = 'half_day')
    ),
    'leave', jsonb_build_object(
      'pending', (select count(*) from public.leave_requests where workspace_id = p_workspace_id and status = 'pending'),
      'approved_this_month', (
        select count(*) from public.leave_requests
        where workspace_id = p_workspace_id and status = 'approved'
          and date_trunc('month', coalesce(approved_at, created_at)) = date_trunc('month', now())
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.record_employee_history(uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.get_hr_dashboard_stats(uuid) to authenticated;
