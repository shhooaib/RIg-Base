'use client'

import { useEffect, useState } from 'react'
import { EmployeeSelect } from '@/components/crm/employee-select'
import { CrmRecordPicker } from '@/components/crm/crm-record-picker'
import { ThemeSelect } from '@/components/ui/theme-select'
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from '@/lib/crm/constants'
import {
  customerToLeadDraft,
  emptyLeadDraft,
  leadToLeadDraft,
  type LeadFormDraft,
} from '@/lib/crm/source-mappers'
import type { Customer, Lead } from '@/lib/types'

export function LeadForm({
  initial,
  initialFromCustomer,
  customers = [],
  employees,
  onSubmit,
  loading,
  submitLabel = 'Add Lead',
}: {
  initial?: Lead
  initialFromCustomer?: Customer
  customers?: Customer[]
  employees: import('@/lib/types').Employee[]
  onSubmit: (data: Partial<Lead>) => void
  loading: boolean
  submitLabel?: string
}) {
  const [mode, setMode] = useState<'blank' | 'customer' | 'lead'>(initialFromCustomer ? 'customer' : 'blank')
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialFromCustomer?.id ?? '')
  const [form, setForm] = useState<LeadFormDraft>(() =>
    initial
      ? leadToLeadDraft(initial)
      : initialFromCustomer
        ? customerToLeadDraft(initialFromCustomer)
        : emptyLeadDraft()
  )

  useEffect(() => {
    if (!initial) return
    setForm(leadToLeadDraft(initial))
    setMode('blank')
  }, [initial])

  useEffect(() => {
    if (!initialFromCustomer || initial) return
    setMode('customer')
    setSelectedCustomerId(initialFromCustomer.id)
    setForm(customerToLeadDraft(initialFromCustomer))
  }, [initialFromCustomer, initial])

  function handleModeChange(next: 'blank' | 'customer' | 'lead') {
    setMode(next)
    if (next === 'blank') {
      setSelectedCustomerId('')
      if (!initial) setForm(emptyLeadDraft())
    }
  }

  function handleCustomerSelect(customer: Customer | null) {
    setSelectedCustomerId(customer?.id ?? '')
    if (customer) setForm(customerToLeadDraft(customer))
  }

  const showPicker = !initial

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          source: form.source || null,
          status: form.status,
          lead_score: Number(form.lead_score) || 0,
          estimated_value: Number(form.estimated_value) || 0,
          assigned_to: form.assigned_to || null,
          notes: form.notes || null,
          next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        })
      }}
      className="space-y-4"
    >
      {showPicker && (
        <CrmRecordPicker
          mode={mode}
          onModeChange={handleModeChange}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onCustomerSelect={handleCustomerSelect}
          onLeadSelect={() => {}}
          allowLead={false}
          title="Import from a customer"
          hint="Select an existing customer to copy their contact details into this lead."
        />
      )}

      {mode !== 'blank' && !initial && (
        <div className="h-px bg-gradient-to-r from-transparent via-border-primary to-transparent" />
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
        <input required className="form-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input type="email" className="form-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone</label>
          <input className="form-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Company</label>
          <input className="form-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Source</label>
          <input className="form-field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
          <ThemeSelect
            variant="form"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as Lead['status'] })}
            options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
            aria-label="Status"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Assigned to</label>
          <EmployeeSelect employees={employees} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Lead score</label>
          <input type="number" min="0" max="100" className="form-field" value={form.lead_score} onChange={(e) => setForm({ ...form, lead_score: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Est. value</label>
          <input type="number" min="0" step="0.01" className="form-field" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Next follow-up</label>
        <input type="datetime-local" className="form-field" value={form.next_follow_up_at} onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
        <textarea className="form-field resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="form-submit">
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
