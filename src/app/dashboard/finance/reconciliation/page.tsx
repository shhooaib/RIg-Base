'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FinanceStatusBadge, formatMoney } from '@/components/finance/finance-status-badge'
import { FINANCE_QUERY_KEYS, RECONCILIATION_STATUSES } from '@/lib/finance/constants'
import { useFinanceReconciliations } from '@/hooks/use-finance-data'
import type { FinanceReconciliation } from '@/lib/finance/types'

export default function ReconciliationPage() {
  const [open, setOpen] = useState(false)
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: rows = [] } = useFinanceReconciliations()

  const save = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { error } = await supabase.from('finance_reconciliations').insert({
        workspace_id: workspace!.id,
        provider: form.provider,
        period_start: form.period_start,
        period_end: form.period_end,
        status: form.status,
        expected_amount: Number(form.expected_amount),
        actual_amount: Number(form.actual_amount),
        fee_total: Number(form.fee_total || 0),
        tax_total: Number(form.tax_total || 0),
        settlement_id: form.settlement_id || null,
        settlement_utr: form.settlement_utr || null,
        notes: form.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.reconciliations })
      setOpen(false)
      toast.success('Reconciliation batch added')
    },
    onError: () => toast.error('Failed to save reconciliation'),
  })

  const columns = [
    { key: 'period', header: 'Period', render: (r: FinanceReconciliation) => `${r.period_start} → ${r.period_end}` },
    { key: 'provider', header: 'Provider', render: (r: FinanceReconciliation) => r.provider },
    { key: 'status', header: 'Status', render: (r: FinanceReconciliation) => <FinanceStatusBadge status={r.status} kind="reconciliation" /> },
    { key: 'expected', header: 'Expected', render: (r: FinanceReconciliation) => formatMoney(Number(r.expected_amount)) },
    { key: 'actual', header: 'Actual', render: (r: FinanceReconciliation) => formatMoney(Number(r.actual_amount)) },
    { key: 'fees', header: 'Fees', render: (r: FinanceReconciliation) => formatMoney(Number(r.fee_total)) },
    { key: 'settlement', header: 'Settlement', render: (r: FinanceReconciliation) => r.settlement_id ?? '—' },
    { key: 'utr', header: 'UTR', render: (r: FinanceReconciliation) => r.settlement_utr ?? '—' },
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Reconciliation</h2><p className="text-sm text-text-secondary mt-1">Match gateway settlements with expected amounts, fees, and UTRs</p></div>
        <PermissionGate module="finance" permission="edit">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add batch</button>
        </PermissionGate>
      </div>
      <FilterableDataTable columns={columns} data={rows} searchPlaceholder="Search reconciliations…" pageSize={10} rowKey={(r) => r.id} />

      <Modal open={open} onClose={() => setOpen(false)} title="Reconciliation batch">
        <ReconForm onSubmit={(f) => save.mutate(f)} loading={save.isPending} />
      </Modal>
    </>
  )
}

function ReconForm({ onSubmit, loading }: { onSubmit: (f: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    provider: 'manual',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    status: 'open',
    expected_amount: '',
    actual_amount: '',
    fee_total: '0',
    tax_total: '0',
    settlement_id: '',
    settlement_utr: '',
    notes: '',
  })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <select className="form-field" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
        <option value="manual">Manual</option><option value="stripe">Stripe</option><option value="razorpay">Razorpay</option>
      </select>
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="form-field" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
        <input type="date" className="form-field" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
      </div>
      <select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{RECONCILIATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" step="0.01" className="form-field" placeholder="Expected" value={form.expected_amount} onChange={(e) => setForm({ ...form, expected_amount: e.target.value })} required />
        <input type="number" step="0.01" className="form-field" placeholder="Actual" value={form.actual_amount} onChange={(e) => setForm({ ...form, actual_amount: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" step="0.01" className="form-field" placeholder="Fees" value={form.fee_total} onChange={(e) => setForm({ ...form, fee_total: e.target.value })} />
        <input type="number" step="0.01" className="form-field" placeholder="Tax" value={form.tax_total} onChange={(e) => setForm({ ...form, tax_total: e.target.value })} />
      </div>
      <input className="form-field" placeholder="Settlement ID" value={form.settlement_id} onChange={(e) => setForm({ ...form, settlement_id: e.target.value })} />
      <input className="form-field" placeholder="UTR (Razorpay)" value={form.settlement_utr} onChange={(e) => setForm({ ...form, settlement_utr: e.target.value })} />
      <textarea className="form-field" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button type="submit" disabled={loading} className="form-submit">{loading ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
