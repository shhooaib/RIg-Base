'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePurchaseOrders, useSuppliers, useSupplierReturns } from '@/hooks/use-supply-chain-data'
import { useProducts } from '@/hooks/use-inventory-data'
import { computeSupplierPerformance, isDelayedOrder, pendingOrdersValue } from '@/lib/supply-chain/reports'
import { SUPPLY_CHAIN_QUERY_KEYS } from '@/lib/supply-chain/constants'
import { Modal } from '@/components/ui/modal'
import { ThemeSelect } from '@/components/ui/theme-select'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SupplyChainReportsPage() {
  const { data: orders = [], isLoading: oLoading } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const { data: returns = [] } = useSupplierReturns()
  const { data: products = [] } = useProducts()
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showReturn, setShowReturn] = useState(false)
  const [returnForm, setReturnForm] = useState({ supplier_id: '', product_id: '', quantity: '1', reason: '' })

  if (oLoading) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading reports…</div>
  }

  const performance = computeSupplierPerformance(suppliers, orders)
  const delayed = orders.filter(isDelayedOrder)
  const pendingValue = pendingOrdersValue(orders)
  const procurementHistory = orders.filter((o) => o.status !== 'cancelled').slice(0, 10)

  const createReturn = useMutation({
    mutationFn: async () => {
      const returnNumber = `SR-${Date.now().toString(36).toUpperCase()}`
      const { data: inserted, error } = await supabase.from('supplier_returns').insert({
        workspace_id: workspace!.id,
        supplier_id: returnForm.supplier_id,
        product_id: returnForm.product_id || null,
        return_number: returnNumber,
        quantity: Number(returnForm.quantity),
        reason: returnForm.reason,
        status: 'pending',
      }).select('id').single()
      if (error) throw error

      if (returnForm.product_id) {
        const res = await fetch('/api/inventory/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: returnForm.product_id,
            movement_type: 'return_out',
            quantity: Number(returnForm.quantity),
            notes: `Supplier return ${returnNumber}: ${returnForm.reason}`,
            reference_type: 'supplier_return',
            reference_id: inserted.id,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Failed to adjust stock')
        }
        await supabase.from('supplier_returns').update({ status: 'completed' }).eq('id', inserted.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.supplierReturns] })
      setShowReturn(false)
      toast.success('Supplier return recorded')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Supply chain reports</h2>
          <p className="text-sm text-text-secondary mt-1">Purchases, pending orders, supplier performance, and procurement history</p>
        </div>
        <PermissionGate module="supply_chain" permission="edit">
          <button type="button" onClick={() => setShowReturn(true)} className="btn-secondary">Record supplier return</button>
        </PermissionGate>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat"><p className="stat-label summary-stat-label">Pending procurement</p><p className="text-2xl font-semibold">${pendingValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Delayed orders</p><p className="text-2xl font-semibold">{delayed.length}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Active suppliers</p><p className="text-2xl font-semibold">{suppliers.filter((s) => s.status === 'active').length}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Returns</p><p className="text-2xl font-semibold">{returns.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportPanel title="Supplier performance">
          {performance.length === 0 ? (
            <p className="text-sm text-text-secondary">No supplier data yet.</p>
          ) : (
            performance.slice(0, 8).map((s) => (
              <div key={s.supplier_id} className="flex justify-between text-sm py-1">
                <Link href={`/dashboard/supply-chain/suppliers/${s.supplier_id}`} className="hover:text-accent">{s.supplier_name}</Link>
                <span className="text-text-secondary">${s.total_spend.toLocaleString()} · {s.order_count} POs · {s.delayed_count} delayed</span>
              </div>
            ))
          )}
        </ReportPanel>

        <ReportPanel title="Delayed deliveries">
          {delayed.length === 0 ? (
            <p className="text-sm text-text-secondary">No delayed orders.</p>
          ) : (
            delayed.map((o) => (
              <div key={o.id} className="flex justify-between text-sm py-1">
                <Link href={`/dashboard/supply-chain/orders/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                <span className="text-danger">Due {o.expected_delivery}</span>
              </div>
            ))
          )}
        </ReportPanel>

        <ReportPanel title="Procurement history">
          {procurementHistory.length === 0 ? (
            <p className="text-sm text-text-secondary">No purchase orders yet.</p>
          ) : (
            procurementHistory.map((o) => (
              <div key={o.id} className="flex justify-between text-sm py-1">
                <Link href={`/dashboard/supply-chain/orders/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                <span>${Number(o.total_amount).toFixed(2)} · {o.status.replace(/_/g, ' ')}</span>
              </div>
            ))
          )}
        </ReportPanel>

        <ReportPanel title="Pending orders">
          {orders.filter((o) => o.status === 'pending').length === 0 ? (
            <p className="text-sm text-text-secondary">No orders awaiting approval.</p>
          ) : (
            orders.filter((o) => o.status === 'pending').map((o) => (
              <div key={o.id} className="flex justify-between text-sm py-1">
                <Link href={`/dashboard/supply-chain/orders/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                <span>${Number(o.total_amount).toFixed(2)}</span>
              </div>
            ))
          )}
        </ReportPanel>
      </div>

      <Modal open={showReturn} onClose={() => setShowReturn(false)} title="Supplier return">
        <form
          onSubmit={(e) => { e.preventDefault(); createReturn.mutate() }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Supplier</label>
            <ThemeSelect variant="form" value={returnForm.supplier_id} onChange={(supplier_id) => setReturnForm({ ...returnForm, supplier_id })} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} aria-label="Supplier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Product (optional — deducts stock)</label>
            <ThemeSelect variant="form" value={returnForm.product_id} onChange={(product_id) => setReturnForm({ ...returnForm, product_id })} options={[{ value: '', label: 'None' }, ...products.map((p) => ({ value: p.id, label: p.name }))]} aria-label="Product" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Quantity</label>
            <input type="number" min="1" required value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })} className="form-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Reason</label>
            <textarea required value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} className="form-field resize-none" rows={2} />
          </div>
          <button type="submit" disabled={createReturn.isPending || !returnForm.supplier_id} className="form-submit">
            {createReturn.isPending ? 'Saving…' : 'Record return'}
          </button>
        </form>
      </Modal>
    </>
  )
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
