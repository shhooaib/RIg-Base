'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePurchaseOrder, useSuppliers, useGoodsReceipts } from '@/hooks/use-supply-chain-data'
import { SUPPLY_CHAIN_QUERY_KEYS, PO_STATUS_COLORS } from '@/lib/supply-chain/constants'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { Loader2, ArrowLeft, CheckCircle, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: order, isLoading } = usePurchaseOrder(id)
  const { data: suppliers = [] } = useSuppliers()
  const { data: receipts = [] } = useGoodsReceipts(id)
  const queryClient = useQueryClient()
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({})
  const [receiveNotes, setReceiveNotes] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.purchaseOrders] })
    queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.goodsReceipts] })
    queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.dashboard] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
  }

  const approvePO = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/supply-chain/purchase-orders/${id}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to approve')
      return json
    },
    onSuccess: () => { invalidate(); toast.success('Purchase order approved — payable created in Finance') },
    onError: (e: Error) => toast.error(e.message),
  })

  const receiveGoods = useMutation({
    mutationFn: async () => {
      const lines = (order?.items ?? [])
        .map((item) => ({
          line_item_id: item.id,
          quantity_received: Number(receiveQty[item.id] ?? 0),
        }))
        .filter((l) => l.quantity_received > 0)

      const res = await fetch(`/api/supply-chain/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, notes: receiveNotes || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to receive goods')
      return json
    },
    onSuccess: () => {
      invalidate()
      setReceiveQty({})
      setReceiveNotes('')
      toast.success('Goods received — inventory stock updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !order) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading order…</div>
  }

  const supplier = suppliers.find((s) => s.id === order.supplier_id)
  const canApprove = order.status === 'pending'
  const canReceive = ['approved', 'shipped', 'partially_delivered'].includes(order.status)

  return (
    <>
      <Link href="/dashboard/supply-chain/orders" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={14} /> Back to orders
      </Link>

      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{order.order_number}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {supplier?.name ?? 'Unknown supplier'} ·{' '}
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${PO_STATUS_COLORS[order.status] ?? ''}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
        <div className="page-header-actions gap-2">
          {canApprove && (
            <PermissionGate module="supply_chain" permission="approve">
              <button type="button" onClick={() => approvePO.mutate()} disabled={approvePO.isPending} className="btn-secondary">
                <CheckCircle size={16} /> Approve & create payable
              </button>
            </PermissionGate>
          )}
          {order.expense_id && (
            <Link href="/dashboard/finance/expenses" className="btn-secondary text-sm">View in Finance</Link>
          )}
        </div>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat"><p className="stat-label summary-stat-label">Order total</p><p className="text-2xl font-semibold">${Number(order.total_amount).toFixed(2)}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Received value</p><p className="text-2xl font-semibold">${Number(order.received_amount ?? 0).toFixed(2)}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Order date</p><p className="text-2xl font-semibold text-lg">{order.order_date}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Expected delivery</p><p className="text-2xl font-semibold text-lg">{order.expected_delivery ?? '—'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ai-card border border-border-primary p-5 lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-4">Line items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-tertiary border-b border-border-primary">
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Ordered</th>
                  <th className="text-right py-2">Received</th>
                  <th className="text-right py-2">Unit cost</th>
                  <th className="text-right py-2">Line total</th>
                  {canReceive && <th className="text-right py-2">Receive now</th>}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const remaining = Number(item.quantity_ordered) - Number(item.quantity_received)
                  return (
                    <tr key={item.id} className="border-b border-border-primary/50">
                      <td className="py-2">{item.product_name}{item.sku ? ` (${item.sku})` : ''}</td>
                      <td className="text-right py-2">{item.quantity_ordered}</td>
                      <td className="text-right py-2">{item.quantity_received}</td>
                      <td className="text-right py-2">${Number(item.unit_cost).toFixed(2)}</td>
                      <td className="text-right py-2">${Number(item.line_total).toFixed(2)}</td>
                      {canReceive && (
                        <td className="text-right py-2">
                          {remaining > 0 ? (
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              placeholder={`max ${remaining}`}
                              value={receiveQty[item.id] ?? ''}
                              onChange={(e) => setReceiveQty({ ...receiveQty, [item.id]: e.target.value })}
                              className="form-field w-24 text-right ml-auto"
                            />
                          ) : (
                            <span className="text-success text-xs">Complete</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {canReceive && (
            <PermissionGate module="supply_chain" permission="edit">
              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary">Receipt notes</label>
                  <input type="text" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} className="form-field" placeholder="Optional notes for this receipt" />
                </div>
                <button type="button" onClick={() => receiveGoods.mutate()} disabled={receiveGoods.isPending} className="btn-primary">
                  <PackageCheck size={16} /> Receive goods
                </button>
              </div>
            </PermissionGate>
          )}
        </div>

        {order.notes && (
          <div className="ai-card border border-border-primary p-5">
            <h3 className="font-semibold text-text-primary mb-2">Notes</h3>
            <p className="text-sm text-text-secondary">{order.notes}</p>
          </div>
        )}

        <div className="ai-card border border-border-primary p-5">
          <h3 className="font-semibold text-text-primary mb-4">Goods receipts</h3>
          {receipts.length === 0 ? (
            <p className="text-sm text-text-secondary">No receipts recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {receipts.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{r.receipt_number}</span>
                  <span className="text-text-tertiary">{new Date(r.received_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
