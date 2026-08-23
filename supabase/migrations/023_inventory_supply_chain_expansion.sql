-- Inventory & Supply Chain expansion: stock movements, PO lifecycle, goods receipt, finance linkage

-- ---------------------------------------------------------------------------
-- Product extensions
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists description text,
  add column if not exists reorder_level integer,
  add column if not exists unit text default 'ea',
  add column if not exists location text,
  add column if not exists barcode text,
  add column if not exists updated_at timestamptz default now() not null;

update public.products set reorder_level = min_stock_level where reorder_level is null;

create unique index if not exists products_workspace_sku_idx
  on public.products (workspace_id, lower(sku));

-- ---------------------------------------------------------------------------
-- Stock movements
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_stock_movements (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  movement_type text not null check (movement_type in (
    'stock_in', 'stock_out', 'adjustment', 'return_in', 'return_out', 'transfer', 'purchase_receipt', 'sale'
  )),
  quantity_delta integer not null,
  quantity_before integer not null default 0,
  quantity_after integer not null default 0,
  unit_cost numeric,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists inventory_movements_product_idx
  on public.inventory_stock_movements (product_id, created_at desc);
create index if not exists inventory_movements_workspace_idx
  on public.inventory_stock_movements (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Supplier extensions
-- ---------------------------------------------------------------------------

alter table public.suppliers
  add column if not exists finance_vendor_id uuid references public.finance_vendors(id) on delete set null,
  add column if not exists payment_terms text,
  add column if not exists tax_id text,
  add column if not exists website text,
  add column if not exists notes text,
  add column if not exists rating numeric(3,2),
  add column if not exists updated_at timestamptz default now() not null;

-- ---------------------------------------------------------------------------
-- Purchase order lifecycle
-- ---------------------------------------------------------------------------

alter table public.purchase_orders
  add column if not exists expense_id uuid references public.finance_expenses(id) on delete set null,
  add column if not exists notes text,
  add column if not exists received_amount numeric not null default 0,
  add column if not exists updated_at timestamptz default now() not null;

alter table public.purchase_orders drop constraint if exists purchase_orders_status_check;
alter table public.purchase_orders add constraint purchase_orders_status_check
  check (status in (
    'pending', 'approved', 'shipped', 'partially_delivered', 'delivered', 'cancelled'
  ));

create unique index if not exists purchase_orders_workspace_number_idx
  on public.purchase_orders (workspace_id, lower(order_number));

alter table public.finance_expenses
  add column if not exists purchase_order_id uuid references public.purchase_orders(id) on delete set null;

create table if not exists public.purchase_order_line_items (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  quantity_ordered numeric(12,2) not null default 0,
  quantity_received numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists po_line_items_po_idx on public.purchase_order_line_items (purchase_order_id);

-- Migrate legacy JSONB items into line items
insert into public.purchase_order_line_items (
  workspace_id, purchase_order_id, product_id, product_name, sku,
  quantity_ordered, quantity_received, unit_cost, line_total
)
select
  po.workspace_id,
  po.id,
  nullif(item->>'product_id', '')::uuid,
  coalesce(item->>'product_name', item->>'name', 'Item'),
  item->>'sku',
  coalesce((item->>'quantity')::numeric, 0),
  0,
  coalesce((item->>'unit_price')::numeric, 0),
  coalesce((item->>'quantity')::numeric, 0) * coalesce((item->>'unit_price')::numeric, 0)
from public.purchase_orders po
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(po.items) = 'array' then po.items else '[]'::jsonb end
) as item
where jsonb_array_length(case when jsonb_typeof(po.items) = 'array' then po.items else '[]'::jsonb end) > 0
  and not exists (
    select 1 from public.purchase_order_line_items li where li.purchase_order_id = po.id
  );

-- Goods receipts (partial deliveries)
create table if not exists public.goods_receipts (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
  receipt_number text not null,
  received_at timestamptz default now() not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.goods_receipt_lines (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  goods_receipt_id uuid references public.goods_receipts(id) on delete cascade not null,
  line_item_id uuid references public.purchase_order_line_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity_received numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz default now() not null
);

-- Supplier returns
create table if not exists public.supplier_returns (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  supplier_id uuid references public.suppliers(id) on delete cascade not null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  return_number text not null,
  quantity numeric(12,2) not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'completed', 'cancelled')),
  created_at timestamptz default now() not null
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.inventory_stock_movements enable row level security;
alter table public.purchase_order_line_items enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_lines enable row level security;
alter table public.supplier_returns enable row level security;

create policy "Inventory view movements" on public.inventory_stock_movements for select
  using (public.current_user_can(workspace_id, 'inventory', 'view') or public.is_workspace_owner(workspace_id));
create policy "Inventory manage movements" on public.inventory_stock_movements for all
  using (public.current_user_can(workspace_id, 'inventory', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'inventory', 'edit') or public.is_workspace_owner(workspace_id));

create policy "SC view po lines" on public.purchase_order_line_items for select
  using (public.current_user_can(workspace_id, 'supply_chain', 'view') or public.is_workspace_owner(workspace_id));
create policy "SC manage po lines" on public.purchase_order_line_items for all
  using (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id));

create policy "SC view receipts" on public.goods_receipts for select
  using (public.current_user_can(workspace_id, 'supply_chain', 'view') or public.is_workspace_owner(workspace_id));
create policy "SC manage receipts" on public.goods_receipts for all
  using (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id));

create policy "SC view receipt lines" on public.goods_receipt_lines for select
  using (public.current_user_can(workspace_id, 'supply_chain', 'view') or public.is_workspace_owner(workspace_id));
create policy "SC manage receipt lines" on public.goods_receipt_lines for all
  using (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id));

create policy "SC view returns" on public.supplier_returns for select
  using (public.current_user_can(workspace_id, 'supply_chain', 'view') or public.is_workspace_owner(workspace_id));
create policy "SC manage returns" on public.supplier_returns for all
  using (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id))
  with check (public.current_user_can(workspace_id, 'supply_chain', 'edit') or public.is_workspace_owner(workspace_id));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.refresh_product_stock_status(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_reorder integer;
begin
  select * into v_product from public.products where id = p_product_id;
  if not found then return; end if;

  v_reorder := coalesce(v_product.reorder_level, v_product.min_stock_level, 0);

  update public.products
  set
    status = case
      when quantity <= 0 then 'out_of_stock'
      when quantity <= v_reorder then 'low_stock'
      else 'in_stock'
    end,
    updated_at = now()
  where id = p_product_id;
end;
$$;

create or replace function public.record_inventory_movement(
  p_workspace_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_quantity_delta integer,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
  v_movement_id uuid;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'inventory', 'edit')
  ) then
    raise exception 'Permission denied';
  end if;

  select quantity into v_before from public.products
  where id = p_product_id and workspace_id = p_workspace_id
  for update;

  if not found then raise exception 'Product not found'; end if;

  v_after := v_before + p_quantity_delta;
  if v_after < 0 then raise exception 'Insufficient stock'; end if;

  update public.products set quantity = v_after, updated_at = now()
  where id = p_product_id;

  insert into public.inventory_stock_movements (
    workspace_id, product_id, movement_type, quantity_delta,
    quantity_before, quantity_after, unit_cost,
    reference_type, reference_id, notes, created_by
  ) values (
    p_workspace_id, p_product_id, p_movement_type, p_quantity_delta,
    v_before, v_after, p_unit_cost,
    p_reference_type, p_reference_id, p_notes, auth.uid()
  ) returning id into v_movement_id;

  perform public.refresh_product_stock_status(p_product_id);
  return v_movement_id;
end;
$$;

create or replace function public.ensure_supplier_finance_vendor(p_supplier_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.suppliers%rowtype;
  v_vendor_id uuid;
begin
  select * into v_supplier from public.suppliers where id = p_supplier_id;
  if not found then raise exception 'Supplier not found'; end if;

  if v_supplier.finance_vendor_id is not null then
    return v_supplier.finance_vendor_id;
  end if;

  insert into public.finance_vendors (workspace_id, name, email, phone, notes)
  values (v_supplier.workspace_id, v_supplier.name, v_supplier.email, v_supplier.phone, v_supplier.notes)
  returning id into v_vendor_id;

  update public.suppliers set finance_vendor_id = v_vendor_id, updated_at = now()
  where id = p_supplier_id;

  return v_vendor_id;
end;
$$;

create or replace function public.approve_purchase_order(p_workspace_id uuid, p_po_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_vendor_id uuid;
  v_expense_id uuid;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'supply_chain', 'approve')
    or public.current_user_can(p_workspace_id, 'supply_chain', 'edit')
  ) then
    raise exception 'Permission denied';
  end if;

  select * into v_po from public.purchase_orders
  where id = p_po_id and workspace_id = p_workspace_id for update;

  if not found then raise exception 'Purchase order not found'; end if;
  if v_po.status not in ('pending') then raise exception 'PO cannot be approved from status %', v_po.status; end if;

  v_vendor_id := public.ensure_supplier_finance_vendor(v_po.supplier_id);

  if v_po.expense_id is null then
    insert into public.finance_expenses (
      workspace_id, vendor_id, supplier_id, purchase_order_id,
      category, status, description, expense_date, due_date,
      amount, total_amount, reference
    ) values (
      p_workspace_id, v_vendor_id, v_po.supplier_id, v_po.id,
      'Procurement', 'pending',
      'Purchase order ' || v_po.order_number,
      v_po.order_date,
      coalesce(v_po.expected_delivery, v_po.order_date + 30),
      v_po.total_amount, v_po.total_amount,
      v_po.order_number
    ) returning id into v_expense_id;
  else
    v_expense_id := v_po.expense_id;
  end if;

  update public.purchase_orders
  set status = 'approved', expense_id = v_expense_id, updated_at = now()
  where id = p_po_id;

  return jsonb_build_object('expense_id', v_expense_id, 'status', 'approved');
end;
$$;

create or replace function public.receive_purchase_order_goods(
  p_workspace_id uuid,
  p_po_id uuid,
  p_lines jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_receipt_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_line_item public.purchase_order_line_items%rowtype;
  v_qty numeric;
  v_received_value numeric := 0;
  v_all_received boolean := true;
  v_any_received boolean := false;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'supply_chain', 'edit')
  ) then
    raise exception 'Permission denied';
  end if;

  select * into v_po from public.purchase_orders
  where id = p_po_id and workspace_id = p_workspace_id for update;

  if not found then raise exception 'Purchase order not found'; end if;
  if v_po.status not in ('approved', 'shipped', 'partially_delivered') then
    raise exception 'PO cannot receive goods in status %', v_po.status;
  end if;

  v_receipt_number := 'GRN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.goods_receipts (workspace_id, purchase_order_id, receipt_number, notes, created_by)
  values (p_workspace_id, p_po_id, v_receipt_number, p_notes, auth.uid())
  returning id into v_receipt_id;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_qty := coalesce((v_line->>'quantity_received')::numeric, 0);
    if v_qty <= 0 then continue; end if;

    select * into v_line_item from public.purchase_order_line_items
    where id = (v_line->>'line_item_id')::uuid
      and purchase_order_id = p_po_id
      and workspace_id = p_workspace_id
    for update;

    if not found then continue; end if;

    if v_line_item.quantity_received + v_qty > v_line_item.quantity_ordered then
      raise exception 'Receive quantity exceeds ordered for %', v_line_item.product_name;
    end if;

    update public.purchase_order_line_items
    set quantity_received = quantity_received + v_qty
    where id = v_line_item.id;

    insert into public.goods_receipt_lines (
      workspace_id, goods_receipt_id, line_item_id, product_id, product_name, quantity_received, unit_cost
    ) values (
      p_workspace_id, v_receipt_id, v_line_item.id, v_line_item.product_id,
      v_line_item.product_name, v_qty, v_line_item.unit_cost
    );

    if v_line_item.product_id is not null then
      perform public.record_inventory_movement(
        p_workspace_id,
        v_line_item.product_id,
        'purchase_receipt',
        v_qty::integer,
        v_line_item.unit_cost,
        'goods_receipt',
        v_receipt_id,
        'Received from PO ' || v_po.order_number
      );
    end if;

    v_received_value := v_received_value + (v_qty * v_line_item.unit_cost);
    v_any_received := true;
  end loop;

  if not v_any_received then raise exception 'No lines received'; end if;

  select not exists (
    select 1 from public.purchase_order_line_items
    where purchase_order_id = p_po_id and quantity_received < quantity_ordered
  ) into v_all_received;

  update public.purchase_orders
  set
    received_amount = received_amount + v_received_value,
    status = case when v_all_received then 'delivered' else 'partially_delivered' end,
    updated_at = now()
  where id = p_po_id;

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'status', case when v_all_received then 'delivered' else 'partially_delivered' end,
    'received_value', v_received_value
  );
end;
$$;

create or replace function public.get_inventory_dashboard_stats(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'inventory', 'view')
  ) then
    raise exception 'Permission denied';
  end if;

  return jsonb_build_object(
    'products', (select count(*) from public.products where workspace_id = p_workspace_id),
    'total_units', (select coalesce(sum(quantity), 0) from public.products where workspace_id = p_workspace_id),
    'stock_value', (select coalesce(sum(quantity * cost_price), 0) from public.products where workspace_id = p_workspace_id),
    'low_stock', (select count(*) from public.products where workspace_id = p_workspace_id and status = 'low_stock'),
    'out_of_stock', (select count(*) from public.products where workspace_id = p_workspace_id and status = 'out_of_stock'),
    'movements_today', (
      select count(*) from public.inventory_stock_movements
      where workspace_id = p_workspace_id and created_at::date = current_date
    )
  );
end;
$$;

create or replace function public.get_supply_chain_dashboard_stats(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'supply_chain', 'view')
  ) then
    raise exception 'Permission denied';
  end if;

  return jsonb_build_object(
    'suppliers', (select count(*) from public.suppliers where workspace_id = p_workspace_id),
    'active_suppliers', (select count(*) from public.suppliers where workspace_id = p_workspace_id and status = 'active'),
    'open_orders', (
      select count(*) from public.purchase_orders
      where workspace_id = p_workspace_id and status in ('pending', 'approved', 'shipped', 'partially_delivered')
    ),
    'pending_orders', (select count(*) from public.purchase_orders where workspace_id = p_workspace_id and status = 'pending'),
    'delayed_orders', (
      select count(*) from public.purchase_orders
      where workspace_id = p_workspace_id
        and status in ('approved', 'shipped', 'partially_delivered')
        and expected_delivery is not null
        and expected_delivery < current_date
    ),
    'total_spend', (
      select coalesce(sum(total_amount), 0) from public.purchase_orders
      where workspace_id = p_workspace_id and status not in ('cancelled')
    ),
    'received_value', (
      select coalesce(sum(received_amount), 0) from public.purchase_orders where workspace_id = p_workspace_id
    )
  );
end;
$$;

grant execute on function public.refresh_product_stock_status(uuid) to authenticated;
grant execute on function public.record_inventory_movement(uuid, uuid, text, integer, numeric, text, uuid, text) to authenticated;
grant execute on function public.ensure_supplier_finance_vendor(uuid) to authenticated;
grant execute on function public.approve_purchase_order(uuid, uuid) to authenticated;
grant execute on function public.receive_purchase_order_goods(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.get_inventory_dashboard_stats(uuid) to authenticated;
grant execute on function public.get_supply_chain_dashboard_stats(uuid) to authenticated;
