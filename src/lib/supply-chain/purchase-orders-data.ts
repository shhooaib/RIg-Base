import type { SupabaseClient } from '@supabase/supabase-js'
import type { PurchaseOrderDetail, PurchaseOrderLineItem } from './types'

export async function fetchPurchaseOrders(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<PurchaseOrderDetail[]> {
  const { data: orders, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!orders?.length) return []

  const orderIds = orders.map((o) => o.id)
  const { data: lines, error: linesError } = await supabase
    .from('purchase_order_line_items')
    .select('*')
    .in('purchase_order_id', orderIds)

  if (linesError) throw linesError

  const linesByPo = (lines ?? []).reduce<Record<string, PurchaseOrderLineItem[]>>((acc, line) => {
    const poId = line.purchase_order_id
    if (!acc[poId]) acc[poId] = []
    acc[poId].push(line as PurchaseOrderLineItem)
    return acc
  }, {})

  return orders.map((o) => ({
    ...o,
    received_amount: Number(o.received_amount ?? 0),
    items: linesByPo[o.id] ?? [],
  })) as PurchaseOrderDetail[]
}

export async function fetchPurchaseOrder(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string
): Promise<PurchaseOrderDetail | null> {
  const orders = await fetchPurchaseOrders(supabase, workspaceId)
  return orders.find((o) => o.id === id) ?? null
}
