'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { ThemeSelect } from '@/components/ui/theme-select'
import type { CrmPipelineStage, Lead } from '@/lib/types'

export function ConvertLeadModal({
  lead,
  stages,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  lead: Lead | null
  stages: CrmPipelineStage[]
  open: boolean
  onClose: () => void
  onConfirm: (options: { createDeal: boolean; stageId?: string; dealName?: string; dealValue?: number }) => void
  loading: boolean
}) {
  const [createDeal, setCreateDeal] = useState(true)
  const defaultStage = stages.find((s) => s.name === 'Qualified') ?? stages.find((s) => !s.is_closed_won && !s.is_closed_lost) ?? stages[0]
  const [stageId, setStageId] = useState(defaultStage?.id ?? '')
  const [dealName, setDealName] = useState('')
  const [dealValue, setDealValue] = useState('')

  if (!lead) return null

  const resolvedDealName = dealName.trim() || `${lead.company ?? lead.name} — Opportunity`
  const resolvedValue = Number(dealValue) || lead.estimated_value || 0

  return (
    <Modal open={open} onClose={onClose} title="Convert lead to customer">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Convert <strong className="text-text-primary">{lead.name}</strong> into a customer. Activities, notes, and deals linked to this lead will be retained on the customer record.
        </p>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} className="rounded border-border-primary" />
          Also create an open deal in the pipeline
        </label>

        {createDeal && stages.length > 0 && (
          <div className="space-y-3 pl-6 border-l-2 border-accent/30">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Deal name</label>
              <input className="form-field" value={dealName} placeholder={resolvedDealName} onChange={(e) => setDealName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Pipeline stage</label>
                <ThemeSelect
                  variant="form"
                  value={stageId}
                  onChange={setStageId}
                  options={stages.filter((s) => !s.is_closed_won && !s.is_closed_lost).map((s) => ({ value: s.id, label: s.name }))}
                  aria-label="Stage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Deal value</label>
                <input type="number" min="0" step="0.01" className="form-field" value={dealValue} placeholder={String(lead.estimated_value || 0)} onChange={(e) => setDealValue(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (createDeal && !stageId)}
            onClick={() => onConfirm({ createDeal, stageId: createDeal ? stageId : undefined, dealName: resolvedDealName, dealValue: resolvedValue })}
            className="flex-1 btn-primary"
          >
            {loading ? 'Converting…' : 'Convert lead'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
