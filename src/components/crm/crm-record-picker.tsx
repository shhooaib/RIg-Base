'use client'

import { Building2, ContactRound, UserCircle } from 'lucide-react'
import { ICON_STROKE_NAV } from '@/lib/icons/lucide-nav'
import type { Customer, Lead } from '@/lib/types'
import { customerPickerLabel, leadPickerLabel } from '@/lib/crm/source-mappers'

type PickerMode = 'blank' | 'customer' | 'lead'

type CrmRecordPickerProps = {
  mode: PickerMode
  onModeChange: (mode: PickerMode) => void
  customers?: Customer[]
  leads?: Lead[]
  selectedCustomerId?: string
  selectedLeadId?: string
  onCustomerSelect: (customer: Customer | null) => void
  onLeadSelect: (lead: Lead | null) => void
  allowLead?: boolean
  title?: string
  hint?: string
}

export function CrmRecordPicker({
  mode,
  onModeChange,
  customers = [],
  leads = [],
  selectedCustomerId = '',
  selectedLeadId = '',
  onCustomerSelect,
  onLeadSelect,
  allowLead = false,
  title = 'Start from an existing record',
  hint = 'Pick a customer or lead to pre-fill details, then add what is missing.',
}: CrmRecordPickerProps) {
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null
  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null

  return (
    <div className="rounded-lg border border-accent/25 bg-accent/[0.04] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md border border-border-primary bg-bg-tertiary flex items-center justify-center shrink-0">
          <ContactRound size={16} strokeWidth={ICON_STROKE_NAV} className="text-text-tertiary" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{hint}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModeChip active={mode === 'blank'} onClick={() => onModeChange('blank')} label="Start blank" />
        <ModeChip
          active={mode === 'customer'}
          onClick={() => onModeChange('customer')}
          label="From customer"
          icon={<UserCircle size={14} />}
          disabled={customers.length === 0}
        />
        {allowLead && (
          <ModeChip
            active={mode === 'lead'}
            onClick={() => onModeChange('lead')}
            label="From lead"
            icon={<Building2 size={14} />}
            disabled={leads.length === 0}
          />
        )}
      </div>

      {mode === 'customer' && (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary mb-1.5">
            Select customer
          </label>
          <select
            className="form-field"
            value={selectedCustomerId}
            onChange={(e) => {
              const customer = customers.find((c) => c.id === e.target.value) ?? null
              onCustomerSelect(customer)
            }}
          >
            <option value="">Choose a customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerPickerLabel(customer)}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'lead' && allowLead && (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary mb-1.5">
            Select lead
          </label>
          <select
            className="form-field"
            value={selectedLeadId}
            onChange={(e) => {
              const lead = leads.find((l) => l.id === e.target.value) ?? null
              onLeadSelect(lead)
            }}
          >
            <option value="">Choose a lead…</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {leadPickerLabel(lead)}
              </option>
            ))}
          </select>
        </div>
      )}

      {(selectedCustomer || selectedLead) && mode !== 'blank' && (
        <div className="rounded-md border border-border-primary/80 bg-bg-primary/60 px-3 py-2.5 text-xs text-text-secondary">
          {selectedCustomer && mode === 'customer' && (
            <>
              <p className="font-medium text-text-primary">{selectedCustomer.name}</p>
              <p className="mt-1">{selectedCustomer.email}{selectedCustomer.company ? ` · ${selectedCustomer.company}` : ''}</p>
              <p className="mt-1 text-text-tertiary">Contact details will be copied — add lead score, status, and follow-up below.</p>
            </>
          )}
          {selectedLead && mode === 'lead' && (
            <>
              <p className="font-medium text-text-primary">{selectedLead.name}</p>
              <p className="mt-1">{selectedLead.company || 'No company'} · Est. ${Number(selectedLead.estimated_value).toLocaleString()}</p>
              <p className="mt-1 text-text-tertiary">Deal details will be pre-filled — set stage, value, and close date below.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ModeChip({
  active,
  onClick,
  label,
  icon,
  disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-border-primary bg-bg-primary/50 text-text-secondary hover:text-text-primary hover:border-border-secondary disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
