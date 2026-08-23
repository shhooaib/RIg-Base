'use client'

import { useEffect, useState } from 'react'
import type { Customer } from '@/lib/types'
import { ThemeSelect } from '@/components/ui/theme-select'
import { EmployeeSelect } from '@/components/crm/employee-select'
import type { Employee } from '@/lib/types'

export function CustomerForm({
  initial,
  employees = [],
  onSubmit,
  loading,
  submitLabel = 'Add Customer',
}: {
  initial?: Customer
  employees?: Employee[]
  onSubmit: (data: Partial<Customer>) => void
  loading: boolean
  submitLabel?: string
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    company: initial?.company ?? '',
    status: (initial?.status ?? 'active') as Customer['status'],
    source: initial?.source ?? '',
    assigned_to: initial?.assigned_to ?? '',
    notes: initial?.notes ?? '',
    total_spent: initial?.total_spent != null ? String(initial.total_spent) : '0',
    next_follow_up: initial?.next_follow_up?.slice(0, 16) ?? '',
  })

  useEffect(() => {
    if (!initial) return
    setForm({
      name: initial.name,
      email: initial.email,
      phone: initial.phone ?? '',
      company: initial.company ?? '',
      status: initial.status,
      source: initial.source ?? '',
      assigned_to: initial.assigned_to ?? '',
      notes: initial.notes ?? '',
      total_spent: String(initial.total_spent ?? 0),
      next_follow_up: initial.next_follow_up?.slice(0, 16) ?? '',
    })
  }, [initial])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      company: form.company || null,
      status: form.status,
      source: form.source || null,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
      total_spent: Number(form.total_spent) || 0,
      next_follow_up: form.next_follow_up ? new Date(form.next_follow_up).toISOString() : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Company</label>
          <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="form-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
          <ThemeSelect
            variant="form"
            value={form.status}
            onChange={(status) => setForm({ ...form, status: status as Customer['status'] })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'lead', label: 'Lead' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            aria-label="Status"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Source</label>
          <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="form-field" placeholder="Referral, website, etc." />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Assigned to</label>
          <EmployeeSelect employees={employees} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Next follow-up</label>
        <input type="datetime-local" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} className="form-field" />
      </div>
      {initial && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Total spent</label>
          <input type="number" min="0" step="0.01" value={form.total_spent} onChange={(e) => setForm({ ...form, total_spent: e.target.value })} className="form-field" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-field resize-none" rows={3} />
      </div>
      <button type="submit" disabled={loading} className="form-submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
