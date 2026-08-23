import type { FinanceExpense, FinanceInvoice, FinancePayment, FinanceRefund } from '@/lib/finance/types'
import type { Transaction } from '@/lib/types'
import type { FinanceReportSummary } from '@/lib/finance/types'

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0)
}

export function computeFinanceReport(input: {
  transactions: Transaction[]
  invoices: FinanceInvoice[]
  expenses: FinanceExpense[]
  payments: FinancePayment[]
  refunds: FinanceRefund[]
}): FinanceReportSummary {
  const revenue = sum(
    input.transactions.filter((t) => t.type === 'revenue').map((t) => Number(t.amount))
  )
  const expenses = sum(
    input.transactions.filter((t) => t.type === 'expense').map((t) => Number(t.amount))
  )

  const outstandingReceivables = sum(
    input.invoices
      .filter((i) => !['paid', 'void', 'cancelled'].includes(i.status))
      .map((i) => Math.max(0, Number(i.total_amount) - Number(i.amount_paid)))
  )

  const outstandingPayables = sum(
    input.expenses
      .filter((e) => !['paid', 'void'].includes(e.status))
      .map((e) => Math.max(0, Number(e.total_amount) - Number(e.amount_paid)))
  )

  const succeededInbound = input.payments.filter(
    (p) => p.direction === 'inbound' && p.status === 'succeeded'
  )
  const succeededOutbound = input.payments.filter(
    (p) => p.direction === 'outbound' && p.status === 'succeeded'
  )

  const cashIn = sum(succeededInbound.map((p) => Number(p.net_amount || p.amount)))
  const cashOut = sum(succeededOutbound.map((p) => Number(p.net_amount || p.amount)))

  const gatewayFees = sum(input.payments.map((p) => Number(p.fee_amount)))
  const gatewayTaxes = sum(input.payments.map((p) => Number(p.tax_amount)))

  const refunds = sum(
    input.refunds.filter((r) => r.status === 'succeeded').map((r) => Number(r.amount))
  )

  const failedPayments = input.payments.filter((p) => p.status === 'failed').length

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    outstandingReceivables,
    outstandingPayables,
    cashIn,
    cashOut,
    netCashFlow: cashIn - cashOut,
    refunds,
    gatewayFees,
    gatewayTaxes,
    failedPayments,
  }
}

export function deriveInvoiceStatus(invoice: Pick<FinanceInvoice, 'total_amount' | 'amount_paid' | 'due_date' | 'status'>): FinanceInvoice['status'] {
  if (['void', 'cancelled', 'draft'].includes(invoice.status)) return invoice.status
  const total = Number(invoice.total_amount)
  const paid = Number(invoice.amount_paid)
  if (paid >= total && total > 0) return 'paid'
  if (paid > 0) return 'partial'
  if (invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'draft') return 'overdue'
  return invoice.status === 'draft' ? 'draft' : 'sent'
}

export function nextInvoiceNumber(existing: string[]): string {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}
