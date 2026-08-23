export interface Profile {
  id: string
  email: string
  full_name: string
  business_name: string
  avatar_url: string | null
  onboarding_completed: boolean
  active_workspace_id?: string | null
  created_at: string
}

export interface WorkspaceConfig {
  id: string
  user_id: string
  business_type: string
  modules: {
    dashboard: boolean
    hr: boolean
    inventory: boolean
    finance: boolean
    supply_chain: boolean
    crm: boolean
  }
  dashboard_metrics: DashboardMetric[]
  departments: string[]
  shifts: Shift[] | null
  product_categories: string[] | null
  service_types: string[] | null
  roles: RoleSuggestion[]
  setup_checklist: ChecklistItem[]
  created_at: string
}

export interface DashboardMetric {
  id: string
  name: string
  description: string
  type: 'number' | 'currency' | 'percentage' | 'ratio'
  visualization: 'line_chart' | 'bar_chart' | 'area_chart' | 'stat_card' | 'pie_chart' | 'gauge'
  comparison_period: 'day' | 'week' | 'month' | 'year'
  category: 'revenue' | 'operations' | 'hr' | 'inventory' | 'customers' | 'growth' | 'finance' | 'supply_chain'
}

export interface Shift {
  name: string
  start: string
  end: string
}

export interface RoleSuggestion {
  name: string
  description?: string
  is_system?: boolean
  permissions: import('@/lib/rbac/types').ModulePermissionMap
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  module: string
  priority: number
  completed?: boolean
}

export interface Role {
  id: string
  workspace_id: string
  name: string
  description?: string | null
  is_system?: boolean
  permissions: import('@/lib/rbac/types').ModulePermissionMap
  created_at: string
}

export interface Employee {
  id: string
  workspace_id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string | null
  role_id: string
  department: string
  department_id?: string | null
  designation_id?: string | null
  manager_id?: string | null
  employee_code?: string | null
  job_title?: string | null
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern'
  work_location?: string | null
  date_of_birth?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  lifecycle_stage?: 'onboarding' | 'active' | 'on_leave' | 'offboarding' | 'inactive'
  offboarding_date?: string | null
  notes?: string | null
  status: 'active' | 'inactive' | 'on_leave' | 'invited' | 'onboarding' | 'offboarding'
  hire_date: string
  salary: number | null
  invite_token?: string | null
  invited_at?: string | null
  accepted_at?: string | null
  created_at: string
  updated_at?: string
}

export interface Product {
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

export interface Transaction {
  id: string
  workspace_id: string
  type: 'revenue' | 'expense'
  category: string
  amount: number
  description: string
  date: string
  reference: string | null
  created_at: string
  customer_id?: string | null
  deal_id?: string | null
  invoice_id?: string | null
  payment_id?: string | null
  expense_id?: string | null
  vendor_id?: string | null
  tax_amount?: number
  fee_amount?: number
  net_amount?: number | null
  currency?: string
  status?: string
  source?: string
  attachment_urls?: string[]
  updated_at?: string
}

export interface Supplier {
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

export interface PurchaseOrder {
  id: string
  workspace_id: string
  supplier_id: string
  order_number: string
  status: 'pending' | 'approved' | 'shipped' | 'partially_delivered' | 'delivered' | 'cancelled'
  total_amount: number
  received_amount?: number
  order_date: string
  expected_delivery: string | null
  notes?: string | null
  expense_id?: string | null
  items: PurchaseOrderItem[]
  created_at: string
  updated_at?: string | null
}

export interface PurchaseOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export interface Customer {
  id: string
  workspace_id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  status: 'active' | 'inactive' | 'lead'
  total_spent: number
  last_interaction: string | null
  notes: string | null
  assigned_to: string | null
  source: string | null
  next_follow_up: string | null
  ghl_contact_id?: string | null
  ghl_last_synced_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface Lead {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  lead_score: number
  estimated_value: number
  assigned_to: string | null
  converted_customer_id: string | null
  converted_deal_id: string | null
  notes: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  ghl_contact_id?: string | null
  ghl_last_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface CrmPipelineStage {
  id: string
  workspace_id: string
  name: string
  position: number
  probability_default: number
  is_closed_won: boolean
  is_closed_lost: boolean
  ghl_pipeline_stage_id?: string | null
  created_at: string
}

export interface Deal {
  id: string
  workspace_id: string
  name: string
  customer_id: string | null
  lead_id: string | null
  value: number
  stage_id: string
  probability: number
  expected_close_date: string | null
  assigned_to: string | null
  status: 'open' | 'won' | 'lost'
  product_ids: string[]
  notes: string | null
  ghl_opportunity_id?: string | null
  ghl_last_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface CrmActivity {
  id: string
  workspace_id: string
  type: 'call' | 'meeting' | 'task' | 'follow_up' | 'email' | 'demo' | 'other'
  title: string
  description: string | null
  customer_id: string | null
  lead_id: string | null
  deal_id: string | null
  assigned_to: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed' | 'cancelled'
  due_at: string | null
  completed_at: string | null
  ghl_task_id?: string | null
  ghl_last_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface GhlIntegrationStatus {
  connected: boolean
  locationId: string | null
  locationName: string | null
  pipelineId: string | null
  connectedAt: string | null
  lastSyncAt: string | null
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncError: string | null
}

export interface CrmNote {
  id: string
  workspace_id: string
  customer_id: string | null
  lead_id: string | null
  deal_id: string | null
  created_by: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CrmInteraction {
  id: string
  workspace_id: string
  event_type: string
  title: string
  description: string | null
  customer_id: string | null
  lead_id: string | null
  deal_id: string | null
  activity_id: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface CrmTag {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
}

export interface Attendance {
  id: string
  workspace_id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'late' | 'half_day'
  work_hours_minutes?: number | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

export interface LeaveRequest {
  id: string
  workspace_id: string
  employee_id: string
  type: string
  leave_type_id?: string | null
  start_date: string
  end_date: string
  days_count?: number | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at?: string
}

export type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all'
