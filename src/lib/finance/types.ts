import type { InvoiceStatus, ExpenseStatus, PaymentStatus, RefundStatus, ReconciliationStatus, PaymentProvider } from '@/lib/finance/constants'

export interface FinanceVendor {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  tax_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FinanceInvoice {
  id: string
  workspace_id: string
  invoice_number: string
  customer_id: string | null
  deal_id: string | null
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  currency: string
  subtotal: number
  tax_amount: number
  fee_amount: number
  total_amount: number
  amount_paid: number
  notes: string | null
  attachment_urls: string[]
  stripe_invoice_id: string | null
  razorpay_invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface FinanceInvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  amount: number
  position: number
}

export interface FinanceExpense {
  id: string
  workspace_id: string
  vendor_id: string | null
  supplier_id: string | null
  category: string
  status: ExpenseStatus
  description: string
  expense_date: string
  due_date: string | null
  currency: string
  amount: number
  tax_amount: number
  fee_amount: number
  total_amount: number
  amount_paid: number
  paid_at: string | null
  reference: string | null
  notes: string | null
  attachment_urls: string[]
  created_at: string
  updated_at: string
}

export interface FinancePayment {
  id: string
  workspace_id: string
  direction: 'inbound' | 'outbound'
  status: PaymentStatus
  amount: number
  fee_amount: number
  tax_amount: number
  net_amount: number
  currency: string
  paid_at: string | null
  customer_id: string | null
  deal_id: string | null
  invoice_id: string | null
  expense_id: string | null
  vendor_id: string | null
  payment_method: string | null
  provider: PaymentProvider
  provider_payment_id: string | null
  provider_charge_id: string | null
  provider_order_id: string | null
  provider_customer_id: string | null
  provider_settlement_id: string | null
  provider_utr: string | null
  failure_code: string | null
  failure_message: string | null
  metadata: Record<string, unknown>
  attachment_urls: string[]
  created_at: string
  updated_at: string
}

export interface FinanceRefund {
  id: string
  workspace_id: string
  payment_id: string
  amount: number
  status: RefundStatus
  reason: string | null
  provider: PaymentProvider
  provider_refund_id: string | null
  refunded_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FinanceReconciliation {
  id: string
  workspace_id: string
  provider: PaymentProvider
  period_start: string
  period_end: string
  status: ReconciliationStatus
  expected_amount: number
  actual_amount: number
  fee_total: number
  tax_total: number
  settlement_id: string | null
  settlement_utr: string | null
  notes: string | null
  reconciled_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentProviderStatus {
  connected: boolean
  accountMode?: string | null
  publishableKey?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  lastSyncStatus?: string
  lastSyncError?: string | null
  lastWebhookAt?: string | null
  webhookStatus?: string
  webhookLastError?: string | null
}

export interface FinanceIntegrationStatus {
  stripe: PaymentProviderStatus
  razorpay: PaymentProviderStatus
}

export interface FinanceReportSummary {
  revenue: number
  expenses: number
  profit: number
  outstandingReceivables: number
  outstandingPayables: number
  cashIn: number
  cashOut: number
  netCashFlow: number
  refunds: number
  gatewayFees: number
  gatewayTaxes: number
  failedPayments: number
}
