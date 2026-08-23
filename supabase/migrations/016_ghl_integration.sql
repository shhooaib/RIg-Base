-- GoHighLevel (GHL) integration via Private Integration Token (PIT) per sub-account

create table if not exists public.ghl_integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null unique,
  location_id text not null,
  location_name text,
  pipeline_id text,
  pit_token text not null,
  connected_at timestamp with time zone default now() not null,
  last_sync_at timestamp with time zone,
  last_sync_status text not null default 'idle'
    check (last_sync_status in ('idle', 'syncing', 'success', 'error')),
  last_sync_error text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists ghl_integrations_workspace_idx on public.ghl_integrations (workspace_id);

-- External IDs for bidirectional sync (core GHL modules only)
alter table public.customers
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_last_synced_at timestamp with time zone;

alter table public.leads
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_last_synced_at timestamp with time zone;

alter table public.deals
  add column if not exists ghl_opportunity_id text,
  add column if not exists ghl_last_synced_at timestamp with time zone;

alter table public.crm_activities
  add column if not exists ghl_task_id text,
  add column if not exists ghl_last_synced_at timestamp with time zone;

alter table public.crm_pipeline_stages
  add column if not exists ghl_pipeline_stage_id text;

create unique index if not exists customers_workspace_ghl_contact_idx
  on public.customers (workspace_id, ghl_contact_id)
  where ghl_contact_id is not null;

create unique index if not exists leads_workspace_ghl_contact_idx
  on public.leads (workspace_id, ghl_contact_id)
  where ghl_contact_id is not null;

create unique index if not exists deals_workspace_ghl_opportunity_idx
  on public.deals (workspace_id, ghl_opportunity_id)
  where ghl_opportunity_id is not null;

create unique index if not exists crm_activities_workspace_ghl_task_idx
  on public.crm_activities (workspace_id, ghl_task_id)
  where ghl_task_id is not null;

-- PIT tokens are server-only; no client RLS policies
alter table public.ghl_integrations enable row level security;
