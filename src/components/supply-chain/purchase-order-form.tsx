'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ThemeSelect } from '@/components/ui/theme-select'
import { PO_STATUSES } from '@/lib/supply-chain/constants'
import type { InventoryProduct } from '@/lib/inventory/types'
import type { PurchaseOrderDetail, PurchaseOrderLineItem, SupplyChainSupplier } from '@/lib/supply-chain/types'

type LineDraft = {
  product_id: string
  product_name: string
  sku: string
  quantity_ordered: string
  unit_cost: string
}

export type PurchaseOrderFormData = {
  supplier_id: string
  order_number: string
  total_amount: number
  expected_delivery: string | null
  order_date: string
  status: PurchaseOrderDetail['status']
  notes?: string | null
  line_items: Omit<PurchaseOrderLineItem, 'id' | 'workspace_id' | 'purchase_order_id' | 'quantity_received' | 'created_at'>[]
}

export function PurchaseOrderForm({
  suppliers,
  products,
  initial,
  onSubmit,
  loading,
  submitLabel = 'Create Order',
}: {
  suppliers: SupplyChainSupplier[]
  products: InventoryProduct[]
  initial?: PurchaseOrderDetail
  onSubmit: (data: PurchaseOrderFormData) => void
  loading: boolean
  submitLabel?: string
}) {
  const [form, setForm] = useState({
    supplier_id: initial?.supplier_id ?? suppliers[0]?.id ?? '',
    order_number: initial?.order_number ?? `PO-${Date.now().toString(36).toUpperCase()}`,
    expected_delivery: initial?.expected_delivery ?? '',
    order_date: initial?.order_date ?? new Date().toISOString().split('T')[0],
    status: (initial?.status ?? 'pending') as PurchaseOrderDetail['status'],
    notes: initial?.notes ?? '',
  })

  const [lines, setLines] = useState<LineDraft[]>(() =>
    initial?.items?.length
      ? initial.items.map((i) => ({
          product_id: i.product_id ?? '',
          product_name: i.product_name,
          sku: i.sku ?? '',
          quantity_ordered: String(i.quantity_ordered),
          unit_cost: String(i.unit_cost),
        }))
      : [{ product_id: products[0]?.id ?? '', product_name: products[0]?.name ?? '', sku: products[0]?.sku ?? '', quantity_ordered: '1', unit_cost: String(products[0]?.cost_price ?? 0) }]
  )

  useEffect(() => {
    if (!initial) return
    setForm({
      supplier_id: initial.supplier_id,
      order_number: initial.order_number,
      expected_delivery: initial.expected_delivery ?? '',
      order_date: initial.order_date,
      status: initial.status,
      notes: initial.notes ?? '',
    })
    if (initial.items?.length) {
      setLines(
        initial.items.map((i) => ({
          product_id: i.product_id ?? '',
          product_name: i.product_name,
          sku: i.sku ?? '',
          quantity_ordered: String(i.quantity_ordered),
          unit_cost: String(i.unit_cost),
        }))
      )
    }
  }, [initial])

  const totalAmount = useMemo(
    () =>
      lines.reduce((sum, l) => sum + Number(l.quantity_ordered || 0) * Number(l.unit_cost || 0), 0),
    [lines]
  )

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    updateLine(index, {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      unit_cost: String(product.cost_price),
    })
  }

  function addLine() {
    const p = products[0]
    setLines((prev) => [
      ...prev,
      { product_id: p?.id ?? '', product_name: p?.name ?? '', sku: p?.sku ?? '', quantity_ordered: '1', unit_cost: String(p?.cost_price ?? 0) },
    ])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const line_items = lines
      .filter((l) => l.product_name && Number(l.quantity_ordered) > 0)
      .map((l) => ({
        product_id: l.product_id || null,
        product_name: l.product_name,
        sku: l.sku || null,
        quantity_ordered: Number(l.quantity_ordered),
        unit_cost: Number(l.unit_cost),
        line_total: Number(l.quantity_ordered) * Number(l.unit_cost),
      }))

    onSubmit({
      ...form,
      expected_delivery: form.expected_delivery || null,
      notes: form.notes || null,
      total_amount: totalAmount,
      line_items,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Supplier</label>
        <ThemeSelect
          variant="form"
          value={form.supplier_id}
          onChange={(supplier_id) => setForm({ ...form, supplier_id })}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          aria-label="Supplier"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Order number</label>
          <input type="text" required value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Order date</label>
          <input type="date" required value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} className="form-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Expected delivery</label>
        <input type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} className="form-field" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-secondary">Line items</label>
          <button type="button" onClick={addLine} className="text-xs text-accent inline-flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add line
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border-primary bg-bg-secondary/30">
              <div className="col-span-5">
                <label className="text-xs text-text-tertiary">Product</label>
                {products.length > 0 ? (
                  <ThemeSelect
                    variant="form"
                    value={line.product_id}
                    onChange={(id) => selectProduct(index, id)}
                    options={products.map((p) => ({ value: p.id, label: p.name }))}
                    aria-label={`Product line ${index + 1}`}
                  />
                ) : (
                  <input type="text" value={line.product_name} onChange={(e) => updateLine(index, { product_name: e.target.value })} className="form-field" placeholder="Product name" />
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs text-text-tertiary">Qty</label>
                <input type="number" min="1" value={line.quantity_ordered} onChange={(e) => updateLine(index, { quantity_ordered: e.target.value })} className="form-field" />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-text-tertiary">Unit cost</label>
                <input type="number" step="0.01" value={line.unit_cost} onChange={(e) => updateLine(index, { unit_cost: e.target.value })} className="form-field" />
              </div>
              <div className="col-span-1 text-sm font-medium text-text-primary pb-2">
                ${(Number(line.quantity_ordered || 0) * Number(line.unit_cost || 0)).toFixed(2)}
              </div>
              <div className="col-span-1 pb-1">
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} className="p-1 text-text-tertiary hover:text-danger" aria-label="Remove line">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-text-primary mt-2 text-right">Total: ${totalAmount.toFixed(2)}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-field resize-none" rows={2} />
      </div>

      {initial && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
          <ThemeSelect
            variant="form"
            value={form.status}
            onChange={(status) => setForm({ ...form, status: status as PurchaseOrderDetail['status'] })}
            options={PO_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            aria-label="Status"
          />
        </div>
      )}

      <button type="submit" disabled={loading || lines.length === 0} className="form-submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
