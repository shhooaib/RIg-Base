export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  cancelled: 'Cancelled',
}

export const EXPENSE_STATUSES = ['draft', 'pending', 'approved', 'paid', 'void'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  void: 'Void',
}

export const PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
}

export const REFUND_STATUSES = ['pending', 'succeeded', 'failed', 'cancelled'] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const RECONCILIATION_STATUSES = ['open', 'in_progress', 'reconciled', 'discrepancy'] as const
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number]

export const PAYMENT_PROVIDERS = ['manual', 'stripe', 'razorpay'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const FINANCE_QUERY_KEYS = {
  transactions: ['transactions'] as const,
  invoices: ['finance-invoices'] as const,
  expenses: ['finance-expenses'] as const,
  payments: ['finance-payments'] as const,
  refunds: ['finance-refunds'] as const,
  reconciliations: ['finance-reconciliations'] as const,
  vendors: ['finance-vendors'] as const,
  integrationStatus: ['finance-integration-status'] as const,
  reports: ['finance-reports'] as const,
  customers: ['customers'] as const,
}

export const FINANCE_WEBHOOK_PATHS = {
  stripe: '/api/webhooks/stripe',
  razorpay: '/api/webhooks/razorpay',
} as const
