-- CRM module expansion: leads, deals, activities, notes, timeline, tags, pipeline

-- Extend existing customers table
alter table public.customers
  add column if not exists assigned_to uuid references public.employees(id) on delete set null,
  add column if not exists source text,
  add column if not exists next_follow_up timestamp with time zone,
  add column if not exists updated_at timestamp with time zone default now();

create index if not exists customers_workspace_status_idx on public.customers (workspace_id, status);
create index if not exists customers_assigned_to_idx on public.customers (assigned_to);
create index if not exists customers_email_idx on public.customers (workspace_id, email);

-- Reusable CRM tags per workspace
create table if not exists public.crm_tags (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  color text not null default '#c5a059',
  created_at timestamp with time zone default now(),
  unique (workspace_id, name)
);

create table if not exists public.crm_tag_assignments (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  tag_id uuid references public.crm_tags(id) on delete cascade not null,
  entity_type text not null check (entity_type in ('customer', 'lead')),
  entity_id uuid not null,
  created_at timestamp with time zone default now(),
  unique (tag_id, entity_type, entity_id)
);

create index if not exists crm_tag_assignments_entity_idx
  on public.crm_tag_assignments (workspace_id, entity_type, entity_id);

-- Leads (separate from customers until conversion)
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company text,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'opportunity', 'won', 'lost')),
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  estimated_value numeric not null default 0,
  assigned_to uuid references public.employees(id) on delete set null,
  converted_customer_id uuid references public.customers(id) on delete set null,
  converted_deal_id uuid,
  notes text,
  last_contacted_at timestamp with time zone,
  next_follow_up_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists leads_workspace_status_idx on public.leads (workspace_id, status);
create index if not exists leads_assigned_to_idx on public.leads (assigned_to);
create index if not exists leads_email_idx on public.leads (workspace_id, email);

-- Configurable deal pipeline stages
create table if not exists public.crm_pipeline_stages (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  position integer not null default 0,
  probability_default integer not null default 0 check (probability_default >= 0 and probability_default <= 100),
  is_closed_won boolean not null default false,
  is_closed_lost boolean not null default false,
  created_at timestamp with time zone default now(),
  unique (workspace_id, name)
);

create index if not exists crm_pipeline_stages_workspace_idx
  on public.crm_pipeline_stages (workspace_id, position);

-- Deals / opportunities
create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  value numeric not null default 0,
  stage_id uuid references public.crm_pipeline_stages(id) on delete restrict not null,
  probability integer not null default 0 check (probability >= 0 and probability <= 100),
  expected_close_date date,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  product_ids jsonb not null default '[]',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.leads
  add constraint leads_converted_deal_id_fkey
  foreign key (converted_deal_id) references public.deals(id) on delete set null;

create index if not exists deals_workspace_status_idx on public.deals (workspace_id, status);
create index if not exists deals_stage_idx on public.deals (stage_id);
create index if not exists deals_customer_idx on public.deals (customer_id);
create index if not exists deals_assigned_to_idx on public.deals (assigned_to);

-- CRM activities & tasks
create table if not exists public.crm_activities (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  type text not null check (type in ('call', 'meeting', 'task', 'follow_up', 'email', 'demo', 'other')),
  title text not null,
  description text,
  customer_id uuid references public.customers(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  assigned_to uuid references public.employees(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  check (customer_id is not null or lead_id is not null or deal_id is not null)
);

create index if not exists crm_activities_workspace_due_idx on public.crm_activities (workspace_id, due_at);
create index if not exists crm_activities_assigned_idx on public.crm_activities (assigned_to, status);
create index if not exists crm_activities_customer_idx on public.crm_activities (customer_id);
create index if not exists crm_activities_lead_idx on public.crm_activities (lead_id);
create index if not exists crm_activities_deal_idx on public.crm_activities (deal_id);

-- Internal CRM notes
create table if not exists public.crm_notes (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  check (customer_id is not null or lead_id is not null or deal_id is not null)
);

create index if not exists crm_notes_customer_idx on public.crm_notes (customer_id, created_at desc);
create index if not exists crm_notes_lead_idx on public.crm_notes (lead_id, created_at desc);
create index if not exists crm_notes_deal_idx on public.crm_notes (deal_id, created_at desc);

-- Unified interaction timeline
create table if not exists public.crm_interactions (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  event_type text not null check (event_type in (
    'lead_created', 'customer_created', 'deal_created', 'deal_stage_changed',
    'call_logged', 'meeting_completed', 'email_logged', 'note_added',
    'task_completed', 'follow_up_scheduled', 'deal_won', 'deal_lost', 'lead_converted'
  )),
  title text not null,
  description text,
  customer_id uuid references public.customers(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  activity_id uuid references public.crm_activities(id) on delete set null,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists crm_interactions_workspace_created_idx
  on public.crm_interactions (workspace_id, created_at desc);
create index if not exists crm_interactions_customer_idx
  on public.crm_interactions (customer_id, created_at desc);
create index if not exists crm_interactions_lead_idx
  on public.crm_interactions (lead_id, created_at desc);
create index if not exists crm_interactions_deal_idx
  on public.crm_interactions (deal_id, created_at desc);

-- Seed default pipeline stages for a workspace
create or replace function public.seed_crm_pipeline_stages(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.crm_pipeline_stages where workspace_id = p_workspace_id) then
    return;
  end if;

  insert into public.crm_pipeline_stages (workspace_id, name, position, probability_default, is_closed_won, is_closed_lost)
  values
    (p_workspace_id, 'New', 0, 10, false, false),
    (p_workspace_id, 'Qualified', 1, 30, false, false),
    (p_workspace_id, 'Proposal', 2, 50, false, false),
    (p_workspace_id, 'Negotiation', 3, 75, false, false),
    (p_workspace_id, 'Won', 4, 100, true, false),
    (p_workspace_id, 'Lost', 5, 0, false, true);
end;
$$;

-- RLS helper macro pattern for CRM child tables
alter table public.crm_tags enable row level security;
alter table public.crm_tag_assignments enable row level security;
alter table public.leads enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_interactions enable row level security;

-- crm_tags
create policy "CRM view tags" on public.crm_tags for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM manage tags" on public.crm_tags for all
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));

-- crm_tag_assignments
create policy "CRM view tag assignments" on public.crm_tag_assignments for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM manage tag assignments" on public.crm_tag_assignments for all
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));

-- leads
create policy "CRM view leads" on public.leads for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM create leads" on public.leads for insert
  with check (public.current_user_can(workspace_id, 'crm', 'create') or public.is_workspace_owner(workspace_id));
create policy "CRM edit leads" on public.leads for update
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));
create policy "CRM delete leads" on public.leads for delete
  using (public.current_user_can(workspace_id, 'crm', 'delete') or public.is_workspace_owner(workspace_id));

-- pipeline stages
create policy "CRM view pipeline" on public.crm_pipeline_stages for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM manage pipeline" on public.crm_pipeline_stages for all
  using (public.current_user_can(workspace_id, 'crm', 'manage') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'crm', 'manage') or public.is_workspace_owner(workspace_id));

-- deals
create policy "CRM view deals" on public.deals for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM create deals" on public.deals for insert
  with check (public.current_user_can(workspace_id, 'crm', 'create') or public.is_workspace_owner(workspace_id));
create policy "CRM edit deals" on public.deals for update
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));
create policy "CRM delete deals" on public.deals for delete
  using (public.current_user_can(workspace_id, 'crm', 'delete') or public.is_workspace_owner(workspace_id));

-- activities
create policy "CRM view activities" on public.crm_activities for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM create activities" on public.crm_activities for insert
  with check (public.current_user_can(workspace_id, 'crm', 'create') or public.is_workspace_owner(workspace_id));
create policy "CRM edit activities" on public.crm_activities for update
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));
create policy "CRM delete activities" on public.crm_activities for delete
  using (public.current_user_can(workspace_id, 'crm', 'delete') or public.is_workspace_owner(workspace_id));

-- notes
create policy "CRM view notes" on public.crm_notes for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM create notes" on public.crm_notes for insert
  with check (public.current_user_can(workspace_id, 'crm', 'create') or public.is_workspace_owner(workspace_id));
create policy "CRM edit notes" on public.crm_notes for update
  using (public.current_user_can(workspace_id, 'crm', 'edit') or public.is_workspace_owner(workspace_id));
create policy "CRM delete notes" on public.crm_notes for delete
  using (public.current_user_can(workspace_id, 'crm', 'delete') or public.is_workspace_owner(workspace_id));

-- interactions (timeline)
create policy "CRM view interactions" on public.crm_interactions for select
  using (public.current_user_can(workspace_id, 'crm', 'view') or public.is_workspace_owner(workspace_id));
create policy "CRM create interactions" on public.crm_interactions for insert
  with check (public.current_user_can(workspace_id, 'crm', 'create') or public.is_workspace_owner(workspace_id));
