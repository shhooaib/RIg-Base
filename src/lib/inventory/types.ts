export interface InventoryProduct {
  id: string
  workspace_id: string
  name: string
  sku: string
  category: string
  description?: string | null
  quantity: number
  unit_price: number
  cost_price: number
  min_stock_level: number
  reorder_level?: number | null
  unit?: string | null
  location?: string | null
  barcode?: string | null
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  created_at: string
  updated_at?: string | null
}

export interface StockMovement {
  id: string
  workspace_id: string
  product_id: string
  movement_type: string
  quantity_delta: number
  quantity_before: number
  quantity_after: number
  unit_cost?: number | null
  reference_type?: string | null
  reference_id?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  product?: Pick<InventoryProduct, 'name' | 'sku'> | null
}

export interface InventoryDashboardStats {
  products: number
  total_units: number
  stock_value: number
  low_stock: number
  out_of_stock: number
  movements_today: number
}
