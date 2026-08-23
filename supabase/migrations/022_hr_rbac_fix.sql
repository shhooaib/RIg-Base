-- HR/RBAC fixes: invite lifecycle, employee visibility, role-ready statuses

-- Employees can always view their own record (profile, attendance, leave self-service)
drop policy if exists "Employee can view self" on public.employees;
create policy "Employee can view self" on public.employees
  for select using (
    user_id = auth.uid()
    and workspace_id = employees.workspace_id
  );

-- Accept invite: set lifecycle + keep status in sync with expanded HR module
create or replace function public.accept_employee_invite(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_employee public.employees%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from public.profiles where id = v_user_id;

  select * into v_employee
  from public.employees
  where invite_token = p_token
    and status = 'invited'
    and lower(email) = lower(v_email)
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if exists (
    select 1 from public.employees
    where user_id = v_user_id
      and id <> v_employee.id
      and workspace_id = v_employee.workspace_id
      and status in ('active', 'on_leave', 'onboarding')
  ) then
    raise exception 'Already linked to this workspace';
  end if;

  update public.employees
  set
    user_id = v_user_id,
    status = 'active',
    lifecycle_stage = 'active',
    accepted_at = now(),
    invite_token = null,
    invited_at = coalesce(invited_at, now()),
    updated_at = now()
  where id = v_employee.id;

  update public.profiles
  set
    onboarding_completed = true,
    active_workspace_id = v_employee.workspace_id
  where id = v_user_id;

  return json_build_object(
    'workspace_id', v_employee.workspace_id,
    'employee_id', v_employee.id
  );
end;
$$;

-- Dashboard stats should reflect the same rows members can list (respect RLS)
create or replace function public.get_hr_dashboard_stats(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security invoker
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
      'present', (select count(*) from public.attendance where workspace_id = p_workspace_id and date = current_date and status = 'present'),
      'absent', (select count(*) from public.attendance where workspace_id = p_workspace_id and date = current_date and status = 'absent'),
      'late', (select count(*) from public.attendance where workspace_id = p_workspace_id and date = current_date and status = 'late'),
      'half_day', (select count(*) from public.attendance where workspace_id = p_workspace_id and date = current_date and status = 'half_day')
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

grant execute on function public.get_hr_dashboard_stats(uuid) to authenticated;
