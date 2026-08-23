'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees, useCrmPipeline } from '@/hooks/use-crm-data'
import { CrmTimeline } from '@/components/crm/crm-timeline'
import { CrmNotesPanel } from '@/components/crm/crm-notes-panel'
import { CrmActivitiesSection } from '@/components/crm/crm-activities-section'
import { ConvertLeadModal } from '@/components/crm/convert-lead-modal'
import { LeadForm } from '@/components/crm/lead-form'
import { DealForm } from '@/components/crm/deal-form'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { employeeName } from '@/components/crm/employee-select'
import { CRM_QUERY_KEYS, LEAD_STATUS_LABELS } from '@/lib/crm/constants'
import { convertLead } from '@/lib/crm/convert-lead'
import { logCrmInteraction } from '@/lib/crm/interactions'
import type { CrmActivity, CrmInteraction, CrmNote, Customer, Deal, Lead } from '@/lib/types'
import { ArrowLeft, ExternalLink, Kanban, Loader2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

const PROFILE_TABS = ['Overview', 'Timeline', 'Activities', 'Deals', 'Notes'] as const
type ProfileTab = (typeof PROFILE_TABS)[number]

export default function LeadProfilePage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  const [tab, setTab] = useState<ProfileTab>('Overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useCrmEmployees()
  const { data: stages = [] } = useCrmPipeline()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).eq('workspace_id', workspace?.id).single()
      if (error) throw error
      return data as Lead
    },
    enabled: !!workspace?.id && !!leadId,
  })

  const { data: customers = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('workspace_id', workspace?.id)
      return (data ?? []) as Pick<Customer, 'id' | 'name'>[]
    },
    enabled: !!workspace?.id,
  })

  const { data: allLeads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('id, name').eq('workspace_id', workspace?.id)
      return (data ?? []) as Pick<Lead, 'id' | 'name'>[]
    },
    enabled: !!workspace?.id,
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['lead-deals', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, stage:crm_pipeline_stages(name)')
        .eq('lead_id', leadId)
        .eq('workspace_id', workspace?.id)
      return (data ?? []) as (Deal & { stage?: { name: string } | null })[]
    },
    enabled: !!workspace?.id && !!leadId,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data } = await supabase.from('crm_activities').select('*').eq('lead_id', leadId).eq('workspace_id', workspace?.id).order('due_at')
      return (data ?? []) as CrmActivity[]
    },
    enabled: !!workspace?.id && !!leadId,
  })

  const { data: notes = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.notes('lead', leadId),
    queryFn: async () => {
      const { data } = await supabase.from('crm_notes').select('*').eq('lead_id', leadId).eq('workspace_id', workspace?.id).order('created_at', { ascending: false })
      return (data ?? []) as CrmNote[]
    },
    enabled: !!workspace?.id && !!leadId,
  })

  const { data: interactions = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.interactions('lead', leadId),
    queryFn: async () => {
      const { data } = await supabase.from('crm_interactions').select('*').eq('lead_id', leadId).eq('workspace_id', workspace?.id).order('created_at', { ascending: false })
      return (data ?? []) as CrmInteraction[]
    },
    enabled: !!workspace?.id && !!leadId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
  }

  const updateLead = useMutation({
    mutationFn: async (payload: Partial<Lead>) => {
      const { error } = await supabase.from('leads').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', leadId).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowEdit(false); toast.success('Lead updated') },
    onError: () => toast.error('Failed to update lead'),
  })

  const convert = useMutation({
    mutationFn: async (options: { createDeal: boolean; stageId?: string; dealName?: string; dealValue?: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      return convertLead(supabase, {
        lead: lead!,
        workspaceId: workspace!.id,
        userId: userData.user!.id,
        createDeal: options.createDeal,
        stageId: options.stageId,
        dealName: options.dealName,
        dealValue: options.dealValue,
      })
    },
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      invalidate()
      setShowConvert(false)
      toast.success('Lead converted')
      router.push(`/dashboard/crm/customers/${result.customerId}`)
    },
    onError: () => toast.error('Failed to convert lead'),
  })

  const addDeal = useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('deals').insert({ ...deal, workspace_id: workspace?.id, lead_id: leadId }).select('id, name').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'deal_created',
        title: `Deal created: ${data.name}`,
        leadId,
        dealId: data.id,
        createdBy: userData.user?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-deals', leadId] })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
      setShowDealModal(false)
      toast.success('Deal created')
    },
    onError: () => toast.error('Failed to create deal'),
  })

  const comms = useMemo(
    () => interactions.filter((i) => ['call_logged', 'meeting_completed', 'email_logged', 'follow_up_scheduled', 'task_completed'].includes(i.event_type)),
    [interactions]
  )

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <Loader2 size={20} className="animate-spin text-accent mr-2" />
        Loading lead…
      </div>
    )
  }

  const converted = !!lead.converted_customer_id

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back to leads
      </Link>

      <div className="ai-card border border-border-primary p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium">{lead.name}</h2>
            <p className="text-sm text-text-secondary mt-1">{lead.company || 'No company'} · {lead.email || 'No email'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex px-2.5 py-1 text-xs rounded-full bg-accent/10 text-accent">{LEAD_STATUS_LABELS[lead.status]}</span>
            {converted && lead.converted_customer_id && (
              <Link href={`/dashboard/crm/customers/${lead.converted_customer_id}`} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <ExternalLink size={12} /> View customer
              </Link>
            )}
            {!converted && can('crm', 'edit') && (
              <>
                <button type="button" onClick={() => setShowEdit(true)} className="px-3 py-1.5 text-xs border border-border-primary rounded-md hover:border-accent/40">Edit</button>
                <button type="button" onClick={() => setShowConvert(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/10">
                  <UserCheck size={14} /> Convert
                </button>
                <button type="button" onClick={() => setShowDealModal(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/10">
                  <Kanban size={14} /> Add deal
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <Info label="Phone" value={lead.phone || '—'} />
          <Info label="Source" value={lead.source || '—'} />
          <Info label="Owner" value={employeeName(employees, lead.assigned_to)} />
          <Info label="Lead score" value={String(lead.lead_score)} />
          <Info label="Est. value" value={`$${Number(lead.estimated_value).toLocaleString()}`} />
          <Info label="Last contacted" value={lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : '—'} />
          <Info label="Next follow-up" value={lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : '—'} />
          <Info label="Created" value={new Date(lead.created_at).toLocaleDateString()} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border-primary pb-1">
        {PROFILE_TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ai-card border border-border-primary p-5">
            <h3 className="text-sm font-medium mb-3">Summary</h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{lead.notes || 'No notes on file.'}</p>
          </div>
          <div className="ai-card border border-border-primary p-5">
            <h3 className="text-sm font-medium mb-3">Recent activity</h3>
            <CrmTimeline items={interactions.slice(0, 6)} />
          </div>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="ai-card border border-border-primary p-5">
          <CrmTimeline items={interactions} />
          {comms.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium mb-3">Communications & follow-ups</h3>
              <CrmTimeline items={comms} />
            </div>
          )}
        </div>
      )}

      {tab === 'Activities' && workspace?.id && (
        <CrmActivitiesSection
          activities={activities}
          scope={{ workspaceId: workspace.id, leadId }}
          employees={employees}
          customers={customers}
          leads={allLeads}
          deals={deals.map((d) => ({ id: d.id, name: d.name }))}
          canCreate={can('crm', 'create') && !converted}
          canEdit={can('crm', 'edit') && !converted}
          queryKeysToInvalidate={[['lead-activities', leadId], CRM_QUERY_KEYS.interactions('lead', leadId)]}
        />
      )}

      {tab === 'Deals' && (
        <div className="ai-card border border-border-primary p-5 space-y-3">
          {deals.length === 0 ? <p className="text-sm text-text-tertiary">No deals linked to this lead.</p> : deals.map((deal) => (
            <div key={deal.id} className="border border-border-primary/70 p-4 text-sm">
              <p className="font-medium">{deal.name}</p>
              <p className="text-text-tertiary mt-1">{deal.stage?.name ?? '—'} · ${Number(deal.value).toLocaleString()} · {deal.status}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Notes' && workspace?.id && (
        <CrmNotesPanel notes={notes} scope={{ workspaceId: workspace.id, leadId }} canCreate={can('crm', 'create')} />
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit lead">
        <LeadForm initial={lead} employees={employees} onSubmit={(d) => updateLead.mutate(d)} loading={updateLead.isPending} submitLabel="Save changes" />
      </Modal>

      <ConvertLeadModal lead={lead} stages={stages} open={showConvert} onClose={() => setShowConvert(false)} onConfirm={(opts) => convert.mutate(opts)} loading={convert.isPending} />

      <Modal open={showDealModal} onClose={() => setShowDealModal(false)} title="Create deal from lead">
        <DealForm
          customers={customers as Customer[]}
          leads={[lead]}
          employees={employees}
          stages={stages}
          initialFromLead={lead}
          onSubmit={(d) => addDeal.mutate(d)}
          loading={addDeal.isPending}
          submitLabel="Create deal"
        />
      </Modal>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">{label}</p>
      <p className="text-text-primary">{value}</p>
    </div>
  )
}
