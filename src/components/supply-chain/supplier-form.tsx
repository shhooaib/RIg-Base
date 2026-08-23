'use client'

import { useEffect, useState } from 'react'
import { ThemeSelect } from '@/components/ui/theme-select'
import type { SupplyChainSupplier } from '@/lib/supply-chain/types'

export function SupplierForm({
  initial,
  onSubmit,
  loading,
  submitLabel = 'Add Supplier',
}: {
  initial?: SupplyChainSupplier
  onSubmit: (data: Partial<SupplyChainSupplier>) => void
  loading: boolean
  submitLabel?: string
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    contact_person: initial?.contact_person ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    payment_terms: initial?.payment_terms ?? '',
    tax_id: initial?.tax_id ?? '',
    website: initial?.website ?? '',
    notes: initial?.notes ?? '',
    rating: initial?.rating != null ? String(initial.rating) : '',
    status: (initial?.status ?? 'active') as SupplyChainSupplier['status'],
  })

  useEffect(() => {
    if (!initial) return
    setForm({
      name: initial.name,
      contact_person: initial.contact_person,
      email: initial.email,
      phone: initial.phone,
      address: initial.address ?? '',
      payment_terms: initial.payment_terms ?? '',
      tax_id: initial.tax_id ?? '',
      website: initial.website ?? '',
      notes: initial.notes ?? '',
      rating: initial.rating != null ? String(initial.rating) : '',
      status: initial.status,
    })
  }, [initial])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: form.name,
      contact_person: form.contact_person,
      email: form.email,
      phone: form.phone,
      address: form.address || null,
      payment_terms: form.payment_terms || null,
      tax_id: form.tax_id || null,
      website: form.website || null,
      notes: form.notes || null,
      rating: form.rating ? Number(form.rating) : null,
      status: form.status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Company name</label>
        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Contact person</label>
        <input type="text" required value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="form-field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone</label>
          <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Address</label>
        <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="form-field resize-none" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Payment terms</label>
          <input type="text" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="form-field" placeholder="Net 30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Tax ID</label>
          <input type="text" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className="form-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Website</label>
          <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Rating (0–5)</label>
          <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="form-field" />
        </div>
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
            onChange={(status) => setForm({ ...form, status: status as SupplyChainSupplier['status'] })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            aria-label="Status"
          />
        </div>
      )}
      <button type="submit" disabled={loading} className="form-submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
