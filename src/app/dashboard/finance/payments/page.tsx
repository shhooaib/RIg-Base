'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { CreditCard, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FinanceStatusBadge, formatMoney, formatWhen } from '@/components/finance/finance-status-badge'
import { FINANCE_QUERY_KEYS, PAYMENT_STATUSES } from '@/lib/finance/constants'
import { useFinanceCustomers, useFinanceInvoices, useFinancePayments } from '@/hooks/use-finance-data'
import type { FinancePayment } from '@/lib/finance/types'

export default function PaymentsPage() {
  const [open, setOpen] = useState(false)
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: payments = [], isLoading } = useFinancePayments()
  const { data: customers = [] } = useFinanceCustomers()
  const { data: invoices = [] } = useFinanceInvoices()

  const save = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const amount = Number(form.amount)
      const fee = Number(form.fee_amount || 0)
      const tax = Number(form.tax_amount || 0)
      const { error } = await supabase.from('finance_payments').insert({
        workspace_id: workspace!.id,
        direction: form.direction,
        status: form.status,
        amount,
        fee_amount: fee,
        tax_amount: tax,
        net_amount: amount - fee - tax,
        currency: form.currency || 'USD',
        paid_at: form.status === 'succeeded' ? new Date().toISOString() : null,
        customer_id: form.customer_id || null,
        invoice_id: form.invoice_id || null,
        provider: 'manual',
        payment_method: form.payment_method || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.payments })
      setOpen(false)
      toast.success('Payment recorded')
    },
    onError: () => toast.error('Failed to record payment'),
  })

  const columns = [
    { key: 'date', header: 'Date', render: (p: FinancePayment & { customers?: { name: string } | null }) => formatWhen(p.paid_at ?? p.created_at) },
    { key: 'customer', header: 'Customer', render: (p: FinancePayment & { customers?: { name: string } | null }) => p.customers?.name ?? '—' },
    { key: 'provider', header: 'Provider', render: (p: FinancePayment) => <span className="capitalize">{p.provider}</span> },
    { key: 'status', header: 'Status', render: (p: FinancePayment) => <FinanceStatusBadge status={p.status} kind="payment" /> },
    { key: 'amount', header: 'Amount', render: (p: FinancePayment) => formatMoney(Number(p.amount), p.currency) },
    { key: 'fees', header: 'Fees', render: (p: FinancePayment) => formatMoney(Number(p.fee_amount), p.currency) },
    { key: 'net', header: 'Net', render: (p: FinancePayment) => formatMoney(Number(p.net_amount), p.currency) },
    { key: 'ref', header: 'Transaction ID', render: (p: FinancePayment) => <span className="font-mono text-xs">{p.provider_payment_id ?? '—'}</span> },
    { key: 'utr', header: 'UTR', render: (p: FinancePayment) => p.provider_utr ?? '—' },
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Payments</h2><p className="text-sm text-text-secondary mt-1">Manual and gateway payments with fees, taxes, and transaction IDs</p></div>
        <PermissionGate module="finance" permission="create">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Record payment</button>
        </PermissionGate>
      </div>

      {!isLoading && payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments" description="Record payments manually or connect Stripe/Razorpay to sync automatically." action={{ label: 'Record payment', onClick: () => setOpen(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={payments} searchPlaceholder="Search payments, IDs, UTR…" pageSize={10} rowKey={(p) => p.id} filters={[
          { id: 'status', label: 'Status', options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s })) },
          { id: 'provider', label: 'Provider', options: [{ value: 'manual', label: 'Manual' }, { value: 'stripe', label: 'Stripe' }, { value: 'razorpay', label: 'Razorpay' }] },
        ]} customFilter={(p, ctx) => {
          const hay = [p.provider_payment_id, p.provider_utr, p.provider, p.status].join(' ')
          if (ctx.search && !hay.toLowerCase().includes(ctx.search.toLowerCase())) return false
          if (ctx.filters.status !== 'all' && p.status !== ctx.filters.status) return false
          if (ctx.filters.provider !== 'all' && p.provider !== ctx.filters.provider) return false
          return true
        }} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record payment">
        <PaymentForm customers={customers} invoices={invoices} onSubmit={(f) => save.mutate(f)} loading={save.isPending} />
      </Modal>
    </>
  )
}

function PaymentForm({ customers, invoices, onSubmit, loading }: { customers: { id: string; name: string }[]; invoices: { id: string; invoice_number: string }[]; onSubmit: (f: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({ direction: 'inbound', status: 'succeeded', amount: '', fee_amount: '0', tax_amount: '0', currency: 'USD', customer_id: '', invoice_id: '', payment_method: '' })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <div className="grid grid-cols-2 gap-4">
        <select className="form-field" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
        <select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <select className="form-field" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="form-field" value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}><option value="">Invoice</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}</select>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <input type="number" step="0.01" className="form-field" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="number" step="0.01" className="form-field" placeholder="Fees" value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} />
        <input type="number" step="0.01" className="form-field" placeholder="Tax" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
        <input className="form-field" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
      </div>
      <input className="form-field" placeholder="Payment method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
      <button type="submit" disabled={loading} className="form-submit">{loading ? 'Saving…' : 'Save payment'}</button>
    </form>
  )
}
