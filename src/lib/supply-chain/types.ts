export interface SupplyChainSupplier {
  id: string
  workspace_id: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string | null
  status: 'active' | 'inactive'
  finance_vendor_id?: string | null
  payment_terms?: string | null
  tax_id?: string | null
  website?: string | null
  notes?: string | null
  rating?: number | null
  created_at: string
  updated_at?: string | null
}

export interface PurchaseOrderLineItem {
  id: string
  workspace_id: string
  purchase_order_id: string
  product_id: string | null
  product_name: string
  sku?: string | null
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
  created_at: string
}

export interface PurchaseOrderDetail {
  id: string
  workspace_id: string
  supplier_id: string
  order_number: string
  status: 'pending' | 'approved' | 'shipped' | 'partially_delivered' | 'delivered' | 'cancelled'
  total_amount: number
  received_amount: number
  order_date: string
  expected_delivery: string | null
  notes?: string | null
  expense_id?: string | null
  items: PurchaseOrderLineItem[]
  created_at: string
  updated_at?: string | null
}

export interface GoodsReceipt {
  id: string
  workspace_id: string
  purchase_order_id: string
  receipt_number: string
  received_at: string
  notes?: string | null
  created_at: string
}

export interface SupplierReturn {
  id: string
  workspace_id: string
  supplier_id: string
  purchase_order_id?: string | null
  product_id?: string | null
  return_number: string
  quantity: number
  reason: string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  created_at: string
}

export interface SupplyChainDashboardStats {
  suppliers: number
  active_suppliers: number
  open_orders: number
  pending_orders: number
  delayed_orders: number
  total_spend: number
  received_value: number
}

export interface SupplierPerformance {
  supplier_id: string
  supplier_name: string
  order_count: number
  total_spend: number
  on_time_count: number
  delayed_count: number
  avg_rating?: number | null
}
