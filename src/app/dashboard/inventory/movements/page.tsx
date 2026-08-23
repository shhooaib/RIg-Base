'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProducts, useStockMovements } from '@/hooks/use-inventory-data'
import { INVENTORY_QUERY_KEYS } from '@/lib/inventory/constants'
import { MOVEMENT_TYPES } from '@/lib/inventory/constants'
import { Modal } from '@/components/ui/modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { StockMovementForm } from '@/components/inventory/stock-movement-form'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { StockMovement } from '@/lib/inventory/types'

export default function InventoryMovementsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const { data: products = [] } = useProducts()
  const { data: movements = [] } = useStockMovements()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.movements] })
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.products] })
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.dashboard] })
  }

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
    onSuccess: () => { invalidate(); setShowAdd(false); toast.success('Movement recorded') },
    onError: (e: Error) => toast.error(e.message),
  })

  const typeLabel = (t: string) => MOVEMENT_TYPES.find((m) => m.value === t)?.label ?? t.replace(/_/g, ' ')

  const columns = [
    {
      key: 'created_at',
      header: 'Date',
      cellClass: 'table-cell-date',
      render: (m: StockMovement) => new Date(m.created_at).toLocaleString(),
    },
    {
      key: 'product',
      header: 'Product',
      render: (m: StockMovement) => m.product?.name ?? '—',
    },
    {
      key: 'movement_type',
      header: 'Type',
      render: (m: StockMovement) => <span className="capitalize">{typeLabel(m.movement_type)}</span>,
    },
    {
      key: 'quantity_delta',
      header: 'Change',
      render: (m: StockMovement) => (
        <span className={m.quantity_delta >= 0 ? 'text-success' : 'text-danger'}>
          {m.quantity_delta >= 0 ? '+' : ''}{m.quantity_delta}
        </span>
      ),
    },
    {
      key: 'quantity_after',
      header: 'Balance',
      render: (m: StockMovement) => m.quantity_after,
    },
    { key: 'notes', header: 'Notes', cellClass: 'table-cell-secondary' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Stock movements</h2>
          <p className="text-sm text-text-secondary mt-1">Stock in, stock out, adjustments, and returns</p>
        </div>
        <PermissionGate module="inventory" permission="edit">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary" disabled={products.length === 0}>
            <Plus size={16} /> Record movement
          </button>
        </PermissionGate>
      </div>

      <FilterableDataTable
        columns={columns}
        data={movements}
        searchPlaceholder="Search product or notes…"
        searchKeys={['notes']}
        customFilter={(m, ctx) => {
          const haystack = [m.product?.name, m.product?.sku, m.notes, m.movement_type].join(' ')
          if (!haystack.toLowerCase().includes(ctx.search.toLowerCase())) return false
          if (ctx.filters.movement_type !== 'all' && m.movement_type !== ctx.filters.movement_type) return false
          return true
        }}
        filters={[{ id: 'movement_type', label: 'Type', options: MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label })) }]}
        pageSize={15}
        rowKey={(m) => m.id}
        emptyFilteredMessage="No movements match your filters."
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record stock movement">
        <StockMovementForm products={products} onSubmit={(data) => recordMovement.mutate(data)} loading={recordMovement.isPending} />
      </Modal>
    </>
  )
}
