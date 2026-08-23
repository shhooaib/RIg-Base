'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useSupplier, usePurchaseOrders, useSupplierReturns } from '@/hooks/use-supply-chain-data'
import { computeSupplierPerformance } from '@/lib/supply-chain/reports'
import { SUPPLY_CHAIN_QUERY_KEYS } from '@/lib/supply-chain/constants'
import { PO_STATUS_COLORS } from '@/lib/supply-chain/constants'
import { Modal } from '@/components/ui/modal'
import { SupplierForm } from '@/components/supply-chain/supplier-form'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function SupplierDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { workspace } = useWorkspaceStore()
  const { data: supplier, isLoading } = useSupplier(id)
  const { data: orders = [] } = usePurchaseOrders()
  const { data: returns = [] } = useSupplierReturns()
  const [showEdit, setShowEdit] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const supplierOrders = orders.filter((o) => o.supplier_id === id)
  const supplierReturns = returns.filter((r) => r.supplier_id === id)
  const performance = supplier ? computeSupplierPerformance([supplier], orders)[0] : null

  const updateSupplier = useMutation({
    mutationFn: async (data: Parameters<typeof SupplierForm>[0]['onSubmit'] extends (d: infer D) => void ? D : never) => {
      const { error } = await supabase.from('suppliers').update(data).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.suppliers] })
      setShowEdit(false)
      toast.success('Supplier updated')
    },
    onError: () => toast.error('Failed to update supplier'),
  })

  if (isLoading || !supplier) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading supplier…</div>
  }

  return (
    <>
      <Link href="/dashboard/supply-chain/suppliers" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={14} /> Back to suppliers
      </Link>

      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{supplier.name}</h2>
          <p className="text-sm text-text-secondary mt-1">{supplier.contact_person} · {supplier.email}</p>
        </div>
        <PermissionGate module="supply_chain" permission="edit">
          <button type="button" onClick={() => setShowEdit(true)} className="btn-primary">Edit supplier</button>
        </PermissionGate>
      </div>

      {performance && (
        <div className="summary-row mb-8">
          <div className="summary-stat"><p className="stat-label summary-stat-label">Orders</p><p className="text-2xl font-semibold">{performance.order_count}</p></div>
          <div className="summary-stat"><p className="stat-label summary-stat-label">Total spend</p><p className="text-2xl font-semibold">${performance.total_spend.toLocaleString()}</p></div>
          <div className="summary-stat"><p className="stat-label summary-stat-label">Delayed</p><p className="text-2xl font-semibold">{performance.delayed_count}</p></div>
          <div className="summary-stat"><p className="stat-label summary-stat-label">Rating</p><p className="text-2xl font-semibold">{supplier.rating ?? '—'}</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ai-card border border-border-primary p-5">
          <h3 className="font-semibold text-text-primary mb-4">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-text-tertiary">Phone</dt><dd>{supplier.phone}</dd></div>
            <div><dt className="text-text-tertiary">Address</dt><dd>{supplier.address ?? '—'}</dd></div>
            <div><dt className="text-text-tertiary">Payment terms</dt><dd>{supplier.payment_terms ?? '—'}</dd></div>
            <div><dt className="text-text-tertiary">Tax ID</dt><dd>{supplier.tax_id ?? '—'}</dd></div>
            {supplier.website && <div><dt className="text-text-tertiary">Website</dt><dd><a href={supplier.website} className="text-accent hover:underline" target="_blank" rel="noreferrer">{supplier.website}</a></dd></div>}
            {supplier.notes && <div><dt className="text-text-tertiary">Notes</dt><dd>{supplier.notes}</dd></div>}
            {supplier.finance_vendor_id && (
              <div><dt className="text-text-tertiary">Finance vendor</dt><dd><Link href="/dashboard/finance/expenses" className="text-accent hover:underline">Linked payables</Link></dd></div>
            )}
          </dl>
        </div>

        <div className="ai-card border border-border-primary p-5">
          <h3 className="font-semibold text-text-primary mb-4">Purchase history</h3>
          {supplierOrders.length === 0 ? (
            <p className="text-sm text-text-secondary">No purchase orders yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {supplierOrders.slice(0, 8).map((o) => (
                <li key={o.id} className="flex justify-between">
                  <Link href={`/dashboard/supply-chain/orders/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${PO_STATUS_COLORS[o.status] ?? ''}`}>{o.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {supplierReturns.length > 0 && (
          <div className="ai-card border border-border-primary p-5 lg:col-span-2">
            <h3 className="font-semibold text-text-primary mb-4">Returns</h3>
            <ul className="space-y-2 text-sm">
              {supplierReturns.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{r.return_number} — {r.reason}</span>
                  <span>{r.quantity} units · {r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Supplier">
        <SupplierForm initial={supplier} onSubmit={(data) => updateSupplier.mutate(data)} loading={updateSupplier.isPending} submitLabel="Save changes" />
      </Modal>
    </>
  )
}
