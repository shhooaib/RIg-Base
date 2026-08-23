import {
  INVOICE_STATUS_LABELS,
  EXPENSE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type InvoiceStatus,
  type ExpenseStatus,
  type PaymentStatus,
} from '@/lib/finance/constants'

const VARIANTS: Record<string, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  sent: 'bg-accent/10 text-accent',
  partial: 'bg-warning/10 text-warning',
  paid: 'bg-success/10 text-success',
  overdue: 'bg-danger/10 text-danger',
  void: 'bg-bg-tertiary text-text-tertiary',
  cancelled: 'bg-bg-tertiary text-text-tertiary',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-accent/10 text-accent',
  processing: 'bg-accent/10 text-accent',
  succeeded: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  refunded: 'bg-bg-tertiary text-text-secondary',
  partially_refunded: 'bg-warning/10 text-warning',
  open: 'bg-warning/10 text-warning',
  in_progress: 'bg-accent/10 text-accent',
  reconciled: 'bg-success/10 text-success',
  discrepancy: 'bg-danger/10 text-danger',
}

export function FinanceStatusBadge({
  status,
  kind = 'payment',
}: {
  status: string
  kind?: 'invoice' | 'expense' | 'payment' | 'reconciliation'
}) {
  const label =
    kind === 'invoice'
      ? INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status
      : kind === 'expense'
        ? EXPENSE_STATUS_LABELS[status as ExpenseStatus] ?? status
        : kind === 'payment'
          ? PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status
          : status.replace(/_/g, ' ')

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${VARIANTS[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>
      {label}
    </span>
  )
}

export function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}
