'use client'

import { useEffect, useState } from 'react'
import { EmployeeSelect } from '@/components/crm/employee-select'
import { CrmRecordPicker } from '@/components/crm/crm-record-picker'
import {
  customerToDealDraft,
  emptyDealDraft,
  leadToDealDraft,
  type DealFormDraft,
} from '@/lib/crm/source-mappers'
import type { CrmPipelineStage, Customer, Deal, Lead } from '@/lib/types'

export function DealForm({
  customers,
  leads = [],
  employees,
  stages,
  initialFromCustomer,
  initialFromLead,
  onSubmit,
  loading,
  submitLabel = 'Add Deal',
}: {
  customers: Customer[]
  leads?: Lead[]
  employees: import('@/lib/types').Employee[]
  stages: CrmPipelineStage[]
  initialFromCustomer?: Customer
  initialFromLead?: Lead
  onSubmit: (data: Partial<Deal>) => void
  loading: boolean
  submitLabel?: string
}) {
  const defaultStage = stages.find((s) => s.name === 'New') ?? stages[0]
  const defaultStageId = defaultStage?.id ?? ''
  const defaultProbability = defaultStage?.probability_default ?? 10

  const [mode, setMode] = useState<'blank' | 'customer' | 'lead'>(
    initialFromCustomer ? 'customer' : initialFromLead ? 'lead' : 'blank'
  )
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialFromCustomer?.id ?? '')
  const [selectedLeadId, setSelectedLeadId] = useState(initialFromLead?.id ?? '')
  const [form, setForm] = useState<DealFormDraft>(() => {
    if (initialFromCustomer) return customerToDealDraft(initialFromCustomer, defaultStageId, defaultProbability)
    if (initialFromLead) return leadToDealDraft(initialFromLead, defaultStageId, defaultProbability)
    return emptyDealDraft(defaultStageId, defaultProbability)
  })

  useEffect(() => {
    if (!initialFromCustomer) return
    setMode('customer')
    setSelectedCustomerId(initialFromCustomer.id)
    setForm(customerToDealDraft(initialFromCustomer, defaultStageId, defaultProbability))
  }, [initialFromCustomer, defaultStageId, defaultProbability])

  useEffect(() => {
    if (!initialFromLead) return
    setMode('lead')
    setSelectedLeadId(initialFromLead.id)
    setForm(leadToDealDraft(initialFromLead, defaultStageId, defaultProbability))
  }, [initialFromLead, defaultStageId, defaultProbability])

  function handleModeChange(next: 'blank' | 'customer' | 'lead') {
    setMode(next)
    if (next === 'blank') {
      setSelectedCustomerId('')
      setSelectedLeadId('')
      setForm(emptyDealDraft(defaultStageId, defaultProbability))
    }
  }

  function handleCustomerSelect(customer: Customer | null) {
    setSelectedCustomerId(customer?.id ?? '')
    setSelectedLeadId('')
    if (customer) setForm(customerToDealDraft(customer, defaultStageId, defaultProbability))
  }

  function handleLeadSelect(lead: Lead | null) {
    setSelectedLeadId(lead?.id ?? '')
    if (lead) {
      setSelectedCustomerId(lead.converted_customer_id ?? '')
      setForm(leadToDealDraft(lead, defaultStageId, defaultProbability))
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: form.name,
          customer_id: form.customer_id || null,
          lead_id: form.lead_id || null,
          value: Number(form.value) || 0,
          stage_id: form.stage_id,
          probability: Number(form.probability) || 0,
          expected_close_date: form.expected_close_date || null,
          assigned_to: form.assigned_to || null,
          notes: form.notes || null,
          status: 'open',
        })
      }}
      className="space-y-4"
    >
      <CrmRecordPicker
        mode={mode}
        onModeChange={handleModeChange}
        customers={customers}
        leads={leads.filter((l) => !['won', 'lost'].includes(l.status) || l.converted_customer_id)}
        selectedCustomerId={selectedCustomerId}
        selectedLeadId={selectedLeadId}
        onCustomerSelect={handleCustomerSelect}
        onLeadSelect={handleLeadSelect}
        allowLead
        title="Link to customer or lead"
        hint="Pick an existing record to pre-fill the deal, then adjust value, stage, and close date."
      />

      {mode !== 'blank' && (
        <div className="h-px bg-gradient-to-r from-transparent via-border-primary to-transparent" />
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Deal name</label>
        <input required className="form-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Linked customer</label>
          <select
            className="form-field"
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          >
            <option value="">None</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Linked lead</label>
          <select
            className="form-field"
            value={form.lead_id}
            onChange={(e) => {
              const lead = leads.find((l) => l.id === e.target.value) ?? null
              setSelectedLeadId(lead?.id ?? '')
              setForm((prev) => ({
                ...prev,
                lead_id: lead?.id ?? '',
                customer_id: lead?.converted_customer_id ?? prev.customer_id,
              }))
            }}
          >
            <option value="">None</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Value</label>
          <input type="number" min="0" step="0.01" className="form-field" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Stage</label>
          <select
            className="form-field"
            value={form.stage_id}
            onChange={(e) => {
              const stage = stages.find((s) => s.id === e.target.value)
              setForm({
                ...form,
                stage_id: e.target.value,
                probability: String(stage?.probability_default ?? form.probability),
              })
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Probability %</label>
          <input type="number" min="0" max="100" className="form-field" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Expected close</label>
          <input type="date" className="form-field" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Assigned to</label>
        <EmployeeSelect employees={employees} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
        <textarea className="form-field resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <button type="submit" disabled={loading || !form.stage_id} className="form-submit">
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
