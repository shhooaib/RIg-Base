export const SUPPLY_CHAIN_QUERY_KEYS = {
  suppliers: 'suppliers',
  purchaseOrders: 'purchase-orders',
  poLineItems: 'po-line-items',
  goodsReceipts: 'goods-receipts',
  supplierReturns: 'supplier-returns',
  dashboard: 'supply-chain-dashboard',
} as const

export const PO_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'partially_delivered', label: 'Partially delivered' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PO_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-blue-500/10 text-blue-500',
  shipped: 'bg-accent/10 text-accent',
  partially_delivered: 'bg-orange-500/10 text-orange-500',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
}
