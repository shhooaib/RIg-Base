'use client'

import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { FinanceStatusBadge, formatMoney } from '@/components/finance/finance-status-badge'
import { useFinanceExpenses } from '@/hooks/use-finance-data'
import type { FinanceExpense } from '@/lib/finance/types'

export default function PayablesPage() {
  const { data: expenses = [] } = useFinanceExpenses()
  const open = expenses.filter((e) => !['paid', 'void'].includes(e.status))

  const columns = [
    { key: 'date', header: 'Date', render: (e: FinanceExpense & { finance_vendors?: { name: string } | null }) => e.expense_date },
    { key: 'vendor', header: 'Vendor', render: (e: FinanceExpense & { finance_vendors?: { name: string } | null }) => e.finance_vendors?.name ?? '—' },
    { key: 'desc', header: 'Description', render: (e: FinanceExpense) => e.description },
    { key: 'status', header: 'Status', render: (e: FinanceExpense) => <FinanceStatusBadge status={e.status} kind="expense" /> },
    { key: 'total', header: 'Total', render: (e: FinanceExpense) => formatMoney(Number(e.total_amount), e.currency) },
    { key: 'paid', header: 'Paid', render: (e: FinanceExpense) => formatMoney(Number(e.amount_paid), e.currency) },
    { key: 'outstanding', header: 'Outstanding', render: (e: FinanceExpense) => formatMoney(Math.max(0, Number(e.total_amount) - Number(e.amount_paid)), e.currency) },
    { key: 'due', header: 'Due date', render: (e: FinanceExpense) => e.due_date ?? '—' },
  ]

  const outstanding = open.reduce((s, e) => s + Math.max(0, Number(e.total_amount) - Number(e.amount_paid)), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold">Accounts Payable</h2>
          <p className="text-sm text-text-secondary mt-1">Outstanding vendor expenses — ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} total owed</p>
        </div>
      </div>
      <FilterableDataTable columns={columns} data={open} searchPlaceholder="Search payables…" pageSize={10} rowKey={(e) => e.id} />
    </>
  )
}
