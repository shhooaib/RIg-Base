'use client'

import { useState } from 'react'
import { ThemeSelect } from '@/components/ui/theme-select'
import { MOVEMENT_TYPES } from '@/lib/inventory/constants'
import type { InventoryProduct } from '@/lib/inventory/types'

export function StockMovementForm({
  products,
  onSubmit,
  loading,
  defaultProductId,
  defaultType,
}: {
  products: InventoryProduct[]
  onSubmit: (data: { product_id: string; movement_type: string; quantity: number; notes?: string }) => void
  loading: boolean
  defaultProductId?: string
  defaultType?: string
}) {
  const [form, setForm] = useState({
    product_id: defaultProductId ?? products[0]?.id ?? '',
    movement_type: defaultType ?? 'stock_in',
    quantity: '1',
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      product_id: form.product_id,
      movement_type: form.movement_type,
      quantity: Number(form.quantity),
      notes: form.notes || undefined,
    })
  }

  const isOut = ['stock_out', 'return_out'].includes(form.movement_type)
  const isAdjustment = form.movement_type === 'adjustment'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Product</label>
        <ThemeSelect
          variant="form"
          value={form.product_id}
          onChange={(product_id) => setForm({ ...form, product_id })}
          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku}) — ${p.quantity} in stock` }))}
          aria-label="Product"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Movement type</label>
        <ThemeSelect
          variant="form"
          value={form.movement_type}
          onChange={(movement_type) => setForm({ ...form, movement_type })}
          options={MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          aria-label="Movement type"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {isAdjustment ? 'New quantity (absolute)' : isOut ? 'Quantity out' : 'Quantity in'}
        </label>
        <input
          type="number"
          required
          min={isAdjustment ? '0' : '1'}
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="form-field"
        />
        {isAdjustment && (
          <p className="text-xs text-text-tertiary mt-1">Sets stock to this exact quantity.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-field resize-none" rows={2} />
      </div>
      <button type="submit" disabled={loading || !form.product_id} className="form-submit">
        {loading ? 'Recording…' : 'Record movement'}
      </button>
    </form>
  )
}
