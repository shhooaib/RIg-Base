'use client'

import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { FinanceStatusBadge, formatMoney, formatWhen } from '@/components/finance/finance-status-badge'
import { useFinancePayments } from '@/hooks/use-finance-data'
import type { FinancePayment } from '@/lib/finance/types'
import { StatMoney } from '@/components/ui/stat-money'

export default function CashFlowPage() {
  const { data: payments = [] } = useFinancePayments()
  const succeeded = payments.filter((p) => p.status === 'succeeded')
  const cashIn = succeeded.filter((p) => p.direction === 'inbound').reduce((s, p) => s + Number(p.net_amount || p.amount), 0)
  const cashOut = succeeded.filter((p) => p.direction === 'outbound').reduce((s, p) => s + Number(p.net_amount || p.amount), 0)

  const columns = [
    { key: 'date', header: 'Date', render: (p: FinancePayment) => formatWhen(p.paid_at ?? p.created_at) },
    { key: 'direction', header: 'Flow', render: (p: FinancePayment) => <span className={p.direction === 'inbound' ? 'text-revenue' : 'text-danger'}>{p.direction === 'inbound' ? 'In' : 'Out'}</span> },
    { key: 'provider', header: 'Source', render: (p: FinancePayment) => p.provider },
    { key: 'status', header: 'Status', render: (p: FinancePayment) => <FinanceStatusBadge status={p.status} kind="payment" /> },
    { key: 'gross', header: 'Gross', render: (p: FinancePayment) => formatMoney(Number(p.amount), p.currency) },
    { key: 'fees', header: 'Fees', render: (p: FinancePayment) => formatMoney(Number(p.fee_amount), p.currency) },
    { key: 'net', header: 'Net', render: (p: FinancePayment) => formatMoney(Number(p.net_amount), p.currency) },
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Cash Flow</h2><p className="text-sm text-text-secondary mt-1">Inbound and outbound cash movement after gateway fees</p></div>
      </div>
      <div className="summary-row mb-6">
        <div className="summary-stat"><p className="stat-label">Cash in</p><StatMoney value={cashIn} className="text-revenue" /></div>
        <div className="summary-stat"><p className="stat-label">Cash out</p><StatMoney value={cashOut} className="text-danger" /></div>
        <div className="summary-stat"><p className="stat-label">Net cash flow</p><StatMoney value={cashIn - cashOut} /></div>
      </div>
      <FilterableDataTable columns={columns} data={payments} searchPlaceholder="Search cash flow…" pageSize={10} rowKey={(p) => p.id} />
    </>
  )
}
