'use client'

import { LEAD_PIPELINE_STATUSES, LEAD_STATUS_LABELS } from '@/lib/crm/constants'
import type { Lead } from '@/lib/types'

export function LeadLifecycleBoard({
  leads,
  onLeadClick,
  onStatusChange,
  canEdit,
}: {
  leads: Lead[]
  onLeadClick?: (lead: Lead) => void
  onStatusChange?: (lead: Lead, status: Lead['status']) => void
  canEdit: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-2">
      {LEAD_PIPELINE_STATUSES.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status && !l.converted_customer_id)
        const totalValue = columnLeads.reduce((s, l) => s + Number(l.estimated_value), 0)
        return (
          <div key={status} className="ai-card border border-border-primary min-w-[220px]">
            <div className="px-4 py-3 border-b border-border-primary">
              <p className="text-sm font-medium">{LEAD_STATUS_LABELS[status]}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {columnLeads.length} leads · ${totalValue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 space-y-2 min-h-[120px]">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="border border-border-primary/80 bg-bg-secondary/40 p-3 text-sm cursor-pointer hover:border-accent/40 transition-colors"
                  onClick={() => onLeadClick?.(lead)}
                  onKeyDown={(e) => e.key === 'Enter' && onLeadClick?.(lead)}
                  role={onLeadClick ? 'button' : undefined}
                  tabIndex={onLeadClick ? 0 : undefined}
                >
                  <p className="font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-text-tertiary mt-1">{lead.company || lead.email || '—'}</p>
                  <p className="text-accent text-xs mt-1">Score {lead.lead_score}</p>
                  {canEdit && onStatusChange && (
                    <select
                      className="mt-2 w-full text-xs form-field py-1"
                      value={lead.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStatusChange(lead, e.target.value as Lead['status'])}
                      aria-label={`Move ${lead.name}`}
                    >
                      {LEAD_PIPELINE_STATUSES.map((s) => (
                        <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                      ))}
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
