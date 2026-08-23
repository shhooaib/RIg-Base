'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Receipt, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FinanceStatusBadge, formatMoney } from '@/components/finance/finance-status-badge'
import { EXPENSE_STATUSES, FINANCE_QUERY_KEYS } from '@/lib/finance/constants'
import { useFinanceExpenses, useFinanceVendors } from '@/hooks/use-finance-data'
import type { FinanceExpense } from '@/lib/finance/types'

export default function ExpensesPage() {
  const [open, setOpen] = useState(false)
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: expenses = [], isLoading } = useFinanceExpenses()
  const { data: vendors = [] } = useFinanceVendors()

  const save = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const amount = Number(form.amount)
      const tax = Number(form.tax_amount || 0)
      const { error } = await supabase.from('finance_expenses').insert({
        workspace_id: workspace!.id,
        vendor_id: form.vendor_id || null,
        category: form.category,
        status: form.status,
        description: form.description,
        expense_date: form.expense_date,
        due_date: form.due_date || null,
        currency: form.currency || 'USD',
        amount,
        tax_amount: tax,
        total_amount: amount + tax,
        reference: form.reference || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.expenses })
      setOpen(false)
      toast.success('Expense created')
    },
    onError: () => toast.error('Failed to create expense'),
  })

  const columns = [
    { key: 'date', header: 'Date', render: (e: FinanceExpense & { finance_vendors?: { name: string } | null }) => e.expense_date },
    { key: 'vendor', header: 'Vendor', render: (e: FinanceExpense & { finance_vendors?: { name: string } | null }) => e.finance_vendors?.name ?? '—' },
    { key: 'desc', header: 'Description', render: (e: FinanceExpense) => e.description },
    { key: 'category', header: 'Category', render: (e: FinanceExpense) => e.category },
    { key: 'status', header: 'Status', render: (e: FinanceExpense) => <FinanceStatusBadge status={e.status} kind="expense" /> },
    { key: 'total', header: 'Total', render: (e: FinanceExpense) => formatMoney(Number(e.total_amount), e.currency) },
    { key: 'paid', header: 'Paid', render: (e: FinanceExpense) => formatMoney(Number(e.amount_paid), e.currency) },
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Expenses</h2><p className="text-sm text-text-secondary mt-1">Track business expenses and accounts payable</p></div>
        <PermissionGate module="finance" permission="create">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New expense</button>
        </PermissionGate>
      </div>

      {!isLoading && expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses" description="Record vendor bills and operating expenses." action={{ label: 'New expense', onClick: () => setOpen(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={expenses} searchPlaceholder="Search expenses…" pageSize={10} rowKey={(e) => e.id} filters={[{ id: 'status', label: 'Status', options: EXPENSE_STATUSES.map((s) => ({ value: s, label: s })) }]} customFilter={(e, ctx) => ctx.filters.status === 'all' || e.status === ctx.filters.status} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New expense">
        <ExpenseForm vendors={vendors} onSubmit={(f) => save.mutate(f)} loading={save.isPending} />
      </Modal>
    </>
  )
}

function ExpenseForm({ vendors, onSubmit, loading }: { vendors: { id: string; name: string }[]; onSubmit: (f: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({ vendor_id: '', category: 'Operations', status: 'pending', description: '', expense_date: new Date().toISOString().slice(0, 10), due_date: '', currency: 'USD', amount: '', tax_amount: '0', reference: '' })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <select className="form-field" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}><option value="">Vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input className="form-field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <div className="grid grid-cols-2 gap-4">
        <input className="form-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
        <select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{EXPENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="form-field" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        <input type="date" className="form-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input type="number" step="0.01" className="form-field" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="number" step="0.01" className="form-field" placeholder="Tax" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
        <input className="form-field" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
      </div>
      <input className="form-field" placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      <button type="submit" disabled={loading} className="form-submit">{loading ? 'Saving…' : 'Create expense'}</button>
    </form>
  )
}
