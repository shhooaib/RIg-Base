import type { PurchaseOrderDetail, SupplyChainSupplier } from './types'

export function isDelayedOrder(po: Pick<PurchaseOrderDetail, 'status' | 'expected_delivery'>): boolean {
  if (!po.expected_delivery) return false
  if (!['approved', 'shipped', 'partially_delivered'].includes(po.status)) return false
  return po.expected_delivery < new Date().toISOString().split('T')[0]
}

export function computeSupplierPerformance(
  suppliers: SupplyChainSupplier[],
  orders: PurchaseOrderDetail[]
): import('./types').SupplierPerformance[] {
  const today = new Date().toISOString().split('T')[0]

  return suppliers.map((s) => {
    const supplierOrders = orders.filter((o) => o.supplier_id === s.id && o.status !== 'cancelled')
    const delivered = supplierOrders.filter((o) => o.status === 'delivered')
    const delayed = supplierOrders.filter(
      (o) =>
        o.expected_delivery &&
        o.expected_delivery < today &&
        ['approved', 'shipped', 'partially_delivered'].includes(o.status)
    )

    return {
      supplier_id: s.id,
      supplier_name: s.name,
      order_count: supplierOrders.length,
      total_spend: supplierOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      on_time_count: delivered.filter((o) => !o.expected_delivery || o.expected_delivery >= today).length,
      delayed_count: delayed.length,
      avg_rating: s.rating,
    }
  }).sort((a, b) => b.total_spend - a.total_spend)
}

export function pendingOrdersValue(orders: PurchaseOrderDetail[]): number {
  return orders
    .filter((o) => ['pending', 'approved', 'shipped', 'partially_delivered'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_amount) - Number(o.received_amount ?? 0), 0)
}
