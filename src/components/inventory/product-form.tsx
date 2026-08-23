'use client'

import { useEffect, useState } from 'react'
import { ThemeSelect } from '@/components/ui/theme-select'
import type { InventoryProduct } from '@/lib/inventory/types'

export function ProductForm({
  categories,
  initial,
  onSubmit,
  loading,
  submitLabel = 'Add Product',
  allowQuantityEdit = true,
}: {
  categories: string[]
  initial?: InventoryProduct
  onSubmit: (data: Partial<InventoryProduct>) => void
  loading: boolean
  submitLabel?: string
  allowQuantityEdit?: boolean
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    category: initial?.category ?? categories[0] ?? '',
    description: initial?.description ?? '',
    quantity: initial?.quantity != null ? String(initial.quantity) : '0',
    unit_price: initial?.unit_price != null ? String(initial.unit_price) : '',
    cost_price: initial?.cost_price != null ? String(initial.cost_price) : '',
    min_stock_level: initial?.min_stock_level != null ? String(initial.min_stock_level) : '10',
    reorder_level: initial?.reorder_level != null ? String(initial.reorder_level) : initial?.min_stock_level != null ? String(initial.min_stock_level) : '10',
    unit: initial?.unit ?? 'ea',
    location: initial?.location ?? '',
    barcode: initial?.barcode ?? '',
  })

  useEffect(() => {
    if (!initial) return
    setForm({
      name: initial.name,
      sku: initial.sku,
      category: initial.category,
      description: initial.description ?? '',
      quantity: String(initial.quantity),
      unit_price: String(initial.unit_price),
      cost_price: String(initial.cost_price),
      min_stock_level: String(initial.min_stock_level),
      reorder_level: String(initial.reorder_level ?? initial.min_stock_level),
      unit: initial.unit ?? 'ea',
      location: initial.location ?? '',
      barcode: initial.barcode ?? '',
    })
  }, [initial])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const quantity = allowQuantityEdit ? Number(form.quantity) : (initial?.quantity ?? 0)
    const minStock = Number(form.min_stock_level)
    const reorderLevel = Number(form.reorder_level)
    onSubmit({
      name: form.name,
      sku: form.sku,
      category: form.category,
      description: form.description || null,
      quantity,
      unit_price: Number(form.unit_price),
      cost_price: Number(form.cost_price),
      min_stock_level: minStock,
      reorder_level: reorderLevel,
      unit: form.unit,
      location: form.location || null,
      barcode: form.barcode || null,
      status: quantity === 0 ? 'out_of_stock' : quantity <= reorderLevel ? 'low_stock' : 'in_stock',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Product name</label>
        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">SKU</label>
          <input type="text" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
          <ThemeSelect
            variant="form"
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            options={[
              ...categories.map((c) => ({ value: c, label: c })),
              { value: 'Other', label: 'Other' },
            ]}
            aria-label="Category"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-field resize-none" rows={2} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {allowQuantityEdit && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Quantity</label>
            <input type="number" required min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="form-field" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Unit price</label>
          <input type="number" required step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Cost price</label>
          <input type="number" required step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="form-field" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Min stock level</label>
          <input type="number" required min="0" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Reorder level</label>
          <input type="number" required min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Unit</label>
          <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="form-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Location</label>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Barcode</label>
          <input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="form-field" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="form-submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
