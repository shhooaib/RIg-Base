'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees, useCrmPipeline } from '@/hooks/use-crm-data'
import { CrmTimeline } from '@/components/crm/crm-timeline'
import { CrmNotesPanel } from '@/components/crm/crm-notes-panel'
import { CrmActivitiesSection } from '@/components/crm/crm-activities-section'
import { LeadForm } from '@/components/crm/lead-form'
import { DealForm } from '@/components/crm/deal-form'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { employeeName } from '@/components/crm/employee-select'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import { logCrmInteraction } from '@/lib/crm/interactions'
import type { CrmActivity, CrmInteraction, CrmNote, Customer, Deal, Lead } from '@/lib/types'
import { ArrowLeft, Loader2, Kanban, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

const PROFILE_TABS = ['Overview', 'Timeline', 'Deals', 'Activities', 'Notes'] as const
type ProfileTab = (typeof PROFILE_TABS)[number]

export default function CustomerProfilePage() {
  const params = useParams()
  const customerId = params.id as string
  const [tab, setTab] = useState<ProfileTab>('Overview')
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useCrmEmployees()
  const { data: stages = [] } = useCrmPipeline()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('workspace_id', workspace?.id)
        .single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!workspace?.id && !!customerId,
  })

  const { data: allCustomers = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('workspace_id', workspace?.id)
      return (data ?? []) as Customer[]
    },
    enabled: !!workspace?.id,
  })

  const { data: leads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').eq('workspace_id', workspace?.id)
      return (data ?? []) as Lead[]
    },
    enabled: !!workspace?.id,
  })

  const addLead = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('leads').insert({ ...lead, workspace_id: workspace?.id }).select('id').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'lead_created',
        title: `Lead created from customer: ${lead.name}`,
        leadId: data.id,
        customerId,
        createdBy: userData.user?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads })
      setShowLeadModal(false)
      toast.success('Lead created')
    },
    onError: () => toast.error('Failed to create lead'),
  })

  const addDeal = useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('deals').insert({ ...deal, workspace_id: workspace?.id }).select('id, name, customer_id').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'deal_created',
        title: `Deal created: ${data.name}`,
        customerId: data.customer_id,
        dealId: data.id,
        createdBy: userData.user?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-deals', customerId] })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
      setShowDealModal(false)
      toast.success('Deal created')
    },
    onError: () => toast.error('Failed to create deal'),
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['customer-deals', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('*, stage:crm_pipeline_stages(name)').eq('customer_id', customerId).eq('workspace_id', workspace?.id)
      return (data ?? []) as (Deal & { stage?: { name: string } | null })[]
    },
    enabled: !!workspace?.id && !!customerId,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['customer-activities', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('crm_activities').select('*').eq('customer_id', customerId).eq('workspace_id', workspace?.id).order('due_at')
      return (data ?? []) as CrmActivity[]
    },
    enabled: !!workspace?.id && !!customerId,
  })

  const { data: notes = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.notes('customer', customerId),
    queryFn: async () => {
      const { data } = await supabase.from('crm_notes').select('*').eq('customer_id', customerId).eq('workspace_id', workspace?.id).order('created_at', { ascending: false })
      return (data ?? []) as CrmNote[]
    },
    enabled: !!workspace?.id && !!customerId,
  })

  const { data: interactions = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.interactions('customer', customerId),
    queryFn: async () => {
      const { data } = await supabase.from('crm_interactions').select('*').eq('customer_id', customerId).eq('workspace_id', workspace?.id).order('created_at', { ascending: false })
      return (data ?? []) as CrmInteraction[]
    },
    enabled: !!workspace?.id && !!customerId,
  })

  const openDeals = useMemo(() => deals.filter((d) => d.status === 'open'), [deals])

  const comms = useMemo(
    () => interactions.filter((i) => ['call_logged', 'meeting_completed', 'email_logged', 'follow_up_scheduled', 'task_completed', 'note_added'].includes(i.event_type)),
    [interactions]
  )

  if (isLoading || !customer) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <Loader2 size={20} className="animate-spin text-accent mr-2" />
        Loading customer…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crm/customers" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back to customers
      </Link>

      <div className="ai-card border border-border-primary p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium">{customer.name}</h2>
            <p className="text-sm text-text-secondary mt-1">{customer.company || 'No company'} · {customer.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PermissionGate module="crm" permission="create">
              <button type="button" onClick={() => setShowLeadModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-accent/30 text-accent hover:bg-accent/10">
                <UserPlus size={14} /> Create lead
              </button>
              <button type="button" onClick={() => setShowDealModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-accent/30 text-accent hover:bg-accent/10">
                <Kanban size={14} /> Create deal
              </button>
            </PermissionGate>
            <span className={`inline-flex px-2.5 py-1 text-xs rounded-full ${
              customer.status === 'active' ? 'bg-success/10 text-success' : customer.status === 'lead' ? 'bg-accent/10 text-accent' : 'bg-bg-tertiary text-text-tertiary'
            }`}>{customer.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <Info label="Phone" value={customer.phone || '—'} />
          <Info label="Source" value={customer.source || '—'} />
          <Info label="Assigned" value={employeeName(employees, customer.assigned_to)} />
          <Info label="Total spent" value={`$${Number(customer.total_spent).toLocaleString()}`} />
          <Info label="Open deals" value={String(openDeals.length)} />
          <Info label="Last interaction" value={customer.last_interaction ? new Date(customer.last_interaction).toLocaleDateString() : '—'} />
          <Info label="Next follow-up" value={customer.next_follow_up ? new Date(customer.next_follow_up).toLocaleString() : '—'} />
          <Info label="Customer since" value={new Date(customer.created_at).toLocaleDateString()} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border-primary pb-1">
        {PROFILE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ai-card border border-border-primary p-5">
            <h3 className="text-sm font-medium mb-3">Summary</h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{customer.notes || 'No notes on file.'}</p>
          </div>
          <div className="ai-card border border-border-primary p-5">
            <h3 className="text-sm font-medium mb-3">Recent activity</h3>
            <CrmTimeline items={interactions.slice(0, 5)} />
          </div>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="ai-card border border-border-primary p-5 space-y-6">
          <CrmTimeline items={interactions} />
          {comms.length > 0 && (
            <div className="pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium mb-3">Calls, meetings, emails & follow-ups</h3>
              <CrmTimeline items={comms} />
            </div>
          )}
        </div>
      )}

      {tab === 'Deals' && (
        <div className="ai-card border border-border-primary p-5 space-y-3">
          {deals.length === 0 ? <p className="text-sm text-text-tertiary">No deals linked to this customer.</p> : deals.map((deal) => (
            <div key={deal.id} className="border border-border-primary/70 p-4 text-sm">
              <p className="font-medium">{deal.name}</p>
              <p className="text-text-tertiary mt-1">{deal.stage?.name ?? '—'} · ${Number(deal.value).toLocaleString()} · {deal.status}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Activities' && workspace?.id && (
        <CrmActivitiesSection
          activities={activities}
          scope={{ workspaceId: workspace.id, customerId }}
          employees={employees}
          customers={allCustomers.map((c) => ({ id: c.id, name: c.name }))}
          leads={leads.map((l) => ({ id: l.id, name: l.name }))}
          deals={deals.map((d) => ({ id: d.id, name: d.name }))}
          canCreate={can('crm', 'create')}
          canEdit={can('crm', 'edit')}
          queryKeysToInvalidate={[['customer-activities', customerId], CRM_QUERY_KEYS.interactions('customer', customerId)]}
        />
      )}

      {tab === 'Notes' && workspace?.id && (
        <CrmNotesPanel notes={notes} scope={{ workspaceId: workspace.id, customerId }} canCreate={can('crm', 'create')} />
      )}

      {(tab === 'Overview' || tab === 'Timeline') && (
        <p className="text-[11px] text-text-muted leading-relaxed pt-2 border-t border-border-primary/60">
          Communications and logged emails appear in the activity timeline when activities are completed from the Activities section.
        </p>
      )}

      <Modal open={showLeadModal} onClose={() => setShowLeadModal(false)} title="Create lead from customer">
        <LeadForm
          customers={allCustomers}
          employees={employees}
          initialFromCustomer={customer}
          onSubmit={(d) => addLead.mutate(d)}
          loading={addLead.isPending}
          submitLabel="Create lead"
        />
      </Modal>

      <Modal open={showDealModal} onClose={() => setShowDealModal(false)} title="Create deal from customer">
        <DealForm
          customers={allCustomers}
          leads={leads}
          employees={employees}
          stages={stages}
          initialFromCustomer={customer}
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
