export const INVENTORY_QUERY_KEYS = {
  products: 'products',
  movements: 'inventory-movements',
  dashboard: 'inventory-dashboard',
} as const

export const MOVEMENT_TYPES = [
  { value: 'stock_in', label: 'Stock in' },
  { value: 'stock_out', label: 'Stock out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return_in', label: 'Return in' },
  { value: 'return_out', label: 'Return out' },
  { value: 'transfer', label: 'Transfer' },
] as const

export const PRODUCT_STATUSES = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
] as const
