import type { SupabaseClient } from '@supabase/supabase-js'

export const DEMO_SKU_PREFIX = 'DEMO-'
export const DEMO_PO_PREFIX = 'DEMO-PO-'

export type SeedDemoSummary = {
  alreadyExists: boolean
  products: { id: string; name: string; sku: string }[]
  suppliers: { id: string; name: string }[]
  purchaseOrders: {
    id: string
    order_number: string
    status: string
    expense_id?: string | null
    link: string
  }[]
  movementsRecorded: number
  message: string
}

function isoDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

async function findExistingDemo(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('order_number', `${DEMO_PO_PREFIX}001`)
    .maybeSingle()
  return !!data
}

async function upsertDemoProduct(
  supabase: SupabaseClient,
  workspaceId: string,
  product: {
    sku: string
    name: string
    category: string
    description: string
    quantity: number
    unit_price: number
    cost_price: number
    min_stock_level: number
    reorder_level: number
    unit: string
    location: string
  }
) {
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('workspace_id', workspaceId)
    .eq('sku', product.sku)
    .maybeSingle()

  if (existing) return existing

  const status =
    product.quantity === 0
      ? 'out_of_stock'
      : product.quantity <= product.reorder_level
        ? 'low_stock'
        : 'in_stock'

  const { data, error } = await supabase
    .from('products')
    .insert({
      workspace_id: workspaceId,
      ...product,
      status,
    })
    .select('id, name, sku')
    .single()

  if (error) throw new Error(`Product ${product.sku}: ${error.message}`)
  return data
}

async function upsertDemoSupplier(
  supabase: SupabaseClient,
  workspaceId: string,
  supplier: {
    name: string
    contact_person: string
    email: string
    phone: string
    address: string
    payment_terms: string
    rating: number
    notes: string
  }
) {
  const { data: existing } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('name', supplier.name)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      workspace_id: workspaceId,
      ...supplier,
      status: 'active',
    })
    .select('id, name')
    .single()

  if (error) throw new Error(`Supplier ${supplier.name}: ${error.message}`)
  return data
}

async function createDemoPurchaseOrder(
  supabase: SupabaseClient,
  workspaceId: string,
  po: {
    supplier_id: string
    order_number: string
    order_date: string
    expected_delivery: string
    notes: string
    total_amount: number
  },
  lines: {
    product_id: string
    product_name: string
    sku: string
    quantity_ordered: number
    unit_cost: number
  }[]
) {
  const { data: poRow, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      workspace_id: workspaceId,
      supplier_id: po.supplier_id,
      order_number: po.order_number,
      order_date: po.order_date,
      expected_delivery: po.expected_delivery,
      notes: po.notes,
      total_amount: po.total_amount,
      status: 'pending',
      items: [],
    })
    .select('id, order_number, status, expense_id')
    .single()

  if (poError) throw new Error(`PO ${po.order_number}: ${poError.message}`)

  const { data: lineRows, error: lineError } = await supabase
    .from('purchase_order_line_items')
    .insert(
      lines.map((l) => ({
        workspace_id: workspaceId,
        purchase_order_id: poRow.id,
        product_id: l.product_id,
        product_name: l.product_name,
        sku: l.sku,
        quantity_ordered: l.quantity_ordered,
        quantity_received: 0,
        unit_cost: l.unit_cost,
        line_total: l.quantity_ordered * l.unit_cost,
      }))
    )
    .select('id, product_name, quantity_ordered')

  if (lineError) throw new Error(`PO lines ${po.order_number}: ${lineError.message}`)

  return { po: poRow, lines: lineRows ?? [] }
}

export async function seedInventorySupplyChainDemo(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<SeedDemoSummary> {
  if (await findExistingDemo(supabase, workspaceId)) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('workspace_id', workspaceId)
      .like('sku', `${DEMO_SKU_PREFIX}%`)

    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .like('name', 'Demo %')

    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('id, order_number, status, expense_id')
      .eq('workspace_id', workspaceId)
      .like('order_number', `${DEMO_PO_PREFIX}%`)
      .order('order_number')

    return {
      alreadyExists: true,
      products: products ?? [],
      suppliers: suppliers ?? [],
      purchaseOrders: (orders ?? []).map((o) => ({
        ...o,
        link: `/dashboard/supply-chain/orders/${o.id}`,
      })),
      movementsRecorded: 0,
      message: 'Demo data is already loaded for this workspace.',
    }
  }

  const tomato = await upsertDemoProduct(supabase, workspaceId, {
    sku: `${DEMO_SKU_PREFIX}TOM-001`,
    name: 'Demo Organic Tomatoes',
    category: 'Produce',
    description: 'Sample product for inventory & procurement demo',
    quantity: 25,
    unit_price: 4.99,
    cost_price: 2.5,
    min_stock_level: 20,
    reorder_level: 20,
    unit: 'kg',
    location: 'Cold storage A1',
  })

  const oil = await upsertDemoProduct(supabase, workspaceId, {
    sku: `${DEMO_SKU_PREFIX}OIL-001`,
    name: 'Demo Olive Oil 1L',
    category: 'Pantry',
    description: 'Low-stock example — reorder recommended',
    quantity: 6,
    unit_price: 14.99,
    cost_price: 8,
    min_stock_level: 15,
    reorder_level: 15,
    unit: 'bottle',
    location: 'Shelf B3',
  })

  const napkins = await upsertDemoProduct(supabase, workspaceId, {
    sku: `${DEMO_SKU_PREFIX}NAP-001`,
    name: 'Demo Paper Napkins (500pk)',
    category: 'Supplies',
    description: 'Out-of-stock example — on order from supplier',
    quantity: 0,
    unit_price: 6.99,
    cost_price: 0.5,
    min_stock_level: 50,
    reorder_level: 50,
    unit: 'pack',
    location: 'Dry storage C2',
  })

  const freshFarms = await upsertDemoSupplier(supabase, workspaceId, {
    name: 'Demo Fresh Farms Co',
    contact_person: 'Maria Chen',
    email: 'maria@demofreshfarms.example',
    phone: '+1 555-0101',
    address: '120 Orchard Lane, Fresno, CA',
    payment_terms: 'Net 30',
    rating: 4.5,
    notes: 'Primary produce vendor (demo data)',
  })

  const packRight = await upsertDemoSupplier(supabase, workspaceId, {
    name: 'Demo PackRight Supplies',
    contact_person: 'James Ortiz',
    email: 'james@demopackright.example',
    phone: '+1 555-0102',
    address: '88 Industrial Park, Austin, TX',
    payment_terms: 'Net 15',
    rating: 4.2,
    notes: 'Packaging & disposables (demo data)',
  })

  let movementsRecorded = 0

  const { error: openingMoveError } = await supabase.rpc('record_inventory_movement', {
    p_workspace_id: workspaceId,
    p_product_id: tomato.id,
    p_movement_type: 'stock_in',
    p_quantity_delta: 5,
    p_unit_cost: 2.5,
    p_reference_type: 'demo_seed',
    p_reference_id: null,
    p_notes: 'Opening demo stock adjustment',
  })
  if (!openingMoveError) movementsRecorded++

  // PO 001: approved + partially received → Finance payable + inventory updated
  const po1Total = 50 * 2.5 + 20 * 8
  const { po: po1, lines: po1Lines } = await createDemoPurchaseOrder(
    supabase,
    workspaceId,
    {
      supplier_id: freshFarms.id,
      order_number: `${DEMO_PO_PREFIX}001`,
      order_date: isoDate(-5),
      expected_delivery: isoDate(2),
      notes: 'Demo PO — approved with partial goods receipt (links Finance + Inventory)',
      total_amount: po1Total,
    },
    [
      { product_id: tomato.id, product_name: tomato.name, sku: tomato.sku, quantity_ordered: 50, unit_cost: 2.5 },
      { product_id: oil.id, product_name: oil.name, sku: oil.sku, quantity_ordered: 20, unit_cost: 8 },
    ]
  )

  const { error: approveError } = await supabase.rpc('approve_purchase_order', {
    p_workspace_id: workspaceId,
    p_po_id: po1.id,
  })
  if (approveError) {
    throw new Error(
      `Could not approve demo PO (apply migration 023): ${approveError.message}`
    )
  }

  const tomatoLine = po1Lines.find((l) => l.product_name === tomato.name)
  const oilLine = po1Lines.find((l) => l.product_name === oil.name)

  const { error: receiveError } = await supabase.rpc('receive_purchase_order_goods', {
    p_workspace_id: workspaceId,
    p_po_id: po1.id,
    p_lines: [
      { line_item_id: tomatoLine?.id, quantity_received: 30 },
      { line_item_id: oilLine?.id, quantity_received: 10 },
    ],
    p_notes: 'Partial demo delivery — 30 kg tomatoes, 10 bottles oil',
  })
  if (receiveError) {
    throw new Error(`Could not receive demo goods: ${receiveError.message}`)
  }
  movementsRecorded += 2

  // PO 002: pending — user can approve & receive from UI
  const po2Total = 100 * 0.5
  const { po: po2 } = await createDemoPurchaseOrder(
    supabase,
    workspaceId,
    {
      supplier_id: packRight.id,
      order_number: `${DEMO_PO_PREFIX}002`,
      order_date: isoDate(-1),
      expected_delivery: isoDate(7),
      notes: 'Demo PO — pending approval (try Approve & create payable)',
      total_amount: po2Total,
    },
    [
      { product_id: napkins.id, product_name: napkins.name, sku: napkins.sku, quantity_ordered: 100, unit_cost: 0.5 },
    ]
  )

  // PO 003: approved, awaiting receipt
  const po3Total = 15 * 8
  const { po: po3 } = await createDemoPurchaseOrder(
    supabase,
    workspaceId,
    {
      supplier_id: freshFarms.id,
      order_number: `${DEMO_PO_PREFIX}003`,
      order_date: isoDate(-3),
      expected_delivery: isoDate(-1),
      notes: 'Demo PO — approved & delayed (receive from Receiving page)',
      total_amount: po3Total,
    },
    [
      { product_id: oil.id, product_name: oil.name, sku: oil.sku, quantity_ordered: 15, unit_cost: 8 },
    ]
  )

  const { error: approve3Error } = await supabase.rpc('approve_purchase_order', {
    p_workspace_id: workspaceId,
    p_po_id: po3.id,
  })
  if (approve3Error) throw new Error(approve3Error.message)

  const { data: refreshedOrders } = await supabase
    .from('purchase_orders')
    .select('id, order_number, status, expense_id')
    .eq('workspace_id', workspaceId)
    .in('id', [po1.id, po2.id, po3.id])
    .order('order_number')

  return {
    alreadyExists: false,
    products: [tomato, oil, napkins],
    suppliers: [freshFarms, packRight],
    purchaseOrders: (refreshedOrders ?? []).map((o) => ({
      ...o,
      link: `/dashboard/supply-chain/orders/${o.id}`,
    })),
    movementsRecorded,
    message:
      'Demo data loaded: products, suppliers, purchase orders, a Finance payable, and inventory receipts are linked.',
  }
}

export const DEMO_SEED_QUERY_KEYS = [
  'products',
  'suppliers',
  'purchase-orders',
  'inventory-movements',
  'inventory-dashboard',
  'supply-chain-dashboard',
  'goods-receipts',
  'supplier-returns',
  'dashboard-metrics',
] as const
