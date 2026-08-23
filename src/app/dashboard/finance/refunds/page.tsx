'use client'

import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { FinanceStatusBadge, formatMoney, formatWhen } from '@/components/finance/finance-status-badge'
import { useFinanceRefunds } from '@/hooks/use-finance-data'
import type { FinanceRefund, FinancePayment } from '@/lib/finance/types'

type RefundRow = FinanceRefund & { finance_payments?: Pick<FinancePayment, 'provider_payment_id' | 'currency'> | null }

export default function RefundsPage() {
  const { data: refunds = [] } = useFinanceRefunds()
  const rows = refunds as RefundRow[]
  const total = rows.filter((r) => r.status === 'succeeded').reduce((s, r) => s + Number(r.amount), 0)

  const columns = [
    { key: 'date', header: 'Date', render: (r: RefundRow) => formatWhen(r.refunded_at ?? r.created_at) },
    { key: 'provider', header: 'Provider', render: (r: RefundRow) => r.provider },
    { key: 'status', header: 'Status', render: (r: RefundRow) => <FinanceStatusBadge status={r.status} kind="payment" /> },
    { key: 'amount', header: 'Amount', render: (r: RefundRow) => formatMoney(Number(r.amount), r.finance_payments?.currency ?? 'USD') },
    { key: 'payment', header: 'Payment ID', render: (r: RefundRow) => <span className="font-mono text-xs">{r.finance_payments?.provider_payment_id ?? '—'}</span> },
    { key: 'refundId', header: 'Refund ID', render: (r: RefundRow) => <span className="font-mono text-xs">{r.provider_refund_id ?? '—'}</span> },
    { key: 'reason', header: 'Reason', render: (r: RefundRow) => r.reason ?? '—' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold">Refunds</h2>
          <p className="text-sm text-text-secondary mt-1">Processed refunds — ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total</p>
        </div>
      </div>
      <FilterableDataTable columns={columns} data={rows} searchPlaceholder="Search refunds…" pageSize={10} rowKey={(r) => r.id} />
    </>
  )
}
