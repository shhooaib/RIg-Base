'use client'

import { useState } from 'react'
import { EmployeeSelect } from '@/components/crm/employee-select'
import { ThemeSelect } from '@/components/ui/theme-select'
import {
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
} from '@/lib/crm/constants'
import type { CrmActivity, Customer, Deal, Lead } from '@/lib/types'
import { toast } from 'sonner'

export function ActivityForm({
  initial,
  customers,
  leads,
  deals = [],
  employees,
  onSubmit,
  loading,
  submitLabel = 'Save Activity',
  lockCustomerId,
  lockLeadId,
  lockDealId,
}: {
  initial?: CrmActivity
  customers: Pick<Customer, 'id' | 'name'>[]
  leads: Pick<Lead, 'id' | 'name'>[]
  deals?: Pick<Deal, 'id' | 'name'>[]
  employees: import('@/lib/types').Employee[]
  onSubmit: (data: Partial<CrmActivity>) => void
  loading: boolean
  submitLabel?: string
  lockCustomerId?: string
  lockLeadId?: string
  lockDealId?: string
}) {
  const [form, setForm] = useState({
    type: initial?.type ?? ('task' as CrmActivity['type']),
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    customer_id: lockCustomerId ?? initial?.customer_id ?? '',
    lead_id: lockLeadId ?? initial?.lead_id ?? '',
    deal_id: lockDealId ?? initial?.deal_id ?? '',
    assigned_to: initial?.assigned_to ?? '',
    priority: initial?.priority ?? ('medium' as CrmActivity['priority']),
    status: initial?.status ?? ('pending' as CrmActivity['status']),
    due_at: initial?.due_at ? initial.due_at.slice(0, 16) : '',
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.customer_id && !form.lead_id && !form.deal_id) {
          toast.error('Link to a customer, lead, or deal')
          return
        }
        onSubmit({
          type: form.type,
          title: form.title,
          description: form.description || null,
          customer_id: form.customer_id || null,
          lead_id: form.lead_id || null,
          deal_id: form.deal_id || null,
          assigned_to: form.assigned_to || null,
          priority: form.priority,
          status: form.status,
          due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
          completed_at:
            form.status === 'completed' && !initial?.completed_at
              ? new Date().toISOString()
              : initial?.completed_at ?? null,
        })
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Title</label>
        <input required className="form-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
          <ThemeSelect
            variant="form"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v as CrmActivity['type'] })}
            options={ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] }))}
            aria-label="Type"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Priority</label>
          <ThemeSelect
            variant="form"
            value={form.priority}
            onChange={(v) => setForm({ ...form, priority: v as CrmActivity['priority'] })}
            options={ACTIVITY_PRIORITIES.map((p) => ({ value: p, label: p }))}
            aria-label="Priority"
          />
        </div>
      </div>
      {initial && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
          <ThemeSelect
            variant="form"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as CrmActivity['status'] })}
            options={ACTIVITY_STATUSES.map((s) => ({ value: s, label: s }))}
            aria-label="Status"
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Customer</label>
          <select
            className="form-field"
            value={form.customer_id}
            disabled={!!lockCustomerId}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          >
            <option value="">None</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Lead</label>
          <select
            className="form-field"
            value={form.lead_id}
            disabled={!!lockLeadId}
            onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
          >
            <option value="">None</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Deal</label>
          <select
            className="form-field"
            value={form.deal_id}
            disabled={!!lockDealId}
            onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
          >
            <option value="">None</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Assigned to</label>
          <EmployeeSelect employees={employees} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Due</label>
          <input type="datetime-local" className="form-field" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
        <textarea className="form-field resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="form-submit">{loading ? 'Saving…' : submitLabel}</button>
    </form>
  )
}
