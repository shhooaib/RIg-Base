-- Finance module expansion: invoices, payments, expenses, AR/AP, refunds, reconciliation, gateway links

-- Vendors (AP counterparties)
create table if not exists public.finance_vendors (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  tax_id text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists finance_vendors_workspace_idx on public.finance_vendors (workspace_id);

-- Extend ledger transactions with links and gateway metadata
alter table public.transactions
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists deal_id uuid references public.deals(id) on delete set null,
  add column if not exists invoice_id uuid,
  add column if not exists payment_id uuid,
  add column if not exists expense_id uuid,
  add column if not exists vendor_id uuid references public.finance_vendors(id) on delete set null,
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists fee_amount numeric not null default 0,
  add column if not exists net_amount numeric,
  add column if not exists currency text not null default 'USD',
  add column if not exists status text not null default 'posted'
    check (status in ('draft', 'posted', 'void', 'reconciled')),
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'import', 'stripe', 'razorpay', 'invoice', 'expense', 'refund')),
  add column if not exists attachment_urls jsonb not null default '[]',
  add column if not exists updated_at timestamptz default now();

-- Invoices (Accounts Receivable)
create table if not exists public.finance_invoices (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  invoice_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partial', 'paid', 'overdue', 'void', 'cancelled')),
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'USD',
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  fee_amount numeric not null default 0,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  notes text,
  attachment_urls jsonb not null default '[]',
  stripe_invoice_id text,
  razorpay_invoice_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, invoice_number)
);

create index if not exists finance_invoices_workspace_status_idx on public.finance_invoices (workspace_id, status);
create index if not exists finance_invoices_customer_idx on public.finance_invoices (customer_id);
create index if not exists finance_invoices_due_idx on public.finance_invoices (workspace_id, due_date);

alter table public.transactions
  add constraint transactions_invoice_id_fkey
  foreign key (invoice_id) references public.finance_invoices(id) on delete set null;

create table if not exists public.finance_invoice_line_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.finance_invoices(id) on delete cascade not null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  tax_rate numeric not null default 0,
  amount numeric not null default 0,
  position integer not null default 0
);

-- Expenses (Accounts Payable)
create table if not exists public.finance_expenses (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  vendor_id uuid references public.finance_vendors(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  category text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'paid', 'void')),
  description text not null,
  expense_date date not null default current_date,
  due_date date,
  currency text not null default 'USD',
  amount numeric not null default 0,
  tax_amount numeric not null default 0,
  fee_amount numeric not null default 0,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  paid_at timestamptz,
  reference text,
  notes text,
  attachment_urls jsonb not null default '[]',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists finance_expenses_workspace_status_idx on public.finance_expenses (workspace_id, status);
create index if not exists finance_expenses_vendor_idx on public.finance_expenses (vendor_id);

alter table public.transactions
  add constraint transactions_expense_id_fkey
  foreign key (expense_id) references public.finance_expenses(id) on delete set null;

-- Payments (inbound/outbound, manual + gateways)
create table if not exists public.finance_payments (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  amount numeric not null,
  fee_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  net_amount numeric not null default 0,
  currency text not null default 'USD',
  paid_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  invoice_id uuid references public.finance_invoices(id) on delete set null,
  expense_id uuid references public.finance_expenses(id) on delete set null,
  vendor_id uuid references public.finance_vendors(id) on delete set null,
  payment_method text,
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'razorpay')),
  provider_payment_id text,
  provider_charge_id text,
  provider_order_id text,
  provider_customer_id text,
  provider_settlement_id text,
  provider_utr text,
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}',
  attachment_urls jsonb not null default '[]',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists finance_payments_workspace_status_idx on public.finance_payments (workspace_id, status);
create index if not exists finance_payments_provider_idx on public.finance_payments (workspace_id, provider, provider_payment_id);
create index if not exists finance_payments_invoice_idx on public.finance_payments (invoice_id);

alter table public.transactions
  add constraint transactions_payment_id_fkey
  foreign key (payment_id) references public.finance_payments(id) on delete set null;

-- Refunds
create table if not exists public.finance_refunds (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  payment_id uuid references public.finance_payments(id) on delete cascade not null,
  amount numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  reason text,
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'razorpay')),
  provider_refund_id text,
  refunded_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists finance_refunds_payment_idx on public.finance_refunds (payment_id);

-- Reconciliation batches
create table if not exists public.finance_reconciliations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null check (provider in ('manual', 'stripe', 'razorpay')),
  period_start date not null,
  period_end date not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'reconciled', 'discrepancy')),
  expected_amount numeric not null default 0,
  actual_amount numeric not null default 0,
  fee_total numeric not null default 0,
  tax_total numeric not null default 0,
  settlement_id text,
  settlement_utr text,
  notes text,
  reconciled_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists finance_reconciliations_workspace_idx on public.finance_reconciliations (workspace_id, provider);

-- Payment gateway integrations (secrets server-side via RPC)
create table if not exists public.payment_integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null check (provider in ('stripe', 'razorpay')),
  account_mode text not null default 'test' check (account_mode in ('test', 'live')),
  publishable_key text,
  secret_key text not null,
  webhook_secret text,
  connected_at timestamptz default now() not null,
  last_sync_at timestamptz,
  last_sync_status text not null default 'idle'
    check (last_sync_status in ('idle', 'syncing', 'success', 'error')),
  last_sync_error text,
  last_webhook_at timestamptz,
  webhook_status text not null default 'unknown'
    check (webhook_status in ('unknown', 'healthy', 'error')),
  webhook_last_error text,
  updated_at timestamptz default now() not null,
  unique (workspace_id, provider)
);

-- Webhook idempotency log
create table if not exists public.finance_webhook_events (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null check (provider in ('stripe', 'razorpay')),
  event_id text not null,
  event_type text not null,
  processed_at timestamptz default now() not null,
  payload jsonb not null default '{}',
  unique (workspace_id, provider, event_id)
);

-- RLS
alter table public.finance_vendors enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_invoice_line_items enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_payments enable row level security;
alter table public.finance_refunds enable row level security;
alter table public.finance_reconciliations enable row level security;
alter table public.payment_integrations enable row level security;
alter table public.finance_webhook_events enable row level security;

-- finance_vendors
create policy "Finance view vendors" on public.finance_vendors for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance manage vendors" on public.finance_vendors for all
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));

-- finance_invoices
create policy "Finance view invoices" on public.finance_invoices for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance create invoices" on public.finance_invoices for insert
  with check (public.current_user_can(workspace_id, 'finance', 'create') or public.is_workspace_owner(workspace_id));
create policy "Finance edit invoices" on public.finance_invoices for update
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));
create policy "Finance delete invoices" on public.finance_invoices for delete
  using (public.current_user_can(workspace_id, 'finance', 'delete') or public.is_workspace_owner(workspace_id));

-- finance_invoice_line_items (via invoice workspace)
create policy "Finance view invoice lines" on public.finance_invoice_line_items for select
  using (exists (
    select 1 from public.finance_invoices i
    where i.id = invoice_id
      and (public.current_user_can(i.workspace_id, 'finance', 'view') or public.is_workspace_owner(i.workspace_id))
  ));
create policy "Finance manage invoice lines" on public.finance_invoice_line_items for all
  using (exists (
    select 1 from public.finance_invoices i
    where i.id = invoice_id
      and (public.current_user_can(i.workspace_id, 'finance', 'edit') or public.is_workspace_owner(i.workspace_id))
  ))
  with check (exists (
    select 1 from public.finance_invoices i
    where i.id = invoice_id
      and (public.current_user_can(i.workspace_id, 'finance', 'edit') or public.is_workspace_owner(i.workspace_id))
  ));

-- finance_expenses
create policy "Finance view expenses" on public.finance_expenses for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance create expenses" on public.finance_expenses for insert
  with check (public.current_user_can(workspace_id, 'finance', 'create') or public.is_workspace_owner(workspace_id));
create policy "Finance edit expenses" on public.finance_expenses for update
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));
create policy "Finance delete expenses" on public.finance_expenses for delete
  using (public.current_user_can(workspace_id, 'finance', 'delete') or public.is_workspace_owner(workspace_id));

-- finance_payments
create policy "Finance view payments" on public.finance_payments for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance create payments" on public.finance_payments for insert
  with check (public.current_user_can(workspace_id, 'finance', 'create') or public.is_workspace_owner(workspace_id));
create policy "Finance edit payments" on public.finance_payments for update
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));
create policy "Finance delete payments" on public.finance_payments for delete
  using (public.current_user_can(workspace_id, 'finance', 'delete') or public.is_workspace_owner(workspace_id));

-- finance_refunds
create policy "Finance view refunds" on public.finance_refunds for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance manage refunds" on public.finance_refunds for all
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));

-- finance_reconciliations
create policy "Finance view reconciliations" on public.finance_reconciliations for select
  using (public.current_user_can(workspace_id, 'finance', 'view') or public.is_workspace_owner(workspace_id));
create policy "Finance manage reconciliations" on public.finance_reconciliations for all
  using (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'finance', 'edit') or public.is_workspace_owner(workspace_id));

-- payment_integrations: no direct client access (RPC only)
-- finance_webhook_events: no direct client access
