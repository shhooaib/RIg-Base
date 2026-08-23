'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useProduct, useStockMovements } from '@/hooks/use-inventory-data'
import { INVENTORY_QUERY_KEYS } from '@/lib/inventory/constants'
import { productStockValue } from '@/lib/inventory/reports'
import { Modal } from '@/components/ui/modal'
import { ProductForm } from '@/components/inventory/product-form'
import { StockMovementForm } from '@/components/inventory/stock-movement-form'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { Loader2, ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { workspace } = useWorkspaceStore()
  const { data: product, isLoading } = useProduct(id)
  const { data: movements = [] } = useStockMovements(id)
  const [showEdit, setShowEdit] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.products] })
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.movements] })
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.dashboard] })
  }

  const updateProduct = useMutation({
    mutationFn: async (data: Parameters<typeof ProductForm>[0]['onSubmit'] extends (d: infer D) => void ? D : never) => {
      const { error } = await supabase.from('products').update(data).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowEdit(false); toast.success('Product updated') },
    onError: () => toast.error('Failed to update product'),
  })

  const recordMovement = useMutation({
    mutationFn: async (payload: { product_id: string; movement_type: string; quantity: number; notes?: string }) => {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
    },
    onSuccess: () => { invalidate(); setShowMovement(false); toast.success('Movement recorded') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !product) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading product…</div>
  }

  const reorder = product.reorder_level ?? product.min_stock_level

  return (
    <>
      <Link href="/dashboard/inventory/products" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={14} /> Back to products
      </Link>

      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{product.name}</h2>
          <p className="text-sm text-text-secondary mt-1">SKU {product.sku} · {product.category}</p>
        </div>
        <div className="page-header-actions">
          <PermissionGate module="inventory" permission="edit">
            <button type="button" onClick={() => setShowMovement(true)} className="btn-secondary">
              <ArrowLeftRight size={16} /> Stock movement
            </button>
            <button type="button" onClick={() => setShowEdit(true)} className="btn-primary">Edit product</button>
          </PermissionGate>
        </div>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat"><p className="stat-label summary-stat-label">On hand</p><p className="text-2xl font-semibold">{product.quantity} {product.unit ?? 'ea'}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Stock value</p><p className="text-2xl font-semibold">${productStockValue(product).toFixed(2)}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Reorder level</p><p className="text-2xl font-semibold">{reorder}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Unit / cost price</p><p className="text-2xl font-semibold">${Number(product.unit_price).toFixed(2)} / ${Number(product.cost_price).toFixed(2)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ai-card border border-border-primary p-5">
          <h3 className="font-semibold text-text-primary mb-4">Product details</h3>
          <dl className="space-y-2 text-sm">
            {product.description && <div><dt className="text-text-tertiary">Description</dt><dd>{product.description}</dd></div>}
            {product.location && <div><dt className="text-text-tertiary">Location</dt><dd>{product.location}</dd></div>}
            {product.barcode && <div><dt className="text-text-tertiary">Barcode</dt><dd>{product.barcode}</dd></div>}
            <div><dt className="text-text-tertiary">Status</dt><dd className="capitalize">{product.status.replace('_', ' ')}</dd></div>
          </dl>
        </div>

        <div className="ai-card border border-border-primary p-5">
          <h3 className="font-semibold text-text-primary mb-4">Stock history</h3>
          {movements.length === 0 ? (
            <p className="text-sm text-text-secondary">No movements recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="flex justify-between border-b border-border-primary pb-2">
                  <span>
                    <span className="capitalize">{m.movement_type.replace(/_/g, ' ')}</span>
                    {m.notes && <span className="text-text-tertiary ml-2">— {m.notes}</span>}
                  </span>
                  <span className={m.quantity_delta >= 0 ? 'text-success' : 'text-danger'}>
                    {m.quantity_delta >= 0 ? '+' : ''}{m.quantity_delta} → {m.quantity_after}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/inventory/movements" className="text-xs text-accent mt-3 inline-block hover:underline">All movements →</Link>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Product">
        <ProductForm initial={product} categories={workspace?.product_categories || []} onSubmit={(data) => updateProduct.mutate(data)} loading={updateProduct.isPending} submitLabel="Save changes" allowQuantityEdit={false} />
      </Modal>
      <Modal open={showMovement} onClose={() => setShowMovement(false)} title="Record stock movement">
        <StockMovementForm products={[product]} defaultProductId={product.id} onSubmit={(data) => recordMovement.mutate(data)} loading={recordMovement.isPending} />
      </Modal>
    </>
  )
}
