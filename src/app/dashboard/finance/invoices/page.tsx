'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FinanceStatusBadge, formatMoney } from '@/components/finance/finance-status-badge'
import { FINANCE_QUERY_KEYS, INVOICE_STATUSES } from '@/lib/finance/constants'
import { useFinanceCustomers, useFinanceInvoices } from '@/hooks/use-finance-data'
import { nextInvoiceNumber } from '@/lib/finance/reports'
import type { FinanceInvoice } from '@/lib/finance/types'

export default function InvoicesPage() {
  const [open, setOpen] = useState(false)
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: invoices = [], isLoading } = useFinanceInvoices()
  const { data: customers = [] } = useFinanceCustomers()

  const save = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const subtotal = Number(form.amount)
      const tax = Number(form.tax_amount || 0)
      const total = subtotal + tax
      const { error } = await supabase.from('finance_invoices').insert({
        workspace_id: workspace!.id,
        invoice_number: form.invoice_number,
        customer_id: form.customer_id || null,
        status: form.status,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        currency: form.currency || 'USD',
        subtotal,
        tax_amount: tax,
        total_amount: total,
        notes: form.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.invoices })
      setOpen(false)
      toast.success('Invoice created')
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const columns = [
    { key: 'number', header: 'Invoice #', render: (i: FinanceInvoice & { customers?: { name: string } | null }) => <span className="font-mono text-sm">{i.invoice_number}</span> },
    { key: 'customer', header: 'Customer', render: (i: FinanceInvoice & { customers?: { name: string } | null }) => i.customers?.name ?? '—' },
    { key: 'status', header: 'Status', render: (i: FinanceInvoice) => <FinanceStatusBadge status={i.status} kind="invoice" /> },
    { key: 'total', header: 'Total', render: (i: FinanceInvoice) => formatMoney(Number(i.total_amount), i.currency) },
    { key: 'paid', header: 'Paid', render: (i: FinanceInvoice) => formatMoney(Number(i.amount_paid), i.currency) },
    { key: 'due', header: 'Due', render: (i: FinanceInvoice) => i.due_date ?? '—' },
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Invoices</h2><p className="text-sm text-text-secondary mt-1">Accounts receivable — bill customers and track payment status</p></div>
        <PermissionGate module="finance" permission="create">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New invoice</button>
        </PermissionGate>
      </div>

      {!isLoading && invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices" description="Create invoices to track what customers owe you." action={{ label: 'New invoice', onClick: () => setOpen(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={invoices} searchPlaceholder="Search invoices…" pageSize={10} rowKey={(i) => i.id} filters={[{ id: 'status', label: 'Status', options: INVOICE_STATUSES.map((s) => ({ value: s, label: s })) }]} customFilter={(i, ctx) => ctx.filters.status === 'all' || i.status === ctx.filters.status} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New invoice">
        <InvoiceForm customers={customers} existingNumbers={invoices.map((i) => i.invoice_number)} onSubmit={(f) => save.mutate(f)} loading={save.isPending} />
      </Modal>
    </>
  )
}

function InvoiceForm({ customers, existingNumbers, onSubmit, loading }: { customers: { id: string; name: string }[]; existingNumbers: string[]; onSubmit: (f: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    invoice_number: nextInvoiceNumber(existingNumbers),
    customer_id: '',
    status: 'draft',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    currency: 'USD',
    amount: '',
    tax_amount: '0',
    notes: '',
  })

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <input className="form-field font-mono" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} required />
      <select className="form-field" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
        <option value="">No customer</option>
        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="form-field" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
        <input type="date" className="form-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input type="number" step="0.01" className="form-field" placeholder="Subtotal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="number" step="0.01" className="form-field" placeholder="Tax" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
        <input className="form-field" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
      </div>
      <textarea className="form-field" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button type="submit" disabled={loading} className="form-submit">{loading ? 'Saving…' : 'Create invoice'}</button>
    </form>
  )
}
