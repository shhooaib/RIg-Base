'use client'

import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { FinanceStatusBadge, formatMoney } from '@/components/finance/finance-status-badge'
import { useFinanceInvoices } from '@/hooks/use-finance-data'
import type { FinanceInvoice } from '@/lib/finance/types'

export default function ReceivablesPage() {
  const { data: invoices = [] } = useFinanceInvoices()
  const open = invoices.filter((i) => !['paid', 'void', 'cancelled'].includes(i.status))

  const columns = [
    { key: 'number', header: 'Invoice #', render: (i: FinanceInvoice & { customers?: { name: string } | null }) => i.invoice_number },
    { key: 'customer', header: 'Customer', render: (i: FinanceInvoice & { customers?: { name: string } | null }) => i.customers?.name ?? '—' },
    { key: 'status', header: 'Status', render: (i: FinanceInvoice) => <FinanceStatusBadge status={i.status} kind="invoice" /> },
    { key: 'total', header: 'Total', render: (i: FinanceInvoice) => formatMoney(Number(i.total_amount), i.currency) },
    { key: 'paid', header: 'Paid', render: (i: FinanceInvoice) => formatMoney(Number(i.amount_paid), i.currency) },
    { key: 'outstanding', header: 'Outstanding', render: (i: FinanceInvoice) => formatMoney(Math.max(0, Number(i.total_amount) - Number(i.amount_paid)), i.currency) },
    { key: 'due', header: 'Due date', render: (i: FinanceInvoice) => i.due_date ?? '—' },
  ]

  const outstanding = open.reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.amount_paid)), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold">Accounts Receivable</h2>
          <p className="text-sm text-text-secondary mt-1">Outstanding customer invoices — ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} total due</p>
        </div>
      </div>
      <FilterableDataTable columns={columns} data={open} searchPlaceholder="Search receivables…" pageSize={10} rowKey={(i) => i.id} />
    </>
  )
}
